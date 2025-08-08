import { THREE } from './three-setup.js'

let group
const pool = []
const MAX = 320
let tex

export function initFlame3D(scene){
  if(group) return group
  group = new THREE.Group()
  scene.add(group)
  tex = makeFlameTexture()
  for(let i=0;i<MAX;i++) pool.push(makeSprite())
  return group
}

function makeFlameTexture(){
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(32,40,2, 32,32,30)
  grd.addColorStop(0,'rgba(255,255,240,1)')
  grd.addColorStop(0.35,'rgba(255,180,60,0.9)')
  grd.addColorStop(1,'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0,0,64,64)
  const t = new THREE.Texture(c)
  t.needsUpdate = true
  t.encoding = THREE.sRGBEncoding
  return t
}

function makeSprite(){
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite:false, blending: THREE.AdditiveBlending, color: 0xffffff, opacity: 0 })
  const s = new THREE.Sprite(mat)
  s.visible = false
  s.userData = { age:0, life:1, vel: new THREE.Vector3(), startSize: 10 }
  group.add(s)
  return s
}

function spawn(cx=0, cy=40, cz=0, intensity=0.5){
  const s = pool.find(p=>!p.visible)
  if(!s) return
  s.visible = true
  s.position.set(
    cx + (Math.random()-0.5)*20,
    cy + (Math.random()*8 - 5),
    cz + (Math.random()-0.5)*20
  )
  const ud = s.userData
  ud.age = 0
  ud.life = 0.6 + Math.random()*1.2
  ud.startSize = 12 + Math.random()*28 * Math.max(0.6, intensity)
  ud.vel.set( (Math.random()-0.5)*(4 + 20*intensity),  18 + Math.random()*40 + 60*intensity,  (Math.random()-0.5)*(4 + 20*intensity) )
  s.material.opacity = 0.0
  s.scale.set(ud.startSize, ud.startSize*1.6, 1)
}

export function updateFlame3D(dt, intensity){
  if(!group) return
  // spawn rate
  const spawnPerSec = 120 * intensity
  const n = Math.floor(spawnPerSec * dt)
  for(let i=0;i<n;i++) spawn(0, 40, 0, intensity)

  // update
  const drag = 0.96
  for(const s of pool){
    if(!s.visible) continue
    const ud = s.userData
    ud.age += dt
    if(ud.age >= ud.life){ s.visible=false; continue }
    // motion
    s.position.x += ud.vel.x * dt
    s.position.y += ud.vel.y * dt
    s.position.z += ud.vel.z * dt
    ud.vel.x *= drag; ud.vel.z *= drag; ud.vel.y += 10 * dt
    // fade/scale
    const t = ud.age/ud.life
    s.material.opacity = Math.max(0, 1 - t)
    s.scale.set(ud.startSize*(1 - t*0.5), ud.startSize*(1.6 - t*1.2), 1)
  }
}
