import { useEffect, useMemo, useRef, useState } from "react";
import { MissionScene, WorkshopScene } from "./scene";
import {
  ENGINES, TANKS, ANTENNAS, INSTRUMENTS, VEHICLES, MISSIONS, PANEL, BATTERY, type Mission,
} from "./data";
import {
  computeStats, preflight, simulate, defaultDesign,
  type Check, type Design, type Report, type Stats,
} from "./sim";
import { fetchApod, fetchNeo, fetchNasaImage, useFetch } from "./nasa";

type Screen = "menu" | "mission" | "workshop" | "planner" | "flight" | "report";

const STAGES: { id: Screen; label: string }[] = [
  { id: "menu", label: "Menu" },
  { id: "mission", label: "Mission" },
  { id: "workshop", label: "Workshop" },
  { id: "planner", label: "Planner" },
  { id: "flight", label: "Control" },
  { id: "report", label: "Results" },
];

function feasibility(checks: Check[]): { label: string; level: Check["level"] } {
  if (checks.some((c) => c.level === "block")) return { label: "Cannot launch", level: "block" };
  if (checks.some((c) => c.level === "warn")) return { label: "Risky", level: "warn" };
  return { label: "Ready to launch", level: "ok" };
}

function Meter({ label, value, max, unit, bad }: { label: string; value: number; max: number; unit: string; bad: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <b className={bad ? "bad" : "good"}>{Math.round(value)} / {Math.round(max)} {unit}</b>
      </div>
      <div className="bar"><i className={bad ? "bg-bad" : "bg-good"} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Hud({ stats, mission }: { stats: Stats; mission: Mission }) {
  return (
    <div className="hud">
      <Meter label="Budget (incl. launch)" value={stats.totalCost} max={mission.budget} unit="cr" bad={stats.totalCost > mission.budget} />
      <Meter label="Mass vs launcher" value={stats.wetMass} max={stats.vehicle.capacity} unit="kg" bad={stats.wetMass > stats.vehicle.capacity} />
      <Meter label="Delta-v" value={stats.deltaV} max={mission.deltaV} unit="m/s" bad={stats.deltaV < mission.deltaV} />
      <Meter label="Power use vs output" value={stats.powerDraw} max={Math.max(1, stats.powerDest)} unit="W" bad={stats.powerDraw > stats.powerDest} />
    </div>
  );
}

function Readout({ stats, mission, checks }: { stats: Stats; mission: Mission; checks: Check[] }) {
  const f = feasibility(checks);
  const left = mission.budget - stats.totalCost;
  const rows: { k: string; v: string; bad?: boolean }[] = [
    { k: "Total mass", v: `${Math.round(stats.wetMass)} kg`, bad: stats.wetMass > stats.vehicle.capacity },
    { k: "Dry mass", v: `${Math.round(stats.dryMass)} kg` },
    { k: "Fuel capacity", v: `${stats.fuelMass} kg` },
    { k: "Component cost", v: `${stats.craftCost} cr` },
    { k: "Remaining budget", v: `${left} cr`, bad: left < 0 },
    { k: "Power at destination", v: `${Math.round(stats.powerDest)} W` },
    { k: "Power consumption", v: `${stats.powerDraw} W`, bad: stats.powerDraw > stats.powerDest },
    { k: "Propulsion (delta-v)", v: `${Math.round(stats.deltaV)} m/s`, bad: stats.deltaV < mission.deltaV },
    { k: "Science capability", v: `${stats.science} pts` },
    { k: "Communication", v: stats.antenna.comm >= 2 ? "Strong" : "Basic", bad: stats.antenna.comm < mission.minComm },
  ];
  return (
    <div className="readout">
      {rows.map((r) => (
        <div key={r.k} className="rrow">
          <span>{r.k}</span>
          <b className={r.bad ? "bad" : ""}>{r.v}</b>
        </div>
      ))}
      <div className={"feas " + f.level}>Mission feasibility: <b>{f.label}</b></div>
    </div>
  );
}

function Stepper({ label, detail, value, max, onChange }: {
  label: string; detail: string; value: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <div className="row">
      <div><b>{label}</b><small>{detail}</small></div>
      <div className="step">
        <button onClick={() => onChange(value - 1)} disabled={value <= 0}>−</button>
        <span>{value}</span>
        <button onClick={() => onChange(value + 1)} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

function NasaCard() {
  const apod = useFetch(fetchApod, "apod");
  const neo = useFetch(fetchNeo, "neo");
  if (!apod && !neo) return null;
  return (
    <div className="nasa panel">
      <small className="eyebrow">Live from NASA</small>
      {neo && <p><b>{neo.count}</b> near-Earth objects pass by today ({neo.hazardous} flagged potentially hazardous).</p>}
      {apod && apod.media_type === "image" && <img src={apod.url} alt={apod.title} />}
      {apod && <p className="apod">Astronomy Picture of the Day: {apod.title}</p>}
    </div>
  );
}

function MissionCard({ m, onPick }: { m: Mission; onPick: () => void }) {
  const img = useFetch((s) => fetchNasaImage(m.nasaQuery, s), m.id);
  return (
    <button className="mcard panel" onClick={onPick}>
      <div className="mimg" style={img ? { backgroundImage: `url(${img.url})` } : undefined} />
      <small className="eyebrow">{m.tagline}</small>
      <h3>{m.name}</h3>
      <p>{m.brief}</p>
      <p className="meta">Budget {m.budget} cr · Needs {m.deltaV} m/s · Travel {m.travelTime}</p>
      {img && <small className="credit">Image: NASA — {img.title}</small>}
    </button>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mission, setMission] = useState<Mission>(MISSIONS[0]);
  const [picked, setPicked] = useState(false);
  const [design, setDesign] = useState<Design>(defaultDesign());
  const [report, setReport] = useState<Report | null>(null);
  const [shown, setShown] = useState(0);
  const [pct, setPct] = useState(0);
  const progressRef = useRef(0);

  const stats = useMemo(() => computeStats(design, mission), [design, mission]);
  const checks = useMemo(() => preflight(stats, design, mission), [stats, design, mission]);
  const blocked = checks.some((c) => c.level === "block");

  const patch = (p: Partial<Design>) => setDesign((d) => ({ ...d, ...p }));
  const setTank = (id: string, n: number) => setDesign((d) => ({ ...d, tanks: { ...d.tanks, [id]: n } }));
  const toggleInstrument = (id: string) =>
    setDesign((d) => ({
      ...d,
      instruments: d.instruments.includes(id) ? d.instruments.filter((x) => x !== id) : [...d.instruments, id],
    }));

  const chooseMission = (m: Mission) => {
    setMission(m);
    setDesign(defaultDesign());
    setReport(null);
    setPicked(true);
    setScreen("workshop");
  };

  const launch = () => {
    const r = simulate(design, mission, Date.now() % 2147483647);
    progressRef.current = 0;
    setReport(r); setShown(0); setPct(0);
    setScreen("flight");
  };

  const canGo = (id: Screen) => {
    if (id === "menu" || id === "mission") return true;
    if (id === "workshop" || id === "planner") return picked;
    if (id === "report") return report !== null;
    return false; // Control is reached by launching
  };

  // Flight animation loop
  useEffect(() => {
    if (screen !== "flight" || !report) return;
    const DURATION = 18000;
    const limit = report.failAt ?? 1;
    const t0 = performance.now();
    let raf = 0;
    let done: ReturnType<typeof setTimeout> | undefined;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / DURATION, limit + 0.04);
      progressRef.current = Math.min(p, 1);
      const visible = Math.min(p, limit);
      setShown(report.log.filter((e) => e.at <= visible + 1e-9).length);
      setPct(Math.round(visible * 100));
      if (p >= limit + 0.04) { done = setTimeout(() => setScreen("report"), 1800); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (done) clearTimeout(done); };
  }, [screen, report]);

  const sceneMode = screen === "flight" ? mission.destination : "menu";

  return (
    <div className="app">
      {screen !== "workshop" && (
        <div className="bg">
          <MissionScene mode={sceneMode} progressRef={progressRef} failAt={screen === "flight" ? report?.failAt ?? null : null} design={design} />
        </div>
      )}

      {screen !== "menu" && (
        <nav className="nav">
          <span className="brand">ORBIT COMMAND</span>
          <div className="stages">
            {STAGES.map((s, i) => (
              <button
                key={s.id}
                className={"stage" + (screen === s.id ? " on" : "")}
                disabled={screen !== s.id && !canGo(s.id)}
                onClick={() => setScreen(s.id)}
              >
                <i>{i + 1}</i>{s.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* 01 MAIN MENU */}
      {screen === "menu" && (
        <>
          <div className="ui center">
            <p className="eyebrow">Educational mission simulator</p>
            <h1>ORBIT COMMAND</h1>
            <p className="sub">Design it. Build it. Launch it. Complete the mission.</p>
            <button className="primary" onClick={() => setScreen("mission")}>Start Mission</button>
          </div>
          <NasaCard />
        </>
      )}

      {/* 02 MISSION SELECTION */}
      {screen === "mission" && (
        <div className="ui center">
          <h2>Choose your mission</h2>
          <div className="mgrid">
            {MISSIONS.map((m) => (
              <MissionCard key={m.id} m={m} onPick={() => chooseMission(m)} />
            ))}
          </div>
          <button className="ghost" onClick={() => setScreen("menu")}>Back to menu</button>
        </div>
      )}

      {/* 03 SPACECRAFT WORKSHOP */}
      {screen === "workshop" && (
        <div className="ui workshop">
          <aside className="panel parts">
            <h2>Spacecraft workshop</h2>
            <p className="meta">Mission: {mission.name}</p>

            <h3>Engine</h3>
            {ENGINES.map((e) => (
              <button key={e.id} className={"card" + (design.engineId === e.id ? " sel" : "")} onClick={() => patch({ engineId: e.id })}>
                <b>{e.name}</b>
                <span>{e.mass} kg · {e.cost} cr · Isp {e.isp} s{e.power ? ` · needs ${e.power} W` : ""}</span>
                <small>{e.blurb}</small>
              </button>
            ))}

            <h3>Fuel tanks</h3>
            {TANKS.map((t) => (
              <Stepper key={t.id} label={t.name} detail={`${t.mass} kg dry · ${t.fuel} kg fuel · ${t.cost} cr`}
                value={design.tanks[t.id] ?? 0} max={3} onChange={(n) => setTank(t.id, n)} />
            ))}

            <h3>Power</h3>
            <Stepper label="Solar panels" detail={`${PANEL.mass} kg · ${PANEL.cost} cr · ${PANEL.watts} W at Earth`}
              value={design.panels} max={8} onChange={(n) => patch({ panels: n })} />
            <Stepper label="Battery" detail={`${BATTERY.mass} kg · ${BATTERY.cost} cr · backup in solar flares`}
              value={design.batteries} max={4} onChange={(n) => patch({ batteries: n })} />

            <h3>Antenna</h3>
            {ANTENNAS.map((a) => (
              <button key={a.id} className={"card" + (design.antennaId === a.id ? " sel" : "")} onClick={() => patch({ antennaId: a.id })}>
                <b>{a.name}</b><span>{a.mass} kg · {a.cost} cr · {a.power} W</span>
              </button>
            ))}

            <h3>Scientific instruments</h3>
            {INSTRUMENTS.map((i) => (
              <button key={i.id} className={"card" + (design.instruments.includes(i.id) ? " sel" : "")} onClick={() => toggleInstrument(i.id)}>
                <b>{i.name}</b><span>{i.mass} kg · {i.cost} cr · {i.power} W · +{i.science} science</span>
              </button>
            ))}
            <p className="meta">Illustrative game values, not real spacecraft specifications.</p>
          </aside>

          <section className="view">
            <WorkshopScene design={design} />
          </section>

          <aside className="panel side">
            <h2>Ship status</h2>
            <Hud stats={stats} mission={mission} />
            <Readout stats={stats} mission={mission} checks={checks} />
            <div className="btns">
              <button className="ghost" onClick={() => setScreen("mission")}>Missions</button>
              <button className="primary" onClick={() => setScreen("planner")}>Mission planner</button>
            </div>
          </aside>
        </div>
      )}

      {/* 04 MISSION PLANNER */}
      {screen === "planner" && (
        <div className="ui center">
          <div className="panel wide">
            <h2>Mission planner: {mission.name}</h2>
            <h3>Launch vehicle</h3>
            <div className="vgrid">
              {VEHICLES.map((v) => (
                <button key={v.id} className={"card" + (design.vehicleId === v.id ? " sel" : "")} onClick={() => patch({ vehicleId: v.id })}>
                  <b>{v.name}</b><span>Lifts {v.capacity} kg · {v.cost} cr</span>
                  {stats.wetMass > v.capacity && <small className="bad">Too heavy for this vehicle</small>}
                </button>
              ))}
            </div>
            <Hud stats={stats} mission={mission} />
            <h3>Pre-flight checks</h3>
            <ul className="checks">
              {checks.map((c, i) => (
                <li key={i} className={c.level}>
                  <b>{c.level === "ok" ? "OK" : c.level === "warn" ? "WARN" : "STOP"}</b>{c.text}
                </li>
              ))}
            </ul>
            <div className="btns">
              <button className="ghost" onClick={() => setScreen("workshop")}>Back to workshop</button>
              <button className="primary" disabled={blocked} onClick={launch}>{blocked ? "Fix blockers to launch" : "Launch mission"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 05 MISSION CONTROL AND SIMULATION */}
      {screen === "flight" && report && (
        <div className="ui flight">
          <div className="panel logbox">
            <div className="meter-top"><b>Mission progress</b><span>{pct}%</span></div>
            <div className="bar"><i className="bg-good" style={{ width: `${pct}%` }} /></div>
            <ul className="log">
              {report.log.slice(0, shown).map((e, i) => <li key={i} className={e.kind}>{e.text}</li>)}
            </ul>
            <button className="ghost" onClick={() => setScreen("report")}>Skip to results</button>
          </div>
        </div>
      )}

      {/* 06 MISSION RESULTS */}
      {screen === "report" && report && (
        <div className="ui center">
          <div className="panel wide">
            <p className={"banner " + report.outcome}>
              {report.outcome === "success" ? "MISSION SUCCESS" : report.outcome === "partial" ? "PARTIAL SUCCESS" : "MISSION FAILED"}
            </p>
            <div className="scoregrid">
              <div><small>Score</small><b>{report.score}</b></div>
              <div><small>Science</small><b>{report.science}/{mission.scienceTarget}</b></div>
              <div><small>Efficiency bonus</small><b>+{report.bonus}</b></div>
              <div><small>Cost</small><b>{report.stats.totalCost}/{mission.budget}</b></div>
              <div><small>Launch mass</small><b>{Math.round(report.stats.wetMass)} kg</b></div>
              <div><small>Delta-v</small><b>{Math.round(report.stats.deltaV)} m/s</b></div>
            </div>

            <h3>Engineering problems</h3>
            {report.problems.length === 0
              ? <p>None. Clean mission.</p>
              : <ul>{report.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}

            <h3>Try this next time</h3>
            <ul>{report.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>

            <p className="fact"><b>Did you know?</b> {mission.fact}</p>

            <div className="btns">
              <button className="ghost" onClick={() => setScreen("mission")}>New mission</button>
              <button className="primary" onClick={() => setScreen("workshop")}>Redesign and retry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
