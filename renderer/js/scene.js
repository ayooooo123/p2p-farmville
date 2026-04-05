import * as THREE from './three.module.min.js'

const FARM_WIDTH = 80
const FARM_DEPTH = 80

let scene, camera, renderer

function initScene (canvasEl) {
  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb) // sky blue
  scene.fog = new THREE.Fog(0x87ceeb, 80, 200)

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)
  camera.position.set(0, 20, 25)
  camera.lookAt(0, 0, 0)

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // Directional light (sun)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.2)
  sunLight.position.set(30, 50, 30)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 150
  sunLight.shadow.camera.left = -60
  sunLight.shadow.camera.right = 60
  sunLight.shadow.camera.top = 60
  sunLight.shadow.camera.bottom = -60
  scene.add(sunLight)

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)

  // Hemisphere light for sky/ground color blend
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4)
  scene.add(hemiLight)

  // Terrain (green plane)
  const terrainGeo = new THREE.PlaneGeometry(FARM_WIDTH, FARM_DEPTH)
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x4a7c2e,
    roughness: 0.9,
    metalness: 0.0
  })
  const terrain = new THREE.Mesh(terrainGeo, terrainMat)
  terrain.rotation.x = -Math.PI / 2
  terrain.receiveShadow = true
  scene.add(terrain)

  // Grid overlay (subtle farm plot grid)
  const gridHelper = new THREE.GridHelper(FARM_WIDTH, 20, 0x3a6c1e, 0x3a6c1e)
  gridHelper.position.y = 0.01
  gridHelper.material.opacity = 0.3
  gridHelper.material.transparent = true
  scene.add(gridHelper)

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  return { scene, camera, renderer }
}

function animate () {
  renderer.render(scene, camera)
}

// Export to window for non-module scripts and as ES module
window.SceneManager = { initScene, animate, getScene: () => scene, getCamera: () => camera }
export { initScene, animate, scene, camera, renderer }
