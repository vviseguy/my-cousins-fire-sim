import { state } from './state.js'
import { drawLogs } from './logs.js'
import { renderFire } from './fire.js'
import { scene, canvas, ctx, resize, showMessage, wireControls, tossFuel } from './ui.js'
import { step } from './sim.js'
import { initLogs3D, addLog3D, updateThermal3D, render3D, getThree, updatePhysics3D, getHotSpots } from './logs3d.js'
import { initFlame3D, updateFlame3D } from './flame3d.js'

// Expose for debugging
window._campfire = { state, tossFuel }

resize()
wireControls()

let three
if(state.use3D){
  initLogs3D()
  three = getThree()
  initFlame3D(three.scene)
}

let last = performance.now()
function loop(now){ const dt = now - last; last = now
  let radiant3D
  // Update 3D or 2D logs
  if(state.use3D){
    updatePhysics3D(Math.min(0.05, dt/1000))
    radiant3D = updateThermal3D(dt/1000) || 0
  }

  step(dt, canvas, radiant3D)

  if(state.use3D){ updateFlame3D(dt/1000, state.intensity, getHotSpots()) }

  render(now)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

function render(now){
  // Render 3D background first if enabled
  if(state.use3D){ render3D() }

  // Draw 2D overlay canvas (glow + fire particles if 2D mode)
  ctx.clearRect(0,0,canvas.width,canvas.height)
  const w = canvas.width/devicePixelRatio, h = canvas.height/devicePixelRatio
  const cx = w/2, baseY = h*0.82

  if(state.intensity > 0){ const g = ctx.createRadialGradient(cx, baseY - 8, 10, cx, baseY - 8, Math.max(90, 320*state.intensity)); g.addColorStop(0, `rgba(255,210,150,${0.22 * state.intensity})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0,0,w,h) }

  if(!state.use3D){ drawLogs(ctx) }

  if(!state.use3D){ renderFire(ctx, w, h, cx, baseY) }
}
