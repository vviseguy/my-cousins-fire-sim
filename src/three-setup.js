// Three.js setup, camera, lights, renderer
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js'

export { THREE }

let renderer, scene, camera
let containerEl

export function initThree(){
  containerEl = document.getElementById('scene')
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b0b0b)

  const w = containerEl.clientWidth || 800
  const h = containerEl.clientHeight || 600
  camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 3000)
  camera.position.set(220, 180, 260)
  camera.lookAt(0, 60, 0)

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(w, h)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  containerEl.appendChild(renderer.domElement)
  // position renderer canvas behind 2D overlay
  const el = renderer.domElement
  el.style.position = 'absolute'
  el.style.left = '0'
  el.style.top = '0'
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.zIndex = '0'

  // Lights
  const hemi = new THREE.HemisphereLight(0xfff0e0, 0x081018, 0.4)
  scene.add(hemi)
  const dir = new THREE.DirectionalLight(0xffffff, 0.15)
  dir.position.set(200,400,150)
  scene.add(dir)

  // Ground (dark)
  const groundGeo = new THREE.CircleGeometry(600, 48)
  const groundMat = new THREE.MeshStandardMaterial({ color:0x1a120e, roughness:1, metalness:0 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI/2
  ground.position.y = 0
  scene.add(ground)

  return { renderer, scene, camera }
}

export function resizeThree(){
  if(!renderer || !camera || !containerEl) return
  const w = containerEl.clientWidth || 800
  const h = containerEl.clientHeight || 600
  renderer.setSize(w, h)
  camera.aspect = w/h
  camera.updateProjectionMatrix()
}

export function renderThree(){ renderer.render(scene, camera) }
