import * as THREE from './three.module.min.js'

const GRID_COLS = 20
const GRID_ROWS = 20
const PLOT_SIZE = 2
const GRID_OFFSET_X = -(GRID_COLS * PLOT_SIZE) / 2 + PLOT_SIZE / 2
const GRID_OFFSET_Z = -(GRID_ROWS * PLOT_SIZE) / 2 + PLOT_SIZE / 2

const PLOT_STATES = {
  GRASS: 'grass',
  PLOWED: 'plowed',
  PLANTED: 'planted'
}

const COLORS = {
  grass: 0x4a7c2e,
  grassAlt: 0x3f7028,
  plowed: 0x6b4226,
  plowedDark: 0x5a3520,
  path: 0xc2a66e
}

let plotGrid = []
let plotMeshes = []
let raycaster = null
let scene = null

/**
 * Create the entire farm plot grid
 * @param {THREE.Scene} sceneRef
 * @returns {object} { plots, getPlotAt, setPlotState, getPlotFromIntersect }
 */
function createPlotGrid (sceneRef) {
  scene = sceneRef
  raycaster = new THREE.Raycaster()
  plotGrid = []
  plotMeshes = []

  // Base terrain (larger than grid)
  const terrainGeo = new THREE.PlaneGeometry(90, 90)
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x3d6b24,
    roughness: 0.95,
    metalness: 0.0
  })
  const terrain = new THREE.Mesh(terrainGeo, terrainMat)
  terrain.rotation.x = -Math.PI / 2
  terrain.position.y = -0.05
  terrain.receiveShadow = true
  terrain.name = 'baseTerrain'
  scene.add(terrain)

  // Path borders around farm
  _createPaths(scene)

  // Create individual plot meshes
  for (let row = 0; row < GRID_ROWS; row++) {
    plotGrid[row] = []
    for (let col = 0; col < GRID_COLS; col++) {
      const x = GRID_OFFSET_X + col * PLOT_SIZE
      const z = GRID_OFFSET_Z + row * PLOT_SIZE

      // Plot tile mesh
      const plotGeo = new THREE.BoxGeometry(PLOT_SIZE - 0.08, 0.08, PLOT_SIZE - 0.08)
      const plotMat = new THREE.MeshStandardMaterial({
        color: (row + col) % 2 === 0 ? COLORS.grass : COLORS.grassAlt,
        roughness: 0.9,
        metalness: 0.0
      })
      const plotMesh = new THREE.Mesh(plotGeo, plotMat)
      plotMesh.position.set(x, 0.04, z)
      plotMesh.receiveShadow = true
      plotMesh.userData.row = row
      plotMesh.userData.col = col
      plotMesh.userData.isPlot = true
      scene.add(plotMesh)
      plotMeshes.push(plotMesh)

      plotGrid[row][col] = {
        row,
        col,
        state: PLOT_STATES.GRASS,
        mesh: plotMesh,
        crop: null,     // { type, plantedAt, watered, stage, withered, mesh, growthAccum }
        cropMesh: null,
        x,
        z
      }
    }
  }

  return {
    plots: plotGrid,
    getPlotAt,
    setPlotState,
    getPlotFromRaycast,
    getAllPlots,
    PLOT_STATES
  }
}

function _createPaths (scene) {
  const halfW = (GRID_COLS * PLOT_SIZE) / 2 + 1.5
  const halfD = (GRID_ROWS * PLOT_SIZE) / 2 + 1.5
  const pathWidth = 1.5

  const pathMat = new THREE.MeshStandardMaterial({
    color: COLORS.path,
    roughness: 0.85,
    metalness: 0.0
  })

  // Top/bottom paths
  for (const zSign of [-1, 1]) {
    const pathGeo = new THREE.BoxGeometry(halfW * 2 + pathWidth * 2, 0.06, pathWidth)
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.position.set(0, 0.01, zSign * halfD)
    path.receiveShadow = true
    scene.add(path)
  }

  // Left/right paths
  for (const xSign of [-1, 1]) {
    const pathGeo = new THREE.BoxGeometry(pathWidth, 0.06, halfD * 2 + pathWidth * 2)
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.position.set(xSign * halfW, 0.01, 0)
    path.receiveShadow = true
    scene.add(path)
  }

  // Corner fence posts
  for (const xSign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6)
      const postMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c })
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(xSign * halfW, 0.6, zSign * halfD)
      post.castShadow = true
      scene.add(post)
    }
  }
}

/**
 * Get plot at grid coordinates
 */
function getPlotAt (row, col) {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null
  return plotGrid[row][col]
}

/**
 * Get all plots as a flat array
 */
function getAllPlots () {
  const all = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      all.push(plotGrid[row][col])
    }
  }
  return all
}

/**
 * Set plot visual state
 */
function setPlotState (row, col, state) {
  const plot = getPlotAt(row, col)
  if (!plot) return

  plot.state = state

  switch (state) {
    case PLOT_STATES.GRASS:
      plot.mesh.material.color.setHex((row + col) % 2 === 0 ? COLORS.grass : COLORS.grassAlt)
      // Remove furrow lines if any
      _removeFurrows(plot)
      break

    case PLOT_STATES.PLOWED:
    case PLOT_STATES.PLANTED:
      plot.mesh.material.color.setHex(COLORS.plowed)
      // Add furrow detail lines
      _addFurrows(plot)
      break
  }
}

function _addFurrows (plot) {
  if (plot._furrows) return
  const furrows = new THREE.Group()
  const furrowMat = new THREE.MeshStandardMaterial({ color: COLORS.plowedDark })

  for (let i = 0; i < 4; i++) {
    const fGeo = new THREE.BoxGeometry(PLOT_SIZE - 0.3, 0.03, 0.06)
    const f = new THREE.Mesh(fGeo, furrowMat)
    f.position.set(plot.x, 0.1, plot.z - 0.6 + i * 0.4)
    scene.add(f)
    furrows.add(f)
  }
  plot._furrows = furrows
}

function _removeFurrows (plot) {
  if (!plot._furrows) return
  plot._furrows.children.forEach(f => scene.remove(f))
  plot._furrows = null
}

/**
 * Raycast from mouse position to find clicked plot
 * @param {THREE.Vector2} mouseNDC - normalized device coordinates (-1 to 1)
 * @param {THREE.Camera} camera
 * @returns {object|null} plot data or null
 */
function getPlotFromRaycast (mouseNDC, camera) {
  raycaster.setFromCamera(mouseNDC, camera)
  const intersects = raycaster.intersectObjects(plotMeshes)

  if (intersects.length > 0) {
    const hit = intersects[0].object
    if (hit.userData.isPlot) {
      return getPlotAt(hit.userData.row, hit.userData.col)
    }
  }
  return null
}

window.TerrainSystem = { createPlotGrid, PLOT_STATES }
export { createPlotGrid, PLOT_STATES, getPlotAt, getPlotFromRaycast, getAllPlots }
