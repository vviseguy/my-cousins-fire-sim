import { clamp } from './math.js'
import { state } from './state.js'
import { layoutLogs, simulateLogThermal } from './logs.js'
import { spawnFireParticle, spawnSmoke, updateParticles } from './fire.js'
import { updateHUD } from './ui.js'
import { showMessage } from './ui.js'

// Environment parameters
const env = {
  airTemp: 22,          // C ambient
  wind: 0,
}

// Convert energy store to a notional remaining seconds for HUD
function energyToSeconds(E){
  const k = 30 // invert the fuelSecondsToEnergy scale in math.js
  return E / k
}

function targetIntensityFromEnergy(E){
  if(E <= 0) return 0
  const t = 1 - Math.exp(-E/1800) // slow saturating curve
  return Math.min(1, 0.12 + 0.9*t)
}

export function step(dtMs, canvas, radiantOverride){
  const dt = Math.min(60, dtMs) / 1000

  const w = canvas.width/devicePixelRatio, h = canvas.height/devicePixelRatio
  const cx = w/2, baseY = h*0.82

  if(state.alive){
    let radiant = 0

    if(state.use3D && radiantOverride !== undefined){
      radiant = radiantOverride || 0
    } else {
      // 2D: Layout before thermal sim to have positions for conduction
      layoutLogs(cx, baseY)
      // Thermal sim on logs, returns radiant contribution
      radiant = simulateLogThermal(dt, { ...env, fireX: cx, baseY, intensity: state.intensity })
    }

    // Burn energy based on intensity and heat being radiated to environment
    const burnRate = 12 + Math.pow(state.intensity, 1.8) * 70 + radiant*4
    state.energy = Math.max(0, state.energy - burnRate * dt)

    // Intensity approaches target based on energy
    const target = targetIntensityFromEnergy(state.energy)
    state.intensity += (target - state.intensity) * Math.min(1, dt * 2.0)

    if(state.energy === 0){
      state.alive = false; state.intensity = 0
      for(let i=0;i<10;i++) spawnSmoke(canvas.width/2 + (Math.random()-0.5)*160, canvas.height*0.78 - Math.random()*40)
      showMessage('The fire has gone out')
    }
  } else {
    state.intensity = 0
  }

  // Spawn fire particles near hottest area when alive (2D mode only)
  if(state.alive && !state.use3D){
    const spawnPerSec = 80 * state.intensity
    const spawnThisFrame = spawnPerSec * dt + state.spawnCarry
    const n = Math.floor(spawnThisFrame); state.spawnCarry = spawnThisFrame - n
    for(let i=0;i<n;i++) spawnFireParticle(canvas.width/2, canvas.height*0.82, state.intensity)
  }

  updateParticles(dtMs)
  updateHUD(energyToSeconds(state.energy))
}
