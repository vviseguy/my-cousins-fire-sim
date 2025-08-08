// Small math helpers used for placement and heat exchange
export const TAU = Math.PI * 2
export const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v))
export const lerp = (a,b,t)=> a + (b-a)*t
export const mix = lerp
export const rand = (a,b)=> a + Math.random()*(b-a)
export const smoothstep = (e0,e1,x)=>{ const t = clamp((x-e0)/(e1-e0)); return t*t*(3-2*t) }

// Simple 2D vector ops
export function vec(x=0,y=0){ return {x,y} }
export function add(a,b){ a.x+=b.x; a.y+=b.y; return a }
export function mul(a,s){ a.x*=s; a.y*=s; return a }

// Thermal helpers
// Convert a duration-like fuel (seconds) into energy quanta
export function fuelSecondsToEnergy(sec){
  // scale factor determines how much energy a second of "log" adds
  // tuned to keep similar feel to original while enabling heat sim
  const SCALE = 30; // energy units per second of listed fuel
  return sec * SCALE
}
