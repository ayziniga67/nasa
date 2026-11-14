export type InstrumentTag = "general" | "water" | "atmosphere";

export interface Engine { id: string; name: string; mass: number; cost: number; isp: number; power: number; blurb: string }
export interface Tank { id: string; name: string; mass: number; cost: number; fuel: number }
export interface Antenna { id: string; name: string; mass: number; cost: number; power: number; comm: number }
export interface Instrument { id: string; name: string; mass: number; cost: number; power: number; science: number; tag: InstrumentTag }
export interface Vehicle { id: string; name: string; capacity: number; cost: number }

export interface Mission {
  id: "moon" | "mars";
  name: string;
  destination: "moon" | "mars";
  tagline: string;
  brief: string;
  fact: string;
  budget: number;        // credits
  deltaV: number;        // m/s needed (simplified game value)
  sunFactor: number;     // sunlight strength vs Earth
  primaryTag: InstrumentTag;
  scienceTarget: number;
  minComm: number;
  travelTime: string;
  nasaQuery: string;
}

// NOTE: all values are simplified game values, not real spacecraft specs.
export const ENGINES: Engine[] = [
  { id: "chem", name: "Chemical Engine", mass: 100, cost: 200, isp: 320, power: 0, blurb: "Reliable, powerful, thirsty for fuel." },
  { id: "ion", name: "Ion Thruster", mass: 160, cost: 380, isp: 900, power: 150, blurb: "Very efficient, but needs 150 W of solar power to run." },
];

export const TANKS: Tank[] = [
  { id: "small", name: "Small fuel tank", mass: 60, cost: 70, fuel: 300 },
  { id: "large", name: "Large fuel tank", mass: 150, cost: 150, fuel: 800 },
];

export const PANEL = { mass: 30, cost: 100, watts: 60 };
export const BATTERY = { mass: 15, cost: 60 };

export const ANTENNAS: Antenna[] = [
  { id: "basic", name: "Basic antenna", mass: 10, cost: 50, power: 5, comm: 1 },
  { id: "strong", name: "Strong antenna", mass: 25, cost: 100, power: 15, comm: 2 },
];

export const INSTRUMENTS: Instrument[] = [
  { id: "camera", name: "Science camera", mass: 20, cost: 120, power: 20, science: 30, tag: "general" },
  { id: "spectro", name: "Neutron spectrometer", mass: 35, cost: 180, power: 30, science: 50, tag: "water" },
  { id: "atmos", name: "Atmosphere sensor", mass: 30, cost: 160, power: 25, science: 50, tag: "atmosphere" },
];

export const VEHICLES: Vehicle[] = [
  { id: "light", name: "Light Lifter", capacity: 700, cost: 200 },
  { id: "medium", name: "Medium Lifter", capacity: 1200, cost: 400 },
  { id: "heavy", name: "Heavy Lifter", capacity: 2500, cost: 700 },
];

export const TAG_LABEL: Record<InstrumentTag, string> = {
  general: "general",
  water: "water-detecting",
  atmosphere: "atmosphere-sensing",
};

export const MISSIONS: Mission[] = [
  {
    id: "moon",
    name: "Lunar Water Survey",
    destination: "moon",
    tagline: "First playable destination",
    brief: "Search the Moon's polar regions for water ice. You need a water-detecting instrument, enough power to run it, and enough fuel to reach lunar orbit.",
    fact: "Water ice has been detected in permanently shadowed lunar craters, a key reason for NASA's Artemis programme.",
    budget: 1300,
    deltaV: 3500,
    sunFactor: 1,
    primaryTag: "water",
    scienceTarget: 80,
    minComm: 1,
    travelTime: "about 4 days",
    nasaQuery: "Artemis moon south pole",
  },
  {
    id: "mars",
    name: "Martian Atmosphere Investigation",
    destination: "mars",
    tagline: "Advanced mission",
    brief: "Study the thin Martian atmosphere. Sunlight is weaker out there, the trip needs far more delta-v, and distant signals need a strong antenna.",
    fact: "Mars gets only about 43% of the sunlight Earth does, and its surface pressure is under 1% of Earth's. NASA's MAVEN orbiter studies how its atmosphere was lost.",
    budget: 2000,
    deltaV: 5200,
    sunFactor: 0.43,
    primaryTag: "atmosphere",
    scienceTarget: 80,
    minComm: 2,
    travelTime: "about 7 months",
    nasaQuery: "Mars atmosphere MAVEN",
  },
];
