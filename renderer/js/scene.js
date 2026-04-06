import * as THREE from './three.module.min.js'
import { createPlotGrid } from './terrain.js'

const FARM_WIDTH = 80
const FARM_DEPTH = 80

let scene, camera, renderer
let terrainData = null
let sunLight = null
let ambientLight = null

// Orthographic frustum size (vertical extent in world units)
let frustumSize = 45

function initScene (canvasEl) {
  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb) // sky blue

  // Use clientWidth/Height — window.innerWidth/Height may be 0 in WebView at init time
  const initW = canvasEl.parentElement
    ? canvasEl.parentElement.clientWidth || document.documentElement.clientWidth
    : document.documentElement.clientWidth
  const initH = canvasEl.parentElement
    ? canvasEl.parentElement.clientHeight || document.documentElement.clientHeight
    : document.documentElement.clientHeight
  console.log('[scene] initScene canvas parent size:', initW, 'x', initH,
    '| canvas clientSize:', canvasEl.clientWidth, 'x', canvasEl.clientHeight)

  // Orthographic Camera - pure top-down
  const aspect = initW / initH || 1
  camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    200
  )
  camera.position.set(0, 50, 0)
  camera.lookAt(0, 0, 0)
  camera.up.set(0, 0, -1) // ensure consistent orientation for top-down

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true })
  renderer.setSize(initW || 800, initH || 600)
  renderer.setPixelRatio(window.devicePixelRatio)
  // No shadow maps for top-down view
  renderer.shadowMap.enabled = false
  console.log('[scene] renderer created, drawingBuffer:', renderer.domElement.width, 'x', renderer.domElement.height)

  // Ambient light (primary illumination for top-down)
  ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
  scene.add(ambientLight)

  // Directional light from directly above (subtle shading)
  sunLight = new THREE.DirectionalLight(0xffffff, 0.5)
  sunLight.position.set(0, 50, 0)
  sunLight.castShadow = false
  scene.add(sunLight)

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
  scene.add(outerTerrain)

  // Create plot grid (replaces old GridHelper + flat terrain)
  terrainData = createPlotGrid(scene)

  // Decorative border trees (flat circles from above)
  _addBorderTrees(scene)

  // Handle resize (update orthographic frustum)
  window.addEventListener('resize', () => {
    const w = document.documentElement.clientWidth
    const h = document.documentElement.clientHeight
    const newAspect = w / h || 1
    camera.left = -frustumSize * newAspect / 2
    camera.right = frustumSize * newAspect / 2
    camera.top = frustumSize / 2
    camera.bottom = -frustumSize / 2
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })

  // ResizeObserver: update renderer when canvas is actually laid out (WebView compat)
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          console.log('[scene] ResizeObserver fired:', width, 'x', height)
          const newAspect = width / height
          camera.left = -frustumSize * newAspect / 2
          camera.right = frustumSize * newAspect / 2
          camera.top = frustumSize / 2
          camera.bottom = -frustumSize / 2
          camera.updateProjectionMatrix()
          renderer.setSize(width, height)
          renderer.render(scene, camera)
        }
      }
    })
    ro.observe(canvasEl)
  }

  // Force one frame immediately so the canvas isn't blank if the loop hasn't started
  renderer.render(scene, camera)

  return { scene, camera, renderer, terrainData, sunLight, ambientLight, hemiLight: null }
}

function _addBorderTrees (scene) {
  const treePositions = [
    [-24, -24], [-24, 0], [-24, 24],
    [24, -24], [24, 0], [24, 24],
    [-12, -25], [0, -25], [12, -25],
    [-12, 25], [0, 25], [12, 25]
  ]

  for (const [x, z] of treePositions) {
    // Flat circle representing tree canopy from above
    const canopyR = 1.2 + Math.random() * 0.8
    const canopyGeo = new THREE.CircleGeometry(canopyR, 16)
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x2d7a1e + Math.floor(Math.random() * 0x101010)
    })
    const canopy = new THREE.Mesh(canopyGeo, canopyMat)
    canopy.rotation.x = -Math.PI / 2
    canopy.position.set(
      x + (Math.random() - 0.5) * 2,
      0.02,
      z + (Math.random() - 0.5) * 2
    )
    scene.add(canopy)
  }
}

function animate () {
  renderer.render(scene, camera)
}

function getSunLight () { return sunLight }
function getAmbientLight () { return ambientLight }
function getHemiLight () { return null }
function getFrustumSize () { return frustumSize }
function setFrustumSize (size) {
  frustumSize = size
  const aspect = (document.documentElement.clientWidth / document.documentElement.clientHeight) || 1
  camera.left = -frustumSize * aspect / 2
  camera.right = frustumSize * aspect / 2
  camera.top = frustumSize / 2
  camera.bottom = -frustumSize / 2
  camera.updateProjectionMatrix()
}

// Export to window for non-module scripts and as ES module
window.SceneManager = { initScene, animate, getScene: () => scene, getCamera: () => camera, getTerrainData: () => terrainData, getSunLight, getAmbientLight, getHemiLight, getFrustumSize, setFrustumSize }
export { initScene, animate, scene, camera, renderer, getSunLight, getAmbientLight, getHemiLight, getFrustumSize, setFrustumSize }
