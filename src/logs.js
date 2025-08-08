import { clamp, rand } from './math.js'
import { state } from './state.js'

// Each log is a body that can store heat, conduct to neighbors and air, and ignite.
// We model: temperature (C), moisture (0..1), mass, surface area, burning flag, char level.
export function addLog(type='log'){
  const moisture = 0.08 + Math.random()*0.12
  const mass = (type==='tinder'?0.4: type==='kindling'?1.2 : 3.0) + Math.random()* (type==='tinder'?0.2: type==='kindling'?0.6 : 1.5)
  const surface = (type==='tinder'?0.05: type==='kindling'?0.11 : 0.17) + Math.random()*0.05
  const seed = Math.random()
  const jx = (seed*2-1) * 6
  const jy = (seed*1.37%1*2-1) * 2
  const jrot = (seed*1.91%1-0.5) * 0.08
  state.logs.push({
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    temp: 30 + Math.random()*10,
    moisture,
    mass,
    surface,
    burning: false,
    heat: mass * 1000 * 1.6,
    ember: 0,
    pos: {x:0,y:0},
    rot: 0,
    seed,
    row: 0,
    jx, jy, jrot,
    kind: type,
  })
  if(state.logs.length>60) state.logs.shift()
}

// Arrange logs in a pile: each row offsets from the previous, placed atop.
// Uses simple grid with per-row alternating rotation and slight jitter.
export function layoutLogs(cx, baseY){
  const maxPerRow = 5
  const spacingX = 74
  for(let i=0;i<state.logs.length;i++){
    const row = Math.floor(i/maxPerRow)
    const col = i%maxPerRow
    const countInRow = Math.min(maxPerRow, state.logs.length - row*maxPerRow)
    const center = (countInRow-1)/2
    const log = state.logs[i]
    const x = cx + (col-center)*spacingX + (log.jx||0)
    const y = baseY + 8 - row*16 + (log.jy||0)
    const rotBase = (row%2===0? (-12+col*6) : (12-col*6)) * Math.PI/180
    const rot = rotBase + (log.jrot||0)
    // base dimensions by row, scale by kind
    const baseW = 120 - row*8
    const baseH = 34 - row*2
    const k = log.kind==='tinder' ? 0.35 : log.kind==='kindling' ? 0.6 : 1
    const width = baseW * k
    const height = baseH * (k*0.8)
    Object.assign(log, {pos:{x,y}, rot, width, height, row})
  }
}

// Compute heat exchange between logs and environment each step.
// dt in seconds. Returns total radiant output to flames region.
export function simulateLogThermal(dt, env){
  let radiant = 0
  const airTemp = env.airTemp // ambient
  const k_air = 0.9   // air cooling factor
  const k_cond = 0.6  // conduction to touching neighbors
  const k_rad = 1.8   // radiation proportionality
  const igniteTemp = 280 // C threshold to self ignite
  const burnGain = 55 // heat added to burning log per second (feeds flames)
  const moisturePenalty = 140 // energy to boil off moisture (simplified)

  // Flame heating parameters
  const sigmaX = 120 // horizontal spread of flame heating
  const baseHeat = 120 // base heating rate scaled by intensity

  // neighbor map: rough proximity in the layout grid sense
  for(let i=0;i<state.logs.length;i++){
    const a = state.logs[i]
    if(!a) continue

    // heating from flame core (depends on distance to base and center)
    const dx = (a.pos.x - (env.fireX ?? 0))
    const dy = (env.baseY ?? a.pos.y) - a.pos.y
    const horiz = Math.exp(-(dx*dx)/(2*sigmaX*sigmaX))
    const vert = clamp((dy + 10) / 70, 0, 1)
    const rowFalloff = clamp(1 - 0.08*a.row, 0.25, 1)
    const flameHeat = baseHeat * (env.intensity ?? 0) * horiz * vert * rowFalloff
    a.temp += flameHeat * dt

    // air cooling
    const dT_air = (a.temp - airTemp)
    a.temp -= dT_air * k_air * dt * (0.25 + a.surface)

    // radiant contribution to flame core
    const emiss = clamp((a.temp-100)/350)
    radiant += emiss * k_rad * a.surface

    // if burning, add energy and reduce moisture
    if(a.burning){
      a.temp += burnGain * dt
      a.ember = Math.min(1, a.ember + dt*0.15)
      if(a.moisture>0){ a.moisture = Math.max(0, a.moisture - dt*0.05); a.temp -= moisturePenalty*dt*0.02 }
    } else {
      // chance to ignite if hot enough
      const hot = a.temp > igniteTemp && a.moisture < 0.12
      if(hot && Math.random() < 0.15*dt){ a.burning = true }
    }
  }

  // very simple neighbor conduction based on distance in pile
  for(let i=0;i<state.logs.length;i++){
    const a = state.logs[i]
    for(let j=i+1;j<state.logs.length;j++){
      const b = state.logs[j]
      const dx = a.pos.x - b.pos.x, dy = a.pos.y - b.pos.y
      const dist2 = dx*dx+dy*dy
      if(dist2 < 80*80){
        const dT = a.temp - b.temp
        const flow = dT * k_cond * dt * (1/Math.max(1, dist2/4000))
        a.temp -= flow; b.temp += flow
      }
    }
  }
  return radiant
}

// Draw logs with gradients, rings, and a burn highlight based on temp/ember
export function drawLogs(ctx){
  for(const log of state.logs){
    const {x,y} = log.pos; const rotation = log.rot
    const {width=110, height=32} = log
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation)
    // main body
    const grad = ctx.createLinearGradient(-width/2, 0, width/2, 0)
    grad.addColorStop(0, '#6b4329'); grad.addColorStop(1, '#3b2719')
    roundRect(ctx, -width/2, -height/2, width, height, Math.max(4, 8*(width/120)))
    ctx.fillStyle = grad; ctx.fill()

    // rings/texture
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1
    const rings = log.kind==='tinder' ? 1 : log.kind==='kindling' ? 2 : 5
    for(let r=-Math.floor(rings/2); r<=Math.floor(rings/2); r++){
      ctx.beginPath();
      ctx.ellipse(-width*0.15 + r*6, 0, Math.max(4, width*0.12 - Math.abs(r)*2), Math.max(1.5, height*0.2 - Math.abs(r)*0.3), (log.seed*0.3), 0, Math.PI*2)
      ctx.stroke()
    }
    // burn highlight scales with temp/ember; smaller for small sticks
    const glow = Math.max(0, Math.min(1, (log.temp-120)/240)) * (0.3 + 0.7*log.ember)
    ctx.fillStyle = `rgba(255,140,60,${0.04 + glow*0.2})`
    ctx.beginPath(); ctx.ellipse(0, -3, width*0.45, height*0.40, 0, 0, Math.PI*2); ctx.fill()

    ctx.restore()
  }
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath()
}
