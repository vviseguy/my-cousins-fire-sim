import { THREE, initThree, resizeThree, renderThree } from './three-setup.js'
import { state } from './state.js'
import { clamp, rand } from './math.js'

let three
let logGeo
let logMat
let logs3d = []
let heatPoint // emissive light near fire base
let hotSpots = [] // positions for hot areas this frame

const G = 120 // gravity accel (units/s^2)
const RESTITUTION = 0.15
const GROUND_FRICTION = 0.85
const AIR_DAMPING = 0.995

export function initLogs3D(){
  three = initThree()
  const { scene } = three

  // Simple log geometry: capsule (axis along Y)
  const radius = 6
  const length = 60
  const cylGeo = new THREE.CapsuleGeometry(radius, length, 8, 16)
  logGeo = cylGeo
  logMat = new THREE.MeshStandardMaterial({ color:0x6b4329, roughness:0.9, metalness:0, emissive:0x000000 })

  heatPoint = new THREE.PointLight(0xffaa55, 0.0, 500, 2)
  heatPoint.position.set(0, 12, 0)
  scene.add(heatPoint)

  window.addEventListener('resize', resizeThree)
}

export function addLog3D(kind='log'){
  const { scene } = three
  const mesh = new THREE.Mesh(logGeo, logMat.clone())
  mesh.castShadow = false
  mesh.receiveShadow = false
  // rotate to lie horizontally along X (capsule axis Y -> world X)
  mesh.rotation.z = Math.PI/2

  // stable jitter baked per-log
  const seed = Math.random()
  const jx = (seed*2-1) * 6
  const jy = (seed*1.37%1*2-1) * 2
  const jz = (seed*2.41%1*2-1) * 6
  const jyaw = (seed*1.91%1-0.5) * 0.08

  // scale by kind: adjust radius (X/Z) and length (Y before rotation)
  const radScale = kind==='tinder'? 0.35 : kind==='kindling'? 0.6 : 1
  const lenScale = kind==='tinder'? 0.45 : kind==='kindling'? 0.7 : 1
  mesh.scale.set(radScale, lenScale, radScale)

  // physics state
  const pos = new THREE.Vector3(rand(-40,40)+jx, rand(120,180), rand(-40,40)+jz)
  const vel = new THREE.Vector3(rand(-10,10), rand(-10,0), rand(-10,10))
  let yaw = jyaw
  let angVel = rand(-0.6,0.6)
  const radiusWorld = 6 * radScale

  const entry = { mesh, temp: 30 + Math.random()*10, moisture: 0.1 + Math.random()*0.1, burning:false, ember:0, row:0, jx, jy, jz, jyaw, kind, pos, vel, yaw, angVel, radiusWorld }
  mesh.position.copy(pos)
  mesh.rotation.set(0, yaw, Math.PI/2)

  scene.add(mesh)
  logs3d.push(entry)
  if(logs3d.length>60){ const old = logs3d.shift(); scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose() }
}

export function updatePhysics3D(dt){
  if(!dt) return
  // integrate
  for(const l of logs3d){
    // gravity
    l.vel.y -= G * dt
    // integrate pos/orientation
    l.pos.addScaledVector(l.vel, dt)
    l.yaw += l.angVel * dt

    // ground collision (plane y=0)
    const minY = l.radiusWorld
    if(l.pos.y < minY){
      l.pos.y = minY
      if(l.vel.y < 0) l.vel.y = -l.vel.y * RESTITUTION
      l.vel.x *= GROUND_FRICTION
      l.vel.z *= GROUND_FRICTION
      l.angVel *= GROUND_FRICTION
    }

    // air damping
    l.vel.multiplyScalar(AIR_DAMPING)
    l.angVel *= 0.992
  }

  // pairwise sphere collisions (center spheres)
  for(let i=0;i<logs3d.length;i++){
    const a = logs3d[i]
    for(let j=i+1;j<logs3d.length;j++){
      const b = logs3d[j]
      const dx = b.pos.x - a.pos.x
      const dy = b.pos.y - a.pos.y
      const dz = b.pos.z - a.pos.z
      const dist2 = dx*dx+dy*dy+dz*dz
      const minDist = a.radiusWorld + b.radiusWorld
      if(dist2 > 0 && dist2 < minDist*minDist){
        const dist = Math.sqrt(dist2)
        const nx = dx/dist, ny = dy/dist, nz = dz/dist
        const pen = (minDist - dist)
        // separate
        const corr = pen * 0.5
        a.pos.x -= nx * corr; a.pos.y -= ny * corr; a.pos.z -= nz * corr
        b.pos.x += nx * corr; b.pos.y += ny * corr; b.pos.z += nz * corr
        // velocity along normal
        const relVx = b.vel.x - a.vel.x
        const relVy = b.vel.y - a.vel.y
        const relVz = b.vel.z - a.vel.z
        const relN = relVx*nx + relVy*ny + relVz*nz
        if(relN < 0){
          const impulse = -(1+RESTITUTION) * relN * 0.5
          a.vel.x -= nx * impulse; a.vel.y -= ny * impulse; a.vel.z -= nz * impulse
          b.vel.x += nx * impulse; b.vel.y += ny * impulse; b.vel.z += nz * impulse
        }
      }
    }
  }

  // write back to meshes
  for(const l of logs3d){
    l.mesh.position.copy(l.pos)
    l.mesh.rotation.set(0, l.yaw, Math.PI/2)
  }
}

export function updateThermal3D(dt){
  const baseHeat = 140
  const sigmaR = 120
  const airTemp = 22
  const k_air = 0.7
  const k_cond = 0.5
  const k_rad = 1.5
  const igniteTemp = 280

  // animate emissive light with intensity
  heatPoint.intensity = 1.2 * state.intensity

  let radiant = 0
  hotSpots.length = 0

  for(const l of logs3d){
    const d = l.mesh.position.distanceTo(heatPoint.position)
    const gain = baseHeat * state.intensity * Math.exp(-(d*d)/(2*sigmaR*sigmaR))
    l.temp += gain * dt
    l.temp -= (l.temp - airTemp) * k_air * dt

    if(l.burning){ l.temp += 55*dt; l.ember = Math.min(1, l.ember + dt*0.12) }
    else if(l.temp>igniteTemp && l.moisture<0.12 && Math.random()<0.12*dt){ l.burning = true }

    const glow = clamp((l.temp-120)/240)
    const mat = l.mesh.material
    mat.color.setHex(0x6b4329)
    mat.emissive.setRGB(0.8*glow, 0.3*glow, 0.05*glow)
    mat.emissiveIntensity = 1.5 * glow

    // push hot spot slightly above log center
    if(glow > 0.25 || l.burning){
      hotSpots.push(new THREE.Vector3(l.mesh.position.x, l.mesh.position.y + (8 + 8*glow), l.mesh.position.z))
    }

    radiant += glow * k_rad * 0.2
  }

  // conduction
  for(let i=0;i<logs3d.length;i++){
    const a = logs3d[i]
    for(let j=i+1;j<logs3d.length;j++){
      const b = logs3d[j]
      const d = a.mesh.position.distanceTo(b.mesh.position)
      if(d<90){ const flow = (a.temp-b.temp)*0.5*dt*(1/Math.max(1, d/40)); a.temp-=flow; b.temp+=flow }
    }
  }

  return radiant
}

export function getHotSpots(){ return hotSpots }

export function render3D(){
  renderThree()
}

export function getThree(){ return three }
