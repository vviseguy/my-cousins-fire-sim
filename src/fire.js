import { clamp, rand } from './math.js'
import { state } from './state.js'

export function spawnFireParticle(cx, by, intensity){
  const life = 600 + Math.random()*1100
  const size = 8 + Math.random()*28 * Math.max(0.6, intensity)
  const vx = (Math.random()-0.5) * (10 + 30*intensity)
  const vy = - (30 + Math.random()*90) * (0.6 + intensity)
  const seed = Math.random()
  state.particles.push({x:cx + (Math.random()-0.5)*30, y:by + (Math.random()*8 - 6), vx, vy, life, age:0, size, seed})
}
export function spawnSmoke(x,y){ state.smokes.push({x,y,vx:(Math.random()-0.5)*12,vy:-20 - Math.random()*20,age:0,life:1200 + Math.random()*2000,size:18+Math.random()*30}) }

export function updateParticles(dt){
  for(let i=state.particles.length-1;i>=0;i--){ const p = state.particles[i]; p.age += dt; if(p.age > p.life){ state.particles.splice(i,1); continue }
    p.vx += (Math.random()-0.5) * 6 * dt/1000
    p.vy += -6 * dt/1000
    p.x += p.vx * dt/1000
    p.y += p.vy * dt/1000 }
  for(let i=state.smokes.length-1;i>=0;i--){ const s = state.smokes[i]; s.age += dt; if(s.age > s.life){ state.smokes.splice(i,1); continue } s.x += s.vx * dt/1000; s.y += s.vy * dt/1000 }
}

export function renderFire(ctx, w, h, cx, baseY){
  // bright core
  if(state.intensity > 0){ const coreR = 6 + state.intensity*14; const gcore = ctx.createRadialGradient(cx, baseY - 6, 0, cx, baseY - 6, coreR*3); gcore.addColorStop(0, 'rgba(255,255,240,1)'); gcore.addColorStop(0.4, 'rgba(255,220,100,0.55)'); gcore.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gcore; ctx.beginPath(); ctx.arc(cx, baseY - 6, coreR*3, 0, Math.PI*2); ctx.fill(); ctx.globalCompositeOperation = 'source-over' }

  // additive particles
  ctx.globalCompositeOperation = 'lighter'
  for(const p of state.particles){ const t = p.age / p.life; const alpha = Math.max(0, 1 - t); const size = p.size * (1 - t*0.6); const x = p.x/devicePixelRatio, y = p.y/devicePixelRatio
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size*2)
    // reduce per-frame jitter by basing colors on seed
    const g = Math.floor(160 + (p.seed*40))
    grad.addColorStop(0, `rgba(255,${g},40,${alpha})`)
    grad.addColorStop(0.35, `rgba(255,${120 + Math.floor(40*p.seed)},30,${alpha*0.6})`)
    grad.addColorStop(1, `rgba(40,20,10,0)`)
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.ellipse(x, y, size, size*1.4, 0, 0, Math.PI*2); ctx.fill()
    ctx.globalAlpha = 0.6 * alpha
    ctx.fillStyle = 'rgba(255,255,200,0.6)'
    ctx.beginPath(); ctx.ellipse(x + (p.vx*0.02), y - size*0.8, size*0.5, size*0.3, 0, 0, Math.PI*2); ctx.fill()
    ctx.globalAlpha = 1 }
  ctx.globalCompositeOperation = 'source-over'

  // embers/"sparks": increase tries and probability, scale with sparkiness
  const tries = Math.max(4, Math.round(12 * (0.5 + 0.8*state.intensity) * (state.sparkiness || 1)))
  const prob = 0.10 * (0.5 + state.intensity*0.8)
  if(state.intensity > 0){ for(let i=0;i<tries;i++){ if(Math.random() < prob){ ctx.fillStyle = `rgba(255,${120+Math.random()*120},0,${0.6*state.intensity})`; const ex = cx + (Math.random()-0.5)*90; const ey = baseY - Math.random()*40; ctx.fillRect(ex, ey, 2+Math.random()*2, 2+Math.random()*2) } } }
}
