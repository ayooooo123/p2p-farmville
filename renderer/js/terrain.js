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
let pathTex      = null  // cobblestone path texture (created once)

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
 * Generate a canvas cobblestone/brick texture for the farm path perimeter.
 * Running-bond brick rows with grout lines + subtle per-pixel noise.
 */
function _makePathTexture (size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Base sandy mortar color
  ctx.fillStyle = '#8a7250'
  ctx.fillRect(0, 0, size, size)

  // Brick dimensions (in canvas pixels)
  const brickW = size / 4    // 32px wide
  const brickH = size / 7    // ~18px tall
  const grout  = 2            // 2px grout gap

  // Stone colors — warm sandy range
  const stoneColors = [
    '#c2a66e', '#b89a5e', '#cdb07a', '#b08050',
    '#c8a870', '#aa8848', '#d4b880', '#bc9e62'
  ]

  let colorIdx = 0
  for (let row = 0; row < Math.ceil(size / brickH) + 1; row++) {
    // Offset every other row by half a brick (running bond)
    const xOffset = (row % 2 === 0) ? 0 : brickW / 2

    for (let col = -1; col < Math.ceil(size / brickW) + 1; col++) {
      const bx = xOffset + col * brickW + grout
      const by = row * brickH + grout
      const bw = brickW - grout * 2
      const bh = brickH - grout * 2

      if (bw > 0 && bh > 0) {
        // Pick a color from the palette with slight per-brick variation
        const baseColor = stoneColors[colorIdx % stoneColors.length]
        colorIdx++

        // Parse hex to RGB for noise
        const r = parseInt(baseColor.slice(1, 3), 16)
        const g = parseInt(baseColor.slice(3, 5), 16)
        const b = parseInt(baseColor.slice(5, 7), 16)
        const nv = Math.floor((Math.random() - 0.5) * 18)
        const cr = Math.min(255, Math.max(0, r + nv))
        const cg = Math.min(255, Math.max(0, g + nv))
        const cb = Math.min(255, Math.max(0, b + nv))

        ctx.fillStyle = `rgb(${cr},${cg},${cb})`
        ctx.fillRect(bx, by, bw, bh)

        // Subtle top-left highlight for 3D stone feel
        ctx.fillStyle = 'rgba(255,255,255,0.10)'
        ctx.fillRect(bx, by, bw, 2)
        ctx.fillRect(bx, by, 2, bh)

        // Subtle bottom-right shadow for depth
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        ctx.fillRect(bx, by + bh - 2, bw, 2)
        ctx.fillRect(bx + bw - 2, by, 2, bh)
      }
    }
  }

  // Per-pixel noise for surface variation
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14
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
let allPlots = []
let plotMeshes = []
let raycaster = null
let scene = null
let gridLinesMesh = null
let terrainSceneObjects = []
let sharedPlotGeometry = null
let sharedFurrowGeometry = null
const sharedPlotMaterials = new Map()
const sharedFurrowMaterials = new Map()

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

function _trackTerrainObject (object3d) {
  terrainSceneObjects.push(object3d)
  return object3d
}

function _markSharedAsset (asset) {
  if (asset) asset.userData.sharedAsset = true
  return asset
}

function _getSharedPlotGeometry () {
  if (!sharedPlotGeometry) {
    sharedPlotGeometry = _markSharedAsset(new THREE.PlaneGeometry(PLOT_SIZE - 0.08, PLOT_SIZE - 0.08))
  }
  return sharedPlotGeometry
}

function _getSharedFurrowGeometry () {
  if (!sharedFurrowGeometry) {
    sharedFurrowGeometry = _markSharedAsset(new THREE.PlaneGeometry(PLOT_SIZE - 0.3, 0.06))
  }
  return sharedFurrowGeometry
}

function _getSharedPlotMaterialKey (state, parityEven, watered = false) {
  if (state === PLOT_STATES.GRASS) {
    return parityEven ? 'grass-even' : 'grass-odd'
  }
  return watered ? 'soil-wet' : 'soil-dry'
}

function _getSharedPlotMaterial (state, parityEven, watered = false) {
  const key = _getSharedPlotMaterialKey(state, parityEven, watered)
  const map = key === 'grass-even'
    ? grassTexEven
    : key === 'grass-odd'
      ? grassTexOdd
      : watered
        ? soilTexWet
        : soilTexDry

  let material = sharedPlotMaterials.get(key)
  if (!material) {
    material = _markSharedAsset(new THREE.MeshStandardMaterial({
      map,
      roughness: 0.9,
      metalness: 0.0
    }))
    sharedPlotMaterials.set(key, material)
  }

  if (material.map !== map) {
    material.map = map
    material.needsUpdate = true
  }
  material.color.setHex(0xffffff)
  return material
}

function _syncSharedPlotMaterials () {
  _getSharedPlotMaterial(PLOT_STATES.GRASS, true)
  _getSharedPlotMaterial(PLOT_STATES.GRASS, false)
  _getSharedPlotMaterial(PLOT_STATES.PLOWED, true, false)
  _getSharedPlotMaterial(PLOT_STATES.PLOWED, true, true)
}

function _getSharedFurrowMaterial (watered = false) {
  const key = watered ? 'wet' : 'dry'
  let material = sharedFurrowMaterials.get(key)
  if (!material) {
    material = _markSharedAsset(new THREE.MeshStandardMaterial({
      color: watered ? COLORS.plowedWateredDark : COLORS.plowedDark
    }))
    sharedFurrowMaterials.set(key, material)
  }
  material.color.setHex(watered ? COLORS.plowedWateredDark : COLORS.plowedDark)
  return material
}

function _applyPlotMaterial (plot, state, watered = false) {
  if (!plot?.mesh) return
  plot.mesh.material = _getSharedPlotMaterial(state, plot.parityEven, watered)
}

function _setFurrowMaterial (plot, watered = false) {
  if (!plot?._furrows) return
  const material = _getSharedFurrowMaterial(watered)
  plot._furrows.children.forEach(furrow => {
    furrow.material = material
  })
}

function _disposeObjectMaterial (material, disposedMaterials) {
  if (!material || disposedMaterials.has(material)) return
  if (material.userData?.sharedAsset) return
  disposedMaterials.add(material)
  const ownedTextures = material.userData?.ownedTextures
  if (Array.isArray(ownedTextures)) {
    ownedTextures.forEach(texture => texture?.dispose?.())
    material.userData.ownedTextures = []
  }
  material.dispose()
}

function _disposeObject3DResources (object3d, disposedGeometries, disposedMaterials) {
  if (!object3d) return
  if (
    object3d.geometry &&
    !object3d.geometry.userData?.sharedAsset &&
    !disposedGeometries.has(object3d.geometry)
  ) {
    disposedGeometries.add(object3d.geometry)
    object3d.geometry.dispose()
  }
  if (Array.isArray(object3d.material)) {
    object3d.material.forEach(material => _disposeObjectMaterial(material, disposedMaterials))
  } else {
    _disposeObjectMaterial(object3d.material, disposedMaterials)
  }
}

function _resetTerrainScene (nextScene = null) {
  if (scene) {
    for (const row of plotGrid) {
      for (const plot of row) {
        if (plot?._furrows) _removeFurrows(plot)
      }
    }

    const disposedGeometries = new Set()
    const disposedMaterials = new Set()
    for (const object3d of terrainSceneObjects) {
      scene.remove(object3d)
      _disposeObject3DResources(object3d, disposedGeometries, disposedMaterials)
    }
  }

  terrainSceneObjects = []
  baseTerrainMesh = null
  hoverHighlightMesh = null
  gridLinesMesh = null
  if (nextScene) scene = nextScene
}

/**
 * Build a LineSegments grid overlay between all plot tiles.
 * Static mesh — matrixAutoUpdate disabled for a small perf win.
 */
function _createGridLines (sceneRef) {
  // Dispose previous if createPlotGrid is called more than once
  if (gridLinesMesh) {
    sceneRef.remove(gridLinesMesh)
    gridLinesMesh.geometry.dispose()
    gridLinesMesh.material.dispose()
    gridLinesMesh = null
  }

  const halfW = (GRID_COLS * PLOT_SIZE) / 2  // 20
  const halfD = (GRID_ROWS * PLOT_SIZE) / 2  // 20
  const pts = []

  // Vertical lines (parallel to Z axis, one per column boundary)
  for (let col = 0; col <= GRID_COLS; col++) {
    const x = -halfW + col * PLOT_SIZE
    pts.push(x, 0.03, -halfD,  x, 0.03, halfD)
  }

  // Horizontal lines (parallel to X axis, one per row boundary)
  for (let row = 0; row <= GRID_ROWS; row++) {
    const z = -halfD + row * PLOT_SIZE
    pts.push(-halfW, 0.03, z,  halfW, 0.03, z)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  const mat = new THREE.LineBasicMaterial({
    color: 0x2a4510,
    opacity: 0.25,
    transparent: true,
    depthWrite: false
  })
  const lines = new THREE.LineSegments(geo, mat)
  lines.name = 'plotGridLines'
  // Static geometry — disable auto matrix update for a free perf gain
  lines.matrixAutoUpdate = false
  lines.updateMatrix()
  sceneRef.add(_trackTerrainObject(lines))
  gridLinesMesh = lines
}

/**
 * Create the entire farm plot grid
 * @param {THREE.Scene} sceneRef
 * @returns {object} { plots, getPlotAt, setPlotState, getPlotFromIntersect }
 */
function createPlotGrid (sceneRef) {
  _resetTerrainScene(sceneRef)
  raycaster = new THREE.Raycaster()
  plotGrid = []
  allPlots = []
  plotMeshes = []

  // Build shared canvas textures
  _rebuildGrassTextures(COLORS.grass, COLORS.grassAlt)
  soilTexDry = _makeSoilTexture(0x6b4226, 0x4a2a14)
  soilTexWet = _makeSoilTexture(0x3d2510, 0x251508)
  _syncSharedPlotMaterials()
  _getSharedFurrowMaterial(false)
  _getSharedFurrowMaterial(true)

  // Base terrain (larger than grid) — canvas grass texture for rich background
  const terrainGeo = new THREE.PlaneGeometry(90, 90)
  const terrainBaseTex = _makeGrassTexture(0x3d6b24, 0x4a7c2e, 128)
  terrainBaseTex.repeat.set(14, 14)
  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainBaseTex,
    roughness: 0.95,
    metalness: 0.0
  })
  terrainMat.userData.ownedTextures = [terrainBaseTex]
  const terrain = new THREE.Mesh(terrainGeo, terrainMat)
  terrain.rotation.x = -Math.PI / 2
  terrain.position.y = -0.05
  terrain.name = 'baseTerrain'
  terrain.receiveShadow = true
  scene.add(_trackTerrainObject(terrain))
  baseTerrainMesh = terrain

  // Path borders around farm
  _createPaths(scene)

  // Create individual plot meshes (flat planes for top-down, with gap for grid lines)
  for (let row = 0; row < GRID_ROWS; row++) {
    plotGrid[row] = []
    for (let col = 0; col < GRID_COLS; col++) {
      const x = GRID_OFFSET_X + col * PLOT_SIZE
      const z = GRID_OFFSET_Z + row * PLOT_SIZE
      const parityEven = (row + col) % 2 === 0

      // Flat plane with slight gap for grid lines (0.08 gap = ~1px grid line at normal zoom)
      const plotGeo = _getSharedPlotGeometry()
      const plotMat = _getSharedPlotMaterial(PLOT_STATES.GRASS, parityEven)
      const plotMesh = new THREE.Mesh(plotGeo, plotMat)
      plotMesh.rotation.x = -Math.PI / 2
      plotMesh.position.set(x, 0.01, z)
      plotMesh.userData.row = row
      plotMesh.userData.col = col
      plotMesh.userData.isPlot = true
      plotMesh.userData.parityEven = parityEven
      plotMesh.receiveShadow = true
      scene.add(_trackTerrainObject(plotMesh))
      plotMeshes.push(plotMesh)

      const plot = {
        row,
        col,
        state: PLOT_STATES.GRASS,
        mesh: plotMesh,
        crop: null,     // { type, plantedAt, watered, stage, withered, mesh, growthAccum }
        cropMesh: null,
        x,
        z,
        parityEven
      }
      plotGrid[row][col] = plot
      allPlots.push(plot)
    }
  }

  // Grid line overlay between plots (static, single draw call)
  _createGridLines(scene)

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
  scene.add(_trackTerrainObject(hoverHighlightMesh))

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

  // Build the cobblestone canvas texture once (shared across all 4 path planes)
  if (!pathTex) pathTex = _makePathTexture(128)

  // ── Path planes with cobblestone texture ──────────────────────────────────
  // Top/bottom paths
  for (const zSign of [-1, 1]) {
    const totalW = halfW * 2 + pathWidth * 2
    const tex = pathTex.clone()
    tex.needsUpdate = true
    tex.repeat.set(totalW / pathWidth, 1)
    const pathMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.88,
      metalness: 0.0
    })
    pathMat.userData.ownedTextures = [tex]
    const pathGeo = new THREE.PlaneGeometry(totalW, pathWidth)
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.rotation.x = -Math.PI / 2
    path.position.set(0, 0.005, zSign * halfD)
    path.receiveShadow = true
    path.matrixAutoUpdate = false
    path.updateMatrix()
    scene.add(_trackTerrainObject(path))
  }

  // Left/right paths
  for (const xSign of [-1, 1]) {
    const totalD = halfD * 2 + pathWidth * 2
    const tex = pathTex.clone()
    tex.needsUpdate = true
    tex.repeat.set(1, totalD / pathWidth)
    const pathMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.88,
      metalness: 0.0
    })
    pathMat.userData.ownedTextures = [tex]
    const pathGeo = new THREE.PlaneGeometry(pathWidth, totalD)
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.rotation.x = -Math.PI / 2
    path.position.set(xSign * halfW, 0.005, 0)
    path.receiveShadow = true
    path.matrixAutoUpdate = false
    path.updateMatrix()
    scene.add(_trackTerrainObject(path))
  }

  // ── 3D Fence posts at corners and mid-spans ────────────────────────────────
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1e, roughness: 0.9, metalness: 0 })
  const capMat  = new THREE.MeshStandardMaterial({ color: 0x4a2510, roughness: 0.8, metalness: 0 })
  const postH   = 0.8
  const postR   = 0.18
  const capR    = 0.22

  // All 8 posts are identical cylinders; all 8 caps are identical hemispheres.
  // Build geometries once and reuse across every mesh instance.
  const postGeo = new THREE.CylinderGeometry(postR, postR * 1.1, postH, 8)
  const capGeo  = new THREE.SphereGeometry(capR, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)

  // Corner + mid-span post positions
  const postXPositions = [-halfW, 0, halfW]
  const postZPositions = [-halfD, 0, halfD]

  for (const px of postXPositions) {
    for (const pz of postZPositions) {
      // Only place posts at corners and at midpoints of the border sides
      const isCorner = (px !== 0 && pz !== 0)
      const isMidSide = (px === 0 || pz === 0) && !(px === 0 && pz === 0)
      if (!isCorner && !isMidSide) continue

      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(px, postH / 2, pz)
      post.castShadow = true
      post.receiveShadow = true
      post.matrixAutoUpdate = false
      post.updateMatrix()
      scene.add(_trackTerrainObject(post))

      const cap = new THREE.Mesh(capGeo, capMat)
      cap.position.set(px, postH, pz)
      cap.castShadow = true
      cap.matrixAutoUpdate = false
      cap.updateMatrix()
      scene.add(_trackTerrainObject(cap))
    }
  }

  // ── Horizontal fence rails connecting corner posts ─────────────────────────
  const railMat = new THREE.MeshStandardMaterial({ color: 0x7a4820, roughness: 0.85, metalness: 0 })
  const railH   = 0.06  // rail cross-section
  const railY   = postH * 0.65  // height of rail along post

  // halfW === halfD (GRID_COLS === GRID_ROWS and PLOT_SIZE constant), so a single
  // long-X rail geometry serves all 4 rails — left/right rails just rotate 90° around Y.
  const railLen = halfW * 2
  const railGeo = new THREE.BoxGeometry(railLen, railH, railH)

  // Top and bottom rails (parallel to X)
  for (const pz of [-halfD, halfD]) {
    const rail = new THREE.Mesh(railGeo, railMat)
    rail.position.set(0, railY, pz)
    rail.castShadow = true
    rail.matrixAutoUpdate = false
    rail.updateMatrix()
    scene.add(_trackTerrainObject(rail))
  }

  // Left and right rails (parallel to Z) — rotate shared X-axis geometry 90° around Y
  for (const px of [-halfW, halfW]) {
    const rail = new THREE.Mesh(railGeo, railMat)
    rail.position.set(px, railY, 0)
    rail.rotation.y = Math.PI / 2
    rail.castShadow = true
    rail.matrixAutoUpdate = false
    rail.updateMatrix()
    scene.add(_trackTerrainObject(rail))
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
 * Get all plots as a stable flat array.
 * Reused across hot renderer/app.js loops to avoid rebuilding a 400-entry list
 * several times per frame.
 */
function getAllPlots () {
  return allPlots
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
      _applyPlotMaterial(plot, state)
      _removeFurrows(plot)
      break

    case PLOT_STATES.PLOWED:
    case PLOT_STATES.PLANTED:
      _applyPlotMaterial(plot, state, false)
      _addFurrows(plot)
      break
  }
}

function _addFurrows (plot) {
  if (plot._furrows) return
  const furrows = new THREE.Group()
  const furrowGeo = _getSharedFurrowGeometry()
  const furrowMat = _getSharedFurrowMaterial(false)

  // Horizontal furrow lines (flat planes from top-down)
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(furrowGeo, furrowMat)
    f.rotation.x = -Math.PI / 2
    f.position.set(plot.x, 0.02, plot.z - 0.6 + i * 0.4)
    scene.add(f)
    furrows.add(f)
  }
  plot._furrows = furrows
}

function _removeFurrows (plot) {
  if (!plot._furrows) return
  plot._furrows.children.forEach(f => {
    scene.remove(f)
  })
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

  if (watered) {
    _applyPlotMaterial(plot, plot.state, true)
    _setFurrowMaterial(plot, true)
  } else {
    _applyPlotMaterial(plot, plot.state, false)
    _setFurrowMaterial(plot, false)
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
  _syncSharedPlotMaterials()

  // Update the large background terrain plane
  if (baseTerrainMesh) {
    const ownedTextures = baseTerrainMesh.material.userData?.ownedTextures
    if (Array.isArray(ownedTextures)) {
      ownedTextures.forEach(texture => texture?.dispose?.())
    }
    const newBaseTex = _makeGrassTexture(base, primary, 128)
    newBaseTex.repeat.set(14, 14)
    baseTerrainMesh.material.userData.ownedTextures = [newBaseTex]
    baseTerrainMesh.material.map = newBaseTex
    baseTerrainMesh.material.color.setHex(0xffffff)
    baseTerrainMesh.material.needsUpdate = true
  }

  // Re-apply new grass textures to every grass-state plot
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const plot = plotGrid[row][col]
      if (plot && plot.state === PLOT_STATES.GRASS) {
        _applyPlotMaterial(plot, PLOT_STATES.GRASS)
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
