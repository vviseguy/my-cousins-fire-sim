import { ICONS, createIcon } from './icons.js'
import { state, FUEL } from './state.js'
import { fuelSecondsToEnergy } from './math.js'
import { addLog } from './logs.js'
import { resizeThree } from './three-setup.js'
import { addLog3D } from './logs3d.js'

export const scene = document.getElementById('scene')
export const canvas = document.getElementById('flameCanvas')
export const ctx = canvas.getContext('2d')
export const intensityBar = document.getElementById('intensityBar')
export const fuelLeft = document.getElementById('fuelLeft')
export const startBtn = document.getElementById('startBtn')
const msgEl = document.getElementById('message')

// icons
createIcon('icon-tinder', ICONS.tinder)
createIcon('icon-kindling', ICONS.kindling)
createIcon('icon-log', ICONS.log)

// Sparks slider
const sparkSlider = document.getElementById('sparkSlider')
const sparkVal = document.getElementById('sparkVal')
if(sparkSlider){
  sparkSlider.addEventListener('input', ()=>{
    const v = parseFloat(sparkSlider.value)
    state.sparkiness = v
    if(sparkVal) sparkVal.textContent = v.toFixed(1) + 'x'
  })
}

// resize canvas to match CSS size
export function resize(){
  const r = scene.getBoundingClientRect()
  canvas.width = Math.floor(r.width * devicePixelRatio)
  canvas.height = Math.floor(r.height * devicePixelRatio)
  canvas.style.width = r.width + 'px'
  canvas.style.height = r.height + 'px'
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)
  if(state.use3D) resizeThree()
}
window.addEventListener('resize', resize); setTimeout(resize,60)

let msgTimer
export function showMessage(text, ms=1800){ clearTimeout(msgTimer); msgEl.textContent = text; msgEl.style.display='block'; msgTimer=setTimeout(()=>msgEl.style.display='none', ms) }

export function tossFuel(type, sourceEl){
  const icon = document.createElement('div')
  icon.className = 'fuelIcon'
  icon.style.backgroundImage = `url(${ICONS[type]})`
  scene.appendChild(icon)
  const b = sourceEl.getBoundingClientRect(); const s = scene.getBoundingClientRect()
  const startX = b.left + b.width/2 - s.left - 28; const startY = b.top + b.height/2 - s.top - 28
  icon.style.left = startX + 'px'; icon.style.top = startY + 'px'
  const targetX = s.width/2 - 28; const targetY = s.height*0.78 - 28
  if(icon.animate){
    icon.animate([{transform:'translateY(0px) scale(1)', opacity:1},{transform:`translate(${targetX-startX}px,${targetY-startY}px) scale(0.9)`, opacity:0.98}],{duration:620 + Math.random()*200, easing:'cubic-bezier(.2,.9,.2,1)'});
    setTimeout(()=>{ icon.remove(); depositFuel(type) }, 700)
  } else {
    icon.style.transition = 'transform 700ms cubic-bezier(.2,.9,.2,1), opacity 700ms';
    icon.style.transform = `translate(${targetX-startX}px,${targetY-startY}px) scale(0.9)`;
    setTimeout(()=>{ icon.remove(); depositFuel(type) }, 720)
  }
}

function depositFuel(type){
  // translate legacy fuel seconds to energy units
  const energy = fuelSecondsToEnergy(FUEL[type])
  state.energy += energy
  if(type==='log' || type==='kindling' || type==='tinder'){
    // always add to 2D list for fallback
    addLog(type)
    // add to 3D if enabled
    if(state.use3D){
      try { if(typeof addLog3D === 'function') addLog3D(type) } catch(e){ console.warn('3D addLog failed, falling back to 2D', e); }
    }
  }
  state.score += (type==='log'?5:type==='kindling'?2:1)
  if(state.alive){
    const boost = (type==='tinder'?0.18 : type==='kindling'?0.28 : 0.12)
    state.intensity = Math.min(1, state.intensity + boost)
  }
}

export function wireControls(){
  // start
  startBtn.addEventListener('click', ()=>{
    if(state.alive){ showMessage('Fire is already burning'); return }
    if(state.energy <= 0){ showMessage('Add some fuel first (tinder/kindling/log)'); return }
    state.alive = true; state.intensity = Math.max(state.intensity, 0.18); showMessage('Fire started')
  })

  // buttons
  document.querySelectorAll('[data-fuel]').forEach(btn=>{ btn.addEventListener('click', ()=> tossFuel(btn.dataset.fuel, btn)) })
  // keyboard
  window.addEventListener('keydown', (e)=>{ if(e.key==='1') tossFuel('tinder', document.querySelector('[data-fuel="tinder"]')); if(e.key==='2') tossFuel('kindling', document.querySelector('[data-fuel="kindling"]')); if(e.key==='3') tossFuel('log', document.querySelector('[data-fuel="log"]')) })
}

export function updateHUD(approxSeconds){
  intensityBar.style.width = Math.round(state.intensity*100) + '%'
  fuelLeft.textContent = Math.max(0, Math.round(approxSeconds)) + 's'
}
