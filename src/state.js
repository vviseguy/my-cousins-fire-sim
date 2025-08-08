// Centralized simulation state and constants
export const FUEL = { tinder:8, kindling:25, log:120 }

export const state = {
  alive:false,
  // energy is the total joules-equivalent we track; replaces naive fuelSeconds
  energy: 0,              // abstract energy units
  intensity: 0,           // [0..1] visual/airflow coupling
  score: 0,
  particles: [],
  smokes: [],
  logs: [],
  spawnCarry: 0,
  t: performance.now(),
  use3D: true,
  sparkiness: 1,         // >1 = more sparks; <1 = fewer
}

export function reset() {
  state.alive = false
  state.energy = 0
  state.intensity = 0
  state.score = 0
  state.particles.length = 0
  state.smokes.length = 0
  state.logs.length = 0
  state.spawnCarry = 0
}
