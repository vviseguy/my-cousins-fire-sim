import { THREE } from './three-setup.js'

let group
const pool = []
const MAX = 480
let tex
let sparkGroup, sparkPool = [], SPARK_MAX = 240

export function initFlame3D(scene){
  if(group) return group
  group = new THREE.Group(); scene.add(group)
  tex = makeFlameTexture()
  for(let i=0;i<MAX;i++) pool.push(makeSprite())
  // sparks
  sparkGroup = new THREE.Group(); scene.add(sparkGroup)
  for(let i=0;i<SPARK_MAX;i++) sparkPool.push(makeSpark())
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
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function makeSprite(){
  const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite:false, blending: THREE.AdditiveBlending, color: 0xffffff, opacity: 0 })
  const s = new THREE.Sprite(mat)
  s.visible = false
  s.userData = { age:0, life:1, vel: new THREE.Vector3(), startSize: 10 }
  group.add(s)
  return s
}

function makeSpark(){
  const geo = new THREE.SphereGeometry(0.8, 6, 6)
  const mat = new THREE.MeshBasicMaterial({ color: 0xffcc66 })
  const m = new THREE.Mesh(geo, mat)
  m.visible = false
  m.userData = { age:0, life:1, vel: new THREE.Vector3() }
  sparkGroup.add(m)
  return m
}

function spawnAt(pos, intensity){
  const s = pool.find(p=>!p.visible)
  if(!s) return
  s.visible = true
  s.position.copy(pos)
  s.position.x += (Math.random()-0.5)*8
  s.position.y += (Math.random()*4)
  s.position.z += (Math.random()-0.5)*8
  const ud = s.userData
  ud.age = 0
  ud.life = 0.6 + Math.random()*1.2
  ud.startSize = 12 + Math.random()*28 * Math.max(0.6, intensity)
  ud.vel.set( (Math.random()-0.5)*(6 + 30*intensity),  24 + Math.random()*50 + 70*intensity,  (Math.random()-0.5)*(6 + 30*intensity) )
  s.material.opacity = 0.0
  s.scale.set(ud.startSize, ud.startSize*1.6, 1)
}

function spawnSparkAt(pos, intensity){
  const m = sparkPool.find(x=>!x.visible)
  if(!m) return
  m.visible = true
  m.position.copy(pos)
  m.position.y += 6
  m.userData.age = 0
  m.userData.life = 0.5 + Math.random()*1.2
  m.userData.vel.set( (Math.random()-0.5)*(20 + 60*intensity),  40 + Math.random()*80 + 40*intensity,  (Math.random()-0.5)*(20 + 60*intensity) )
}

export function updateFlame3D(dt, intensity, hotSpots){
  if(!group) return
  // spawn rate based on intensity and number of hotspots
  const spots = (hotSpots && hotSpots.length) ? hotSpots : [new THREE.Vector3(0,40,0)]
  const spawnPerSec = (160 + 140*intensity) * Math.min(1, spots.length/8)
  const n = Math.floor(spawnPerSec * dt)
  for(let i=0;i<n;i++){
    const p = spots[(Math.random()*spots.length)|0]
    spawnAt(p, intensity)
    if(Math.random() < 0.6){ spawnSparkAt(p, intensity) }
  }

  const drag = 0.96
  for(const s of pool){
    if(!s.visible) continue
    const ud = s.userData
    ud.age += dt
    if(ud.age >= ud.life){ s.visible=false; continue }
    s.position.addScaledVector(ud.vel, dt)
    ud.vel.x *= drag; ud.vel.z *= drag; ud.vel.y += 10 * dt
    const t = ud.age/ud.life
    s.material.opacity = Math.max(0, 1 - t)
    s.scale.set(ud.startSize*(1 - t*0.5), ud.startSize*(1.6 - t*1.2), 1)
  }

  // update sparks
  for(const m of sparkPool){
    if(!m.visible) continue
    const ud = m.userData
    ud.age += dt
    if(ud.age >= ud.life){ m.visible=false; continue }
    m.position.addScaledVector(ud.vel, dt)
    ud.vel.multiplyScalar(0.97); ud.vel.y += 20*dt
  }
}
