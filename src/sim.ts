import {
  ENGINES, TANKS, ANTENNAS, INSTRUMENTS, VEHICLES, PANEL, BATTERY,
  TAG_LABEL, type Mission, type Engine, type Antenna, type Vehicle, type Instrument,
} from "./data";

export const G0 = 9.81;
export const NAV_MARGIN = 150; // m/s reserve for course corrections

export interface Design {
  engineId: string;
  tanks: Record<string, number>;
  panels: number;
  batteries: number;
  antennaId: string;
  instruments: string[];
  vehicleId: string;
}

export const defaultDesign = (): Design => ({
  engineId: "chem",
  tanks: { small: 0, large: 1 },
  panels: 1,
  batteries: 0,
  antennaId: "basic",
  instruments: ["camera"],
  vehicleId: "medium",
});

function find<T extends { id: string }>(list: T[], id: string): T {
  return list.find((x) => x.id === id) ?? list[0];
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export interface Stats {
  engine: Engine;
  antenna: Antenna;
  vehicle: Vehicle;
  instruments: Instrument[];
  dryMass: number;
  fuelMass: number;
  wetMass: number;
  craftCost: number;
  totalCost: number;
  deltaV: number;
  margin: number;
  powerEarth: number;
  powerDest: number;
  powerDraw: number;
  science: number;
}

export function computeStats(d: Design, m: Mission): Stats {
  const engine = find(ENGINES, d.engineId);
  const antenna = find(ANTENNAS, d.antennaId);
  const vehicle = find(VEHICLES, d.vehicleId);
  const instruments = d.instruments.map((id) => find(INSTRUMENTS, id));

  let tankMass = 0, fuelMass = 0, tankCost = 0;
  for (const t of TANKS) {
    const n = d.tanks[t.id] ?? 0;
    tankMass += n * t.mass;
    fuelMass += n * t.fuel;
    tankCost += n * t.cost;
  }

  const dryMass =
    engine.mass + tankMass + d.panels * PANEL.mass + d.batteries * BATTERY.mass +
    antenna.mass + sum(instruments.map((i) => i.mass));
  const wetMass = dryMass + fuelMass;
  const craftCost =
    engine.cost + tankCost + d.panels * PANEL.cost + d.batteries * BATTERY.cost +
    antenna.cost + sum(instruments.map((i) => i.cost));

  // Tsiolkovsky rocket equation
  const deltaV = fuelMass > 0 ? engine.isp * G0 * Math.log(wetMass / dryMass) : 0;
  const powerEarth = d.panels * PANEL.watts;

  return {
    engine, antenna, vehicle, instruments,
    dryMass, fuelMass, wetMass, craftCost,
    totalCost: craftCost + vehicle.cost,
    deltaV,
    margin: deltaV - m.deltaV,
    powerEarth,
    powerDest: powerEarth * m.sunFactor,
    powerDraw: antenna.power + sum(instruments.map((i) => i.power)),
    science: sum(instruments.map((i) => i.science)),
  };
}

/** Which instruments get power at the destination (primary instrument first). */
export function instrumentStatus(d: Design, m: Mission, flareFactor = 1) {
  const antenna = find(ANTENNAS, d.antennaId);
  let left = d.panels * PANEL.watts * m.sunFactor * flareFactor - antenna.power;
  const sorted = d.instruments
    .map((id) => find(INSTRUMENTS, id))
    .sort((a, b) =>
      (b.tag === m.primaryTag ? 1 : 0) - (a.tag === m.primaryTag ? 1 : 0) || b.science - a.science);
  return sorted.map((inst) => {
    const on = left >= inst.power;
    if (on) left -= inst.power;
    return { inst, on };
  });
}

export interface Check { level: "ok" | "warn" | "block"; text: string }

export function preflight(s: Stats, d: Design, m: Mission): Check[] {
  const c: Check[] = [];
  const push = (level: Check["level"], text: string) => c.push({ level, text });

  if (s.totalCost > m.budget) push("block", `Over budget by ${s.totalCost - m.budget} cr.`);
  else push("ok", `Budget OK: ${s.totalCost} of ${m.budget} cr.`);

  if (s.wetMass > s.vehicle.capacity)
    push("block", `Spacecraft weighs ${Math.round(s.wetMass)} kg but ${s.vehicle.name} lifts only ${s.vehicle.capacity} kg.`);
  else push("ok", `Mass OK: ${Math.round(s.wetMass)} of ${s.vehicle.capacity} kg.`);

  if (s.engine.power > s.powerEarth)
    push("warn", `${s.engine.name} needs ${s.engine.power} W but your panels give ${s.powerEarth} W. It will not start.`);

  if (s.deltaV < m.deltaV)
    push("warn", `Not enough delta-v: ${Math.round(s.deltaV)} of ${m.deltaV} m/s needed.`);
  else if (s.margin < NAV_MARGIN)
    push("warn", `Thin fuel reserve (${Math.round(s.margin)} m/s). A course correction could strand you.`);
  else push("ok", `Delta-v OK: ${Math.round(s.deltaV)} m/s (needs ${m.deltaV}).`);

  const hasPrimary = d.instruments.some((id) => find(INSTRUMENTS, id).tag === m.primaryTag);
  if (!hasPrimary) push("warn", `No ${TAG_LABEL[m.primaryTag]} instrument. The main objective can't be completed.`);

  const off = instrumentStatus(d, m).filter((x) => !x.on).map((x) => x.inst.name);
  if (off.length) push("warn", `Not enough power at destination for: ${off.join(", ")}.`);

  if (s.antenna.comm < m.minComm) push("warn", "Antenna too weak for this distance. Data return will be halved.");
  if (d.batteries === 0) push("warn", "No battery backup. A solar flare would reduce power.");

  return c;
}

// ---------- Mission simulation ----------

export type Outcome = "success" | "partial" | "failure";
export interface LogEntry { at: number; kind: "ok" | "warn" | "fail"; text: string }
export interface Report {
  outcome: Outcome;
  score: number;
  science: number;
  bonus: number;
  failAt: number | null;
  log: LogEntry[];
  problems: string[];
  tips: string[];
  stats: Stats;
  online: string[];
  offline: string[];
}

export function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulate(d: Design, m: Mission, seed: number): Report {
  const s = computeStats(d, m);
  const rng = mulberry32(seed);
  const log: LogEntry[] = [];
  const problems: string[] = [];
  const tips: string[] = [];
  const st = { failAt: null as number | null };
  const failed = () => st.failAt !== null;
  const add = (at: number, kind: LogEntry["kind"], text: string) => log.push({ at, kind, text });
  const fail = (at: number, text: string, problem: string, tip: string) => {
    st.failAt = at;
    add(at, "fail", text);
    problems.push(problem);
    tips.push(tip);
  };

  add(0, "ok", `Liftoff on ${s.vehicle.name}: ${Math.round(s.wetMass)} kg of ${s.vehicle.capacity} kg capacity.`);
  add(0.1, "ok", "Parking orbit reached. All systems nominal.");

  // Transfer burn
  if (s.engine.power > s.powerEarth) {
    fail(0.15,
      `${s.engine.name} could not start: needs ${s.engine.power} W, panels give ${Math.round(s.powerEarth)} W.`,
      "The engine did not get enough electrical power.",
      "Add solar panels so output exceeds the engine's power draw.");
  } else if (s.deltaV < m.deltaV) {
    const ratio = Math.max(0, s.deltaV / m.deltaV);
    fail(0.2 + 0.5 * ratio,
      `Out of propellant after ${Math.round(ratio * 100)}% of the required burn.`,
      `Delta-v was ${Math.round(s.deltaV)} m/s but the mission needs ${m.deltaV} m/s.`,
      "Add fuel tanks, choose a more efficient engine, or cut dead weight.");
  } else {
    add(0.2, "ok", `Transfer burn complete: ${Math.round(s.deltaV)} m/s available, ${m.deltaV} needed.`);
  }

  // Random mid-mission events
  type Ev = "flare" | "nav" | "comm" | "quiet";
  const pool: Ev[] = ["flare", "nav", "comm", "quiet"];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let flare = 1;
  let commLoss = 1;
  pool.slice(0, 2).forEach((ev, idx) => {
    if (failed()) return;
    const at = idx === 0 ? 0.4 : 0.65;
    if (ev === "flare") {
      if (d.batteries > 0) add(at, "ok", "Solar flare! The battery bank covered the power dip.");
      else {
        flare = 0.6;
        add(at, "warn", "Solar flare! Panel output dropped 40%.");
        problems.push("A solar flare cut power and there was no battery backup.");
        tips.push("Add a battery so instruments survive power dips.");
      }
    } else if (ev === "nav") {
      if (s.margin >= NAV_MARGIN) add(at, "ok", `Course correction (${NAV_MARGIN} m/s) completed from fuel reserve.`);
      else fail(at,
        `Course correction needs ${NAV_MARGIN} m/s but only ${Math.max(0, Math.round(s.margin))} m/s is spare. Target missed.`,
        "No fuel reserve for a course correction.",
        `Keep at least ${NAV_MARGIN} m/s of delta-v above the mission requirement.`);
    } else if (ev === "comm") {
      if (s.antenna.comm >= 2) add(at, "ok", "Signal dropout. The strong antenna held the link.");
      else {
        commLoss = 0.75;
        add(at, "warn", "Signal dropout! 25% of data was lost.");
        problems.push("The basic antenna lost part of the data during a dropout.");
        tips.push("A strong antenna keeps data flowing through dropouts.");
      }
    } else {
      add(at, "ok", "Quiet cruise. No anomalies.");
    }
  });

  // Arrival and science
  let science = 0;
  const online: string[] = [];
  const offline: string[] = [];
  let primaryOnline = false;

  if (!failed()) {
    add(0.85, "ok", m.destination === "moon" ? "Lunar orbit insertion successful." : "Mars orbit insertion successful.");
    for (const { inst, on } of instrumentStatus(d, m, flare)) {
      if (on) {
        online.push(inst.name);
        science += inst.science;
        if (inst.tag === m.primaryTag) primaryOnline = true;
      } else {
        offline.push(inst.name);
        problems.push(`${inst.name} had no power.`);
        tips.push("Add solar panels or drop a power-hungry instrument. Sunlight is weaker far from the Sun.");
      }
    }
    if (!d.instruments.some((id) => find(INSTRUMENTS, id).tag === m.primaryTag)) {
      problems.push(`The mission objective needs a ${TAG_LABEL[m.primaryTag]} instrument.`);
      tips.push(`Install a ${TAG_LABEL[m.primaryTag]} instrument.`);
    }
    const commFactor = s.antenna.comm >= m.minComm ? 1 : 0.5;
    if (commFactor < 1) {
      problems.push("The antenna was too weak for this distance, so half the data was lost.");
      tips.push("Use the strong antenna for distant missions.");
    }
    science = Math.round(science * commFactor * commLoss);
    add(0.93, offline.length ? "warn" : "ok",
      `Science operations: ${online.length ? online.join(", ") : "no instruments"} online.`);
    add(1, science >= m.scienceTarget ? "ok" : "warn", `Data returned: ${science} science points (target ${m.scienceTarget}).`);
  }

  let outcome: Outcome = "failure";
  if (!failed()) outcome = primaryOnline && science >= m.scienceTarget ? "success" : "partial";
  const bonus = outcome === "failure" ? 0 : Math.round(Math.max(0, (m.budget - s.totalCost) / m.budget) * 20);
  const score = outcome === "failure" ? 0 : science + bonus;
  if (outcome === "success" && tips.length === 0) tips.push("Great design! Try a cheaper or lighter spacecraft for a bigger efficiency bonus.");

  return {
    outcome, score, science, bonus, failAt: st.failAt, log,
    problems, tips: Array.from(new Set(tips)), stats: s, online, offline,
  };
}
