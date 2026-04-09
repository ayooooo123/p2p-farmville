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
  plowedWatered: 0x3d2510,      // darker, richer wet soil
  plowedWateredDark: 0x2e1b0a,  // furrow lines on wet soil
  path: 0xc2a66e
}

// ── Canvas-generated textures ─────────────────────────────────────────────────
let grassTexEven = null  // shared CanvasTexture for (row+col)%2===0 plots
let grassTexOdd  = null  // shared CanvasTexture for (row+col)%2===1 plots
let soilTexDry   = null  // plowed dry soil texture
let soilTexWet   = null  // watered soil texture

function _hexToRgb (hex) {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff
  }
}

/**
 * Generate a canvas grass texture: sub-tile checkerboard of two greens + pixel noise.
 */
function _makeGrassTexture (col1Hex, col2Hex, size = 64) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const c1 = _hexToRgb(col1Hex)
  const c2 = _hexToRgb(col2Hex)

  // Fill base with col1
  ctx.fillStyle = `rgb(${c1.r},${c1.g},${c1.b})`
  ctx.fillRect(0, 0, size, size)

  // Draw 8x8 sub-tile checkerboard with col2
  const tileSize = size / 8
  ctx.fillStyle = `rgb(${c2.r},${c2.g},${c2.b})`
  for (let ty = 0; ty < 8; ty++) {
    for (let tx = 0; tx < 8; tx++) {
      if ((tx + ty) % 2 === 1) {
        ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize)
      }
    }
  }

  // Per-pixel noise for organic grass look
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 30
    data[i]     = Math.min(255, Math.max(0, data[i]     + n))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n))
  }
  ctx.putImageData(imageData, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

/**
 * Generate a canvas soil texture: earthy base + random dark clods + pixel noise.
 */
function _makeSoilTexture (baseHex, darkHex, size = 64) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const cb = _hexToRgb(baseHex)
  const cd = _hexToRgb(darkHex)

  // Fill base soil color
  ctx.fillStyle = `rgb(${cb.r},${cb.g},${cb.b})`
  ctx.fillRect(0, 0, size, size)

  // Random darker clod blotches
  ctx.fillStyle = `rgba(${cd.r},${cd.g},${cd.b},0.55)`
  for (let i = 0; i < 18; i++) {
    const rx = Math.random() * size
    const ry = Math.random() * size
    const rr = 1.5 + Math.random() * 3.5
    ctx.beginPath()
    ctx.ellipse(rx, ry, rr, rr * (0.6 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  // Per-pixel noise
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22
    data[i]     = Math.min(255, Math.max(0, data[i]     + n))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n))
  }
  ctx.putImageData(imageData, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

/**
 * Dispose old grass textures and create new ones for the given season palette.
 */
function _rebuildGrassTextures (primary, alt) {
  if (grassTexEven) grassTexEven.dispose()
  if (grassTexOdd)  grassTexOdd.dispose()
  grassTexEven = _makeGrassTexture(primary, alt)
  grassTexOdd  = _makeGrassTexture(alt, primary)
}

// Season grass palettes: [primary, alt, baseTerrain]
const SEASON_GRASS = {
  spring: [0x5aad2e, 0x4d9e26, 0x4d9426],   // bright spring green
  summer: [0x4a7c2e, 0x3f7028, 0x3d6b24],   // deep summer green (default)
  autumn: [0x7a7228, 0x6b621e, 0x5e5518],   // golden-brown harvest hues
  winter: [0x8ab0a0, 0x7da098, 0x6e9088]    // pale frosty green-grey
}

let currentSeason = 'summer'
let baseTerrainMesh = null  // ref to the large background plane

let plotGrid = []
let plotMeshes = []
let raycaster = null
let scene = null

// ── Hover highlight mesh ─────────────────────────────────────────────────────
let hoverHighlightMesh = null
const HIGHLIGHT_COLORS = {
  plow:    { color: 0xffa040, opacity: 0.35 },
  plant:   { color: 0x44ff88, opacity: 0.35 },
  water:   { color: 0x44aaff, opacity: 0.35 },
  harvest: { color: 0xffd700, opacity: 0.35 },
  remove:  { color: 0xff4444, opacity: 0.35 },
  default: { color: 0xffffff, opacity: 0.20 }
}

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

  // Build shared canvas textures
  _rebuildGrassTextures(COLORS.grass, COLORS.grassAlt)
  soilTexDry = _makeSoilTexture(0x6b4226, 0x4a2a14)
  soilTexWet = _makeSoilTexture(0x3d2510, 0x251508)

  // Base terrain (larger than grid) — canvas grass texture for rich background
  const terrainGeo = new THREE.PlaneGeometry(90, 90)
  const terrainBaseTex = _makeGrassTexture(0x3d6b24, 0x4a7c2e, 128)
  terrainBaseTex.repeat.set(14, 14)
  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainBaseTex,
    roughness: 0.95,
    metalness: 0.0
  })
  const terrain = new THREE.Mesh(terrainGeo, terrainMat)
  terrain.rotation.x = -Math.PI / 2
  terrain.position.y = -0.05
  terrain.name = 'baseTerrain'
  terrain.receiveShadow = true
  scene.add(terrain)
  baseTerrainMesh = terrain

  // Path borders around farm
  _createPaths(scene)

  // Create individual plot meshes (flat planes for top-down, with gap for grid lines)
  for (let row = 0; row < GRID_ROWS; row++) {
    plotGrid[row] = []
    for (let col = 0; col < GRID_COLS; col++) {
      const x = GRID_OFFSET_X + col * PLOT_SIZE
      const z = GRID_OFFSET_Z + row * PLOT_SIZE

      // Flat plane with slight gap for grid lines (0.08 gap = ~1px grid line at normal zoom)
      const plotGeo = new THREE.PlaneGeometry(PLOT_SIZE - 0.08, PLOT_SIZE - 0.08)
      const grassTex = (row + col) % 2 === 0 ? grassTexEven : grassTexOdd
      const plotMat = new THREE.MeshStandardMaterial({
        map: grassTex,
        roughness: 0.9,
        metalness: 0.0
      })
      const plotMesh = new THREE.Mesh(plotGeo, plotMat)
      plotMesh.rotation.x = -Math.PI / 2
      plotMesh.position.set(x, 0.01, z)
      plotMesh.userData.row = row
      plotMesh.userData.col = col
      plotMesh.userData.isPlot = true
      plotMesh.receiveShadow = true
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

  // Create a single hover highlight quad (hidden by default)
  const hlGeo = new THREE.PlaneGeometry(PLOT_SIZE - 0.04, PLOT_SIZE - 0.04)
  const hlMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  hoverHighlightMesh = new THREE.Mesh(hlGeo, hlMat)
  hoverHighlightMesh.rotation.x = -Math.PI / 2
  hoverHighlightMesh.position.y = 0.05
  hoverHighlightMesh.visible = false
  scene.add(hoverHighlightMesh)

  return {
    plots: plotGrid,
    getPlotAt,
    setPlotState,
    setPlotWatered,
    getPlotFromRaycast,
    getAllPlots,
    setSeasonColors,
    getCurrentSeason,
    setHoverHighlight,
    clearHoverHighlight,
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

  // Top/bottom paths (flat planes)
  for (const zSign of [-1, 1]) {
    const pathGeo = new THREE.PlaneGeometry(halfW * 2 + pathWidth * 2, pathWidth)
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.rotation.x = -Math.PI / 2
    path.position.set(0, 0.005, zSign * halfD)
    path.receiveShadow = true
    scene.add(path)
  }

  // Left/right paths (flat planes)
  for (const xSign of [-1, 1]) {
    const pathGeo = new THREE.PlaneGeometry(pathWidth, halfD * 2 + pathWidth * 2)
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.rotation.x = -Math.PI / 2
    path.position.set(xSign * halfW, 0.005, 0)
    path.receiveShadow = true
    scene.add(path)
  }

  // Corner posts as small circles from above
  for (const xSign of [-1, 1]) {
    for (const zSign of [-1, 1]) {
      const postGeo = new THREE.CircleGeometry(0.3, 8)
      const postMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c })
      const post = new THREE.Mesh(postGeo, postMat)
      post.rotation.x = -Math.PI / 2
      post.position.set(xSign * halfW, 0.02, zSign * halfD)
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
  const mat = plot.mesh.material

  switch (state) {
    case PLOT_STATES.GRASS:
      mat.map = (row + col) % 2 === 0 ? grassTexEven : grassTexOdd
      mat.color.setHex(0xffffff)
      mat.needsUpdate = true
      _removeFurrows(plot)
      break

    case PLOT_STATES.PLOWED:
    case PLOT_STATES.PLANTED:
      mat.map = soilTexDry
      mat.color.setHex(0xffffff)
      mat.needsUpdate = true
      _addFurrows(plot)
      break
  }
}

function _addFurrows (plot) {
  if (plot._furrows) return
  const furrows = new THREE.Group()
  const furrowMat = new THREE.MeshStandardMaterial({ color: COLORS.plowedDark })

  // Horizontal furrow lines (flat planes from top-down)
  for (let i = 0; i < 4; i++) {
    const fGeo = new THREE.PlaneGeometry(PLOT_SIZE - 0.3, 0.06)
    const f = new THREE.Mesh(fGeo, furrowMat)
    f.rotation.x = -Math.PI / 2
    f.position.set(plot.x, 0.02, plot.z - 0.6 + i * 0.4)
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
 * Update a plot's visual to reflect watered / dry state
 * Call this after plot.crop.watered is set or on load
 * @param {number} row
 * @param {number} col
 * @param {boolean} watered
 */
function setPlotWatered (row, col, watered) {
  const plot = getPlotAt(row, col)
  if (!plot) return

  const mat = plot.mesh.material
  if (watered) {
    // Darker wet soil canvas texture
    mat.map = soilTexWet
    mat.color.setHex(0xffffff)
    mat.needsUpdate = true
    // Darken furrow overlay lines too
    if (plot._furrows) {
      plot._furrows.children.forEach(f => {
        f.material.color.setHex(COLORS.plowedWateredDark)
      })
    }
  } else {
    // Dry soil canvas texture
    mat.map = soilTexDry
    mat.color.setHex(0xffffff)
    mat.needsUpdate = true
    if (plot._furrows) {
      plot._furrows.children.forEach(f => {
        f.material.color.setHex(COLORS.plowedDark)
      })
    }
  }
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

/**
 * Update grass plot colours to match the given season.
 * Only affects GRASS-state plots (plowed/planted plots keep their soil colours).
 * @param {string} season - 'spring' | 'summer' | 'autumn' | 'winter'
 */
function setSeasonColors (season) {
  if (!SEASON_GRASS[season] || season === currentSeason) return
  currentSeason = season

  const [primary, alt, base] = SEASON_GRASS[season]

  // Rebuild shared grass canvas textures for new season palette
  _rebuildGrassTextures(primary, alt)

  // Update the large background terrain plane
  if (baseTerrainMesh) {
    if (baseTerrainMesh.material.map) baseTerrainMesh.material.map.dispose()
    const newBaseTex = _makeGrassTexture(base, primary, 128)
    newBaseTex.repeat.set(14, 14)
    baseTerrainMesh.material.map = newBaseTex
    baseTerrainMesh.material.color.setHex(0xffffff)
    baseTerrainMesh.material.needsUpdate = true
  }

  // Re-apply new grass textures to every grass-state plot
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const plot = plotGrid[row][col]
      if (plot && plot.state === PLOT_STATES.GRASS) {
        plot.mesh.material.map = (row + col) % 2 === 0 ? grassTexEven : grassTexOdd
        plot.mesh.material.color.setHex(0xffffff)
        plot.mesh.material.needsUpdate = true
      }
    }
  }

  // Update COLORS refs for legacy use (setPlotState color fallback)
  COLORS.grass = primary
  COLORS.grassAlt = alt
}

function getCurrentSeason () {
  return currentSeason
}

/**
 * Show a colored highlight quad over the given plot.
 * @param {object} plot - plot data object
 * @param {string} toolName - 'plow'|'plant'|'water'|'harvest'|'remove'|null
 */
function setHoverHighlight (plot, toolName) {
  if (!hoverHighlightMesh) return
  if (!plot) { clearHoverHighlight(); return }

  const cfg = HIGHLIGHT_COLORS[toolName] || HIGHLIGHT_COLORS.default
  hoverHighlightMesh.material.color.setHex(cfg.color)
  hoverHighlightMesh.material.opacity = cfg.opacity
  hoverHighlightMesh.position.set(plot.x, 0.05, plot.z)
  hoverHighlightMesh.visible = true
}

/**
 * Hide the hover highlight.
 */
function clearHoverHighlight () {
  if (hoverHighlightMesh) hoverHighlightMesh.visible = false
}

window.TerrainSystem = { createPlotGrid, PLOT_STATES, setSeasonColors, getCurrentSeason, setHoverHighlight, clearHoverHighlight }
export { createPlotGrid, PLOT_STATES, getPlotAt, getPlotFromRaycast, getAllPlots, setPlotWatered, setSeasonColors, getCurrentSeason, setHoverHighlight, clearHoverHighlight }
