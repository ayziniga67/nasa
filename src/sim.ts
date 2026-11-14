import { ENGINES, TANKS, PANEL, BATTERY, ANTENNAS, INSTRUMENTS, VEHICLES, type Mission } from "./data";

export interface Design {
  engineId: string;
  tanks: Record<string, number>;
  panels: number;
  batteries: number;
  antennaId: string;
  instruments: string[];
  vehicleId: string;
}

export interface Stats {
  dryMass: number;
  fuelMass: number;
  wetMass: number;
  totalCost: number;
  deltaV: number;
  powerDraw: number;
  powerDest: number;
  vehicle: any;
}

export interface LogEntry {
  at: number;
  text: string;
  kind: "ok" | "warn" | "fail";
}

export interface Report {
  outcome: "success" | "partial" | "failure";
  score: number;
  science: number;
  bonus: number;
  stats: Stats;
  problems: string[];
  tips: string[];
  failAt: number | null;
  log: LogEntry[];
}

export function defaultDesign(): Design {
  return {
    engineId: ENGINES[0].id,
    tanks: { small: 1 },
    panels: 2,
    batteries: 1,
    antennaId: ANTENNAS[0].id,
    instruments: [INSTRUMENTS[0].id],
    vehicleId: VEHICLES[0].id,
  };
}

export function computeStats(design: Design, mission: Mission): Stats {
  const engine = ENGINES.find((e) => e.id === design.engineId) || ENGINES[0];
  const antenna = ANTENNAS.find((a) => a.id === design.antennaId) || ANTENNAS[0];
  const vehicle = VEHICLES.find((v) => v.id === design.vehicleId) || VEHICLES[0];

  let dry = engine.mass + antenna.mass;
  let cost = engine.cost + antenna.cost;
  let fuel = 0;

  for (const [id, count] of Object.entries(design.tanks)) {
    const t = TANKS.find((tank) => tank.id === id);
    if (t && count > 0) {
      dry += t.mass * count;
      fuel += t.fuel * count;
      cost += t.cost * count;
    }
  }

  dry += design.panels * PANEL.mass + design.batteries * BATTERY.mass;
  cost += design.panels * PANEL.cost + design.batteries * BATTERY.cost;

  for (const id of design.instruments) {
    const inst = INSTRUMENTS.find((i) => i.id === id);
    if (inst) {
      dry += inst.mass;
      cost += inst.cost;
    }
  }

  const wet = dry + fuel;
  const totalCost = cost + vehicle.cost;

  const g0 = 9.81;
  const deltaV = fuel > 0 ? engine.isp * g0 * Math.log(wet / dry) : 0;

  const powerDraw = (engine.power || 0) + antenna.power + design.instruments.reduce((acc, id) => {
    const inst = INSTRUMENTS.find((i) => i.id === id);
    return acc + (inst?.power || 0);
  }, 0);

  const powerDest = design.panels * PANEL.watts;

  return { dryMass: dry, fuelMass: fuel, wetMass: wet, totalCost, deltaV, powerDraw, powerDest, vehicle };
}

export function preflight(stats: Stats, design: Design, mission: Mission) {
  const checks: { level: "ok" | "warn" | "block"; text: string }[] = [];
  if (stats.wetMass > stats.vehicle.capacity) {
    checks.push({ level: "block", text: `Spacecraft mass (${Math.round(stats.wetMass)} kg) exceeds launcher capacity (${stats.vehicle.capacity} kg).` });
  } else {
    checks.push({ level: "ok", text: `Launch vehicle capacity sufficient (${Math.round(stats.wetMass)} / ${stats.vehicle.capacity} kg).` });
  }

  if (stats.deltaV < mission.deltaV) {
    checks.push({ level: "block", text: `Insufficient delta-v (${Math.round(stats.deltaV)} m/s vs ${mission.deltaV} m/s required). Add more fuel tanks.` });
  } else {
    checks.push({ level: "ok", text: `Delta-v budget meets mission requirement (${Math.round(stats.deltaV)} m/s).` });
  }

  if (stats.powerDraw > stats.powerDest) {
    checks.push({ level: "warn", text: `Power deficit at destination! Draw (${stats.powerDraw}W) exceeds solar output (${stats.powerDest}W). Add solar panels or batteries.` });
  } else {
    checks.push({ level: "ok", text: `Power systems nominal (${stats.powerDest}W output vs ${stats.powerDraw}W draw).` });
  }

  return checks;
}

export function simulate(design: Design, mission: Mission, seed: number): Report {
  const stats = computeStats(design, mission);
  const log: LogEntry[] = [];
  const problems: string[] = [];
  const tips: string[] = [];

  log.push({ at: 0.05, text: `Ignition and liftoff with ${stats.vehicle.name}!`, kind: "ok" }, { at: 0.2, text: `Stage separation successful. Coasting in parking orbit.`, kind: "ok" });

  let failAt: number | null = null;
  let outcome: "success" | "partial" | "failure" = "success";

  if (stats.wetMass > stats.vehicle.capacity) {
    failAt = 0.3;
    outcome = "failure";
    log.push({ at: 0.3, text: `FATAL: Launcher failed to achieve orbit due to excessive payload mass!`, kind: "fail" });
    problems.push("Launcher payload capacity exceeded.");
    tips.push("Choose a heavier launcher or reduce fuel/instrument mass.");
  } else if (stats.deltaV < mission.deltaV) {
    failAt = 0.5;
    outcome = "failure";
    log.push({ at: 0.5, text: `FATAL: Burn out of fuel before trans-destination injection!`, kind: "fail" });
    problems.push("Insufficient delta-v to reach target orbit.");
    tips.push("Add more fuel tanks or select a higher-Isp engine.");
  } else {
    log.push({ at: 0.4, text: `Trans-${mission.destination} injection burn nominal.`, kind: "ok" }, { at: 0.7, text: `Approaching target. Orbital insertion burn initiated.`, kind: "ok" });
    if (stats.powerDraw > stats.powerDest && design.batteries === 0) {
      outcome = "partial";
      log.push({ at: 0.85, text: `WARNING: Solar eclipse brownout! Instruments lost power without battery backup.`, kind: "warn" });
      problems.push("Power deficit during eclipse without batteries.");
      tips.push("Include battery backup units in your workshop design.");
    } else {
      log.push({ at: 0.9, text: `Stable orbit achieved. Deploying instruments and antennas.`, kind: "ok" }, { at: 1.0, text: `Mission objectives successfully completed!`, kind: "ok" });
    }
  }

  const scienceEarned = outcome === "success" ? mission.scienceTarget : outcome === "partial" ? Math.round(mission.scienceTarget * 0.6) : 0;
  const bonus = Math.max(0, mission.budget - stats.totalCost);
  const score = scienceEarned * 10 + bonus * 2;

  return {
    outcome,
    score,
    science: scienceEarned,
    bonus,
    stats,
    problems,
    tips: tips.length ? tips : ["Great design balance! Try a harder mission next."],
    failAt,
    log,
  };
}
