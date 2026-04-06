import * as THREE from './three.module.min.js'
import { createPlotGrid } from './terrain.js'

const FARM_WIDTH = 80
const FARM_DEPTH = 80

let scene, camera, renderer
let terrainData = null
let sunLight = null
let ambientLight = null
let hemiLight = null

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
  sunLight = new THREE.DirectionalLight(0xffffff, 1.2)
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
  ambientLight = new THREE.AmbientLight(0x404040, 0.6)
  scene.add(ambientLight)

  // Hemisphere light for sky/ground color blend
  hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4)
  scene.add(hemiLight)

  // Outer terrain beyond farm (decorative)
  const outerGeo = new THREE.PlaneGeometry(200, 200)
  const outerMat = new THREE.MeshStandardMaterial({
    color: 0x3a6520,
    roughness: 0.95,
    metalness: 0.0
  })
  const outerTerrain = new THREE.Mesh(outerGeo, outerMat)
  outerTerrain.rotation.x = -Math.PI / 2
  outerTerrain.position.y = -0.1
  outerTerrain.receiveShadow = true
  scene.add(outerTerrain)

  // Create plot grid (replaces old GridHelper + flat terrain)
  terrainData = createPlotGrid(scene)

  // Decorative trees around the farm border
  _addBorderTrees(scene)

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  return { scene, camera, renderer, terrainData, sunLight, ambientLight, hemiLight }
}

function _addBorderTrees (scene) {
  const treePositions = [
    [-24, -24], [-24, 0], [-24, 24],
    [24, -24], [24, 0], [24, 24],
    [-12, -25], [0, -25], [12, -25],
    [-12, 25], [0, 25], [12, 25]
  ]

  for (const [x, z] of treePositions) {
    const tree = new THREE.Group()

    // Trunk
    const trunkH = 2 + Math.random() * 1.5
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, trunkH, 6)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c })
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = trunkH / 2
    trunk.castShadow = true
    tree.add(trunk)

    // Canopy
    const canopyR = 1.2 + Math.random() * 0.8
    const canopyGeo = new THREE.SphereGeometry(canopyR, 8, 6)
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x2d7a1e + Math.floor(Math.random() * 0x101010)
    })
    const canopy = new THREE.Mesh(canopyGeo, canopyMat)
    canopy.position.y = trunkH + canopyR * 0.5
    canopy.castShadow = true
    tree.add(canopy)

    tree.position.set(x + (Math.random() - 0.5) * 2, 0, z + (Math.random() - 0.5) * 2)
    scene.add(tree)
  }
}

function animate () {
  renderer.render(scene, camera)
}

function getSunLight () { return sunLight }
function getAmbientLight () { return ambientLight }
function getHemiLight () { return hemiLight }

// Export to window for non-module scripts and as ES module
window.SceneManager = { initScene, animate, getScene: () => scene, getCamera: () => camera, getTerrainData: () => terrainData, getSunLight, getAmbientLight, getHemiLight }
export { initScene, animate, scene, camera, renderer, getSunLight, getAmbientLight, getHemiLight }
