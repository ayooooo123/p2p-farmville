import * as THREE from './three.module.min.js'
import { createPlotGrid } from './terrain.js'

const FARM_WIDTH = 80
const FARM_DEPTH = 80

let scene, camera, renderer
let terrainData = null
let sunLight = null
let ambientLight = null
let resizeObserver = null
let viewportWidth = 1
let viewportHeight = 1

// Orthographic frustum size (vertical extent in world units)
let frustumSize = 45

function initScene (canvasEl) {
  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb) // sky blue

  // Use clientWidth/Height — window.innerWidth/Height may be 0 in WebView at init time
  const initW = canvasEl.parentElement
    ? canvasEl.parentElement.clientWidth || window.innerWidth || document.documentElement.clientWidth
    : window.innerWidth || document.documentElement.clientWidth
  const initH = canvasEl.parentElement
    ? canvasEl.parentElement.clientHeight || window.innerHeight || document.documentElement.clientHeight
    : window.innerHeight || document.documentElement.clientHeight
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
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(initW || 800, initH || 600, false)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  console.log('[scene] renderer created, drawingBuffer:', renderer.domElement.width, 'x', renderer.domElement.height)

  // Ambient light — safer intensity to avoid flattening or black-screen artifacts
  ambientLight = new THREE.AmbientLight(0xffeedd, 0.8)
  scene.add(ambientLight)

  // Directional sun light — safer intensity for stable visibility
  sunLight = new THREE.DirectionalLight(0xffffff, 1.0)
  sunLight.position.set(30, 50, -20)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(1024, 1024)
  sunLight.shadow.camera.left = -60
  sunLight.shadow.camera.right = 60
  sunLight.shadow.camera.top = 60
  sunLight.shadow.camera.bottom = -60
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 200
  sunLight.shadow.normalBias = 0.01
  sunLight.target.position.set(0, 0, 0)
  scene.add(sunLight)
  scene.add(sunLight.target)

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

  // Decorative border trees (flat circles from above)
  _addBorderTrees(scene)

  const applySize = (width, height) => {
    const safeWidth = width > 0 ? width : (window.innerWidth || document.documentElement.clientWidth || 1)
    const safeHeight = height > 0 ? height : (window.innerHeight || document.documentElement.clientHeight || 1)
    viewportWidth = safeWidth
    viewportHeight = safeHeight
    const newAspect = safeWidth / safeHeight || 1
    camera.left = -frustumSize * newAspect / 2
    camera.right = frustumSize * newAspect / 2
    camera.top = frustumSize / 2
    camera.bottom = -frustumSize / 2
    camera.updateProjectionMatrix()
    renderer.setSize(safeWidth, safeHeight, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
  }

  // Handle resize (update orthographic frustum)
  window.addEventListener('resize', () => {
    const w = canvasEl.parentElement
      ? canvasEl.parentElement.clientWidth || window.innerWidth || document.documentElement.clientWidth
      : window.innerWidth || document.documentElement.clientWidth
    const h = canvasEl.parentElement
      ? canvasEl.parentElement.clientHeight || window.innerHeight || document.documentElement.clientHeight
      : window.innerHeight || document.documentElement.clientHeight
    applySize(w, h)
  })

  // ResizeObserver: update renderer when the renderer container is laid out (WebView compat)
  if (typeof ResizeObserver !== 'undefined') {
    const resizeTarget = canvasEl.parentElement || document.documentElement
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          console.log('[scene] ResizeObserver fired:', width, 'x', height)
          applySize(width, height)
          renderer.render(scene, camera)
        }
      }
    })
    resizeObserver.observe(resizeTarget)
  }

  applySize(initW || 800, initH || 600)

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
    // 3D border tree: cylinder trunk + sphere canopy
    const canopyR = 1.2 + Math.random() * 0.8
    const trunkH = 1.0 + Math.random() * 0.4
    const trunkR = 0.16

    const treeGroup = new THREE.Group()
    const px = x + (Math.random() - 0.5) * 2
    const pz = z + (Math.random() - 0.5) * 2
    treeGroup.position.set(px, 0, pz)

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(trunkR, trunkR * 1.2, trunkH, 7)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9, metalness: 0 })
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = trunkH / 2
    trunk.castShadow = true
    trunk.receiveShadow = true
    treeGroup.add(trunk)

    // Canopy sphere
    const canopyColor = 0x2d7a1e + Math.floor(Math.random() * 0x101010)
    const sphereGeo = new THREE.SphereGeometry(canopyR, 10, 8)
    const sphereMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.85, metalness: 0 })
    const canopy = new THREE.Mesh(sphereGeo, sphereMat)
    canopy.position.y = trunkH + canopyR * 0.65
    canopy.castShadow = true
    canopy.receiveShadow = true
    treeGroup.add(canopy)

    scene.add(treeGroup)
  }
}

function animate () {
  updateCamera()
  renderer.render(scene, camera)
}

function getSunLight () { return sunLight }
function getAmbientLight () { return ambientLight }
function getHemiLight () { return null }
function getFrustumSize () { return frustumSize }
function setFrustumSize (size) {
  frustumSize = size
  const aspect = (viewportWidth > 0 && viewportHeight > 0)
    ? viewportWidth / viewportHeight
    : ((window.innerWidth || document.documentElement.clientWidth || 1) / (window.innerHeight || document.documentElement.clientHeight || 1))
  camera.left = -frustumSize * aspect / 2
  camera.right = frustumSize * aspect / 2
  camera.top = frustumSize / 2
  camera.bottom = -frustumSize / 2
  camera.updateProjectionMatrix()
}

// ─��� Camera controls (pan + zoom) ─────────────────────────────────────────────
const camState = {
  targetFrustum: 45,
  targetX: 0,
  targetZ: 0,
  panning: false,
  panStartX: 0,
  panStartZ: 0,
  panMouseX: 0,
  panMouseZ: 0,
  didPan: false
}

const CAM_MIN_FRUSTUM = 10
const CAM_MAX_FRUSTUM = 80
const CAM_CLAMP = 60
const CAM_LERP = 0.15

function initCameraControls (canvasEl) {
  // Scroll to zoom
  canvasEl.addEventListener('wheel', (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 5 : -5
    camState.targetFrustum = Math.max(CAM_MIN_FRUSTUM, Math.min(CAM_MAX_FRUSTUM, camState.targetFrustum + delta))
  }, { passive: false })

  // Middle or right mouse to pan
  canvasEl.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2) {
      camState.panning = true
      camState.didPan = false
      camState.panMouseX = e.clientX
      camState.panMouseZ = e.clientY
      camState.panStartX = camState.targetX
      camState.panStartZ = camState.targetZ
      e.preventDefault()
    }
  })

  window.addEventListener('mousemove', (e) => {
    if (!camState.panning) return
    const rect = canvasEl.getBoundingClientRect()
    const dx = (e.clientX - camState.panMouseX) / rect.height * frustumSize * -1
    const dz = (e.clientY - camState.panMouseZ) / rect.height * frustumSize
    camState.targetX = Math.max(-CAM_CLAMP, Math.min(CAM_CLAMP, camState.panStartX + dx))
    camState.targetZ = Math.max(-CAM_CLAMP, Math.min(CAM_CLAMP, camState.panStartZ + dz))
    if (Math.abs(dx) > 1 || Math.abs(dz) > 1) camState.didPan = true
  })

  window.addEventListener('mouseup', (e) => {
    if (e.button === 1 || e.button === 2) camState.panning = false
  })

  // Suppress context menu only if we actually panned
  canvasEl.addEventListener('contextmenu', (e) => {
    if (camState.didPan) { e.preventDefault(); camState.didPan = false }
  })
}

function updateCamera () {
  if (!camera) return
  // Lerp frustum size
  if (Math.abs(frustumSize - camState.targetFrustum) > 0.01) {
    frustumSize += (camState.targetFrustum - frustumSize) * CAM_LERP
    const aspect = (viewportWidth > 0 && viewportHeight > 0)
      ? viewportWidth / viewportHeight
      : ((window.innerWidth || document.documentElement.clientWidth || 1) / (window.innerHeight || document.documentElement.clientHeight || 1))
    camera.left   = -frustumSize * aspect / 2
    camera.right  =  frustumSize * aspect / 2
    camera.top    =  frustumSize / 2
    camera.bottom = -frustumSize / 2
    camera.updateProjectionMatrix()
  }
  // Lerp pan
  const tx = camState.targetX
  const tz = camState.targetZ
  camera.position.x += (tx - camera.position.x) * CAM_LERP
  camera.position.z += (tz - camera.position.z) * CAM_LERP
}

function resetCamera () {
  camState.targetFrustum = 45
  camState.targetX = 0
  camState.targetZ = 0
}

function getCameraOffset () {
  return { x: camera.position.x, z: camera.position.z }
}

// Export to window for non-module scripts and as ES module
window.SceneManager = { initScene, animate, getScene: () => scene, getCamera: () => camera, getTerrainData: () => terrainData, getSunLight, getAmbientLight, getHemiLight, getFrustumSize, setFrustumSize, initCameraControls, updateCamera, resetCamera, getCameraOffset }
export { initScene, animate, scene, camera, renderer, getSunLight, getAmbientLight, getHemiLight, getFrustumSize, setFrustumSize, initCameraControls, updateCamera, resetCamera, getCameraOffset }
