import { THREE, initThree, resizeThree, renderThree } from './three-setup.js'
import { state } from './state.js'
import { clamp, rand } from './math.js'

let three
let logGeo
let logMat
let logs3d = []
let heatPoint // emissive light near fire base

export function initLogs3D(){
  three = initThree()
  const { scene } = three

  // Simple log geometry: rounded box (capsule-like)
  const radius = 6
  const length = 60
  const cylGeo = new THREE.CapsuleGeometry(radius, length, 8, 16)
  logGeo = cylGeo
  logMat = new THREE.MeshStandardMaterial({ color:0x6b4329, roughness:0.9, metalness:0, emissive:0x000000 })

  heatPoint = new THREE.PointLight(0xffaa55, 0.0, 500, 2)
  heatPoint.position.set(0, 30, 0)
  scene.add(heatPoint)

  window.addEventListener('resize', resizeThree)
}

export function addLog3D(){
  const { scene } = three
  const mesh = new THREE.Mesh(logGeo, logMat.clone())
  mesh.castShadow = false
  mesh.receiveShadow = false
  // stable jitter baked per-log
  const seed = Math.random()
  const jx = (seed*2-1) * 6
  const jy = (seed*1.37%1*2-1) * 2
  const jz = (seed*2.41%1*2-1) * 6
  const jyaw = (seed*1.91%1-0.5) * 0.08
  const entry = { mesh, temp: 30 + Math.random()*10, moisture: 0.1 + Math.random()*0.1, burning:false, ember:0, row:0, jx, jy, jz, jyaw }
  scene.add(mesh)
  logs3d.push(entry)
  if(logs3d.length>60){ const old = logs3d.shift(); scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose() }
}

export function layoutLogs3D(){
  // place in rows like 2D version but with Z staggering to form a pile
  const maxPerRow = 5
  const spacingX = 0.8 * 60 // relates to geometry length
  const spacingZ = 18
  for(let i=0;i<logs3d.length;i++){
    const row = Math.floor(i/maxPerRow)
    const col = i%maxPerRow
    const countInRow = Math.min(maxPerRow, logs3d.length - row*maxPerRow)
    const center = (countInRow-1)/2
    const L = logs3d[i]
    const x = (col-center)*spacingX + (L.jx||0)
    const y = 30 + row*12 + (L.jy||0)
    const z = (row%2===0? -spacingZ : spacingZ) + (L.jz||0)
    const yaw = (row%2===0? (-15+col*6) : (15-col*6)) * Math.PI/180 + (L.jyaw||0)
    L.mesh.position.set(x, y, z)
    L.mesh.rotation.set(0, yaw, 0)
    L.row = row
  }
}

export function updateThermal3D(dt){
  // simple thermal coupling similar to 2D but adjusted for distance to heatPoint
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

  // heat from fire core
  for(const l of logs3d){
    const d = l.mesh.position.distanceTo(heatPoint.position)
    const gain = baseHeat * state.intensity * Math.exp(-(d*d)/(2*sigmaR*sigmaR)) * (1 - 0.1*l.row)
    l.temp += gain * dt
    // cooling to air
    l.temp -= (l.temp - airTemp) * k_air * dt

    // burning adds ember
    if(l.burning){ l.temp += 55*dt; l.ember = Math.min(1, l.ember + dt*0.12) }
    else if(l.temp>igniteTemp && l.moisture<0.12 && Math.random()<0.12*dt){ l.burning = true }

    // color/emissive feedback
    const glow = clamp((l.temp-120)/240)
    const mat = l.mesh.material
    mat.color.setHex(0x6b4329)
    mat.emissive.setRGB(0.8*glow, 0.3*glow, 0.05*glow)
    mat.emissiveIntensity = 1.5 * glow

    // approximate radiant contribution
    radiant += glow * k_rad * 0.2
  }

  // crude conduction among neighbors by proximity
  for(let i=0;i<logs3d.length;i++){
    const a = logs3d[i]
    for(let j=i+1;j<logs3d.length;j++){
      const b = logs3d[j]
      const d = a.mesh.position.distanceTo(b.mesh.position)
      if(d<90){ const flow = (a.temp-b.temp)*k_cond*dt*(1/Math.max(1, d/40)); a.temp-=flow; b.temp+=flow }
    }
  }

  return radiant
}

export function render3D(){
  renderThree()
}

export function getThree(){ return three }
