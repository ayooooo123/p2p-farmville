import * as THREE from './three.module.min.js'

function markSharedAsset (asset) {
  asset.userData = asset.userData || {}
  asset.userData.sharedAsset = true
  return asset
}

// ── Neighbor Farm Renderer ──────────────────────────────────────────────────
// Renders neighboring farms adjacent to the player's farm in the 3D scene.
// Only renders the 2 closest neighbors for performance.

const FARM_WIDTH = 90 // spacing between farms (farm is 80 + paths)
const MAX_VISIBLE_NEIGHBORS = 2
const NEIGHBOR_TINT = 0.85 // slightly dimmer to distinguish

const NEIGHBOR_TERRAIN_GEOMETRY = markSharedAsset(new THREE.PlaneGeometry(80, 80))
const NEIGHBOR_TERRAIN_MATERIAL = markSharedAsset(new THREE.MeshStandardMaterial({
  color: 0x3d6b24,
  roughness: 0.95,
  metalness: 0.0
}))
const NEIGHBOR_GRID_GEOMETRY = markSharedAsset(new THREE.PlaneGeometry(40, 40))
const NEIGHBOR_GRID_MATERIAL = markSharedAsset(new THREE.MeshStandardMaterial({
  color: 0x4a7c2e,
  roughness: 0.9,
  metalness: 0.0,
  transparent: true,
  opacity: 0.8
}))
const NEIGHBOR_PLOT_GEOMETRY = markSharedAsset(new THREE.BoxGeometry(1.9, 0.06, 1.9))
const NEIGHBOR_PLOT_MATERIAL = markSharedAsset(new THREE.MeshStandardMaterial({
  color: 0x6b4226,
  roughness: 0.9
}))
const NEIGHBOR_FENCE_POST_GEOMETRY = markSharedAsset(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6))
const NEIGHBOR_FENCE_RAIL_GEOMETRY_Z = markSharedAsset(new THREE.BoxGeometry(0.08, 0.08, 84))
const NEIGHBOR_FENCE_RAIL_GEOMETRY_X = markSharedAsset(new THREE.BoxGeometry(84, 0.08, 0.08))
const NEIGHBOR_FENCE_MATERIAL = markSharedAsset(new THREE.MeshStandardMaterial({
  color: 0x8b5e3c,
  roughness: 0.8
}))
const NEIGHBOR_CROP_STEM_GEOMETRY_CACHE = new Map()
const NEIGHBOR_CROP_STEM_MATERIAL_CACHE = new Map()
const NEIGHBOR_CROP_CANOPY_GEOMETRY_CACHE = new Map()
const NEIGHBOR_CROP_CANOPY_MATERIAL_CACHE = new Map()
const NEIGHBOR_TREE_TRUNK_GEOMETRY = markSharedAsset(new THREE.CylinderGeometry(0.2, 0.3, 2, 6))
const NEIGHBOR_TREE_TRUNK_MATERIAL = markSharedAsset(new THREE.MeshStandardMaterial({
  color: 0x5c3a1e,
  roughness: 0.9
}))
const NEIGHBOR_TREE_CANOPY_GEOMETRY = markSharedAsset(new THREE.SphereGeometry(1.2, 8, 6))
const NEIGHBOR_TREE_CANOPY_MATERIAL = markSharedAsset(new THREE.MeshStandardMaterial({
  color: 0x228b22,
  roughness: 0.7
}))
const NEIGHBOR_ANIMAL_BODY_GEOMETRY = markSharedAsset(new THREE.BoxGeometry(0.8, 0.5, 1.2))
const NEIGHBOR_ANIMAL_HEAD_GEOMETRY = markSharedAsset(new THREE.BoxGeometry(0.4, 0.4, 0.4))
const NEIGHBOR_ANIMAL_MATERIAL = markSharedAsset(new THREE.MeshStandardMaterial({
  color: 0xf5f5dc,
  roughness: 0.8
}))
const NEIGHBOR_BUILDING_WALL_GEOMETRY_CACHE = new Map()
const NEIGHBOR_BUILDING_WALL_MATERIAL_CACHE = new Map()
const NEIGHBOR_BUILDING_ROOF_GEOMETRY_CACHE = new Map()
const NEIGHBOR_BUILDING_ROOF_MATERIAL_CACHE = new Map()

function getSharedNeighborBuildingWallGeometry (w, h, d) {
  const key = `${w}|${h}|${d}`
  if (!NEIGHBOR_BUILDING_WALL_GEOMETRY_CACHE.has(key)) {
    NEIGHBOR_BUILDING_WALL_GEOMETRY_CACHE.set(key, markSharedAsset(new THREE.BoxGeometry(w, h, d)))
  }
  return NEIGHBOR_BUILDING_WALL_GEOMETRY_CACHE.get(key)
}

function getSharedNeighborBuildingWallMaterial (color) {
  if (!NEIGHBOR_BUILDING_WALL_MATERIAL_CACHE.has(color)) {
    NEIGHBOR_BUILDING_WALL_MATERIAL_CACHE.set(color, markSharedAsset(new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7
    })))
  }
  return NEIGHBOR_BUILDING_WALL_MATERIAL_CACHE.get(color)
}

function getSharedNeighborBuildingRoofGeometry (radius, height) {
  const key = `${radius}|${height}`
  if (!NEIGHBOR_BUILDING_ROOF_GEOMETRY_CACHE.has(key)) {
    NEIGHBOR_BUILDING_ROOF_GEOMETRY_CACHE.set(key, markSharedAsset(new THREE.ConeGeometry(radius, height, 4)))
  }
  return NEIGHBOR_BUILDING_ROOF_GEOMETRY_CACHE.get(key)
}

function getSharedNeighborBuildingRoofMaterial (color) {
  if (!NEIGHBOR_BUILDING_ROOF_MATERIAL_CACHE.has(color)) {
    NEIGHBOR_BUILDING_ROOF_MATERIAL_CACHE.set(color, markSharedAsset(new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6
    })))
  }
  return NEIGHBOR_BUILDING_ROOF_MATERIAL_CACHE.get(color)
}

function getSharedNeighborCropStemGeometry (stage) {
  if (!NEIGHBOR_CROP_STEM_GEOMETRY_CACHE.has(stage)) {
    NEIGHBOR_CROP_STEM_GEOMETRY_CACHE.set(
      stage,
      markSharedAsset(new THREE.CylinderGeometry(0.15 + stage * 0.05, 0.1, 0.1 + stage * 0.25, 6))
    )
  }

  return NEIGHBOR_CROP_STEM_GEOMETRY_CACHE.get(stage)
}

function getSharedNeighborCropStemMaterial (stage, withered) {
  const key = withered ? 'withered' : `stage:${stage}`
  if (!NEIGHBOR_CROP_STEM_MATERIAL_CACHE.has(key)) {
    const color = withered ? 0x808080 : (0x228b22 + stage * 0x111100)
    NEIGHBOR_CROP_STEM_MATERIAL_CACHE.set(key, markSharedAsset(new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8
    })))
  }

  return NEIGHBOR_CROP_STEM_MATERIAL_CACHE.get(key)
}

function getSharedNeighborCropCanopyGeometry (stage) {
  if (!NEIGHBOR_CROP_CANOPY_GEOMETRY_CACHE.has(stage)) {
    NEIGHBOR_CROP_CANOPY_GEOMETRY_CACHE.set(
      stage,
      markSharedAsset(new THREE.SphereGeometry(0.15 + stage * 0.05, 6, 4))
    )
  }

  return NEIGHBOR_CROP_CANOPY_GEOMETRY_CACHE.get(stage)
}

function getSharedNeighborCropCanopyMaterial (withered) {
  const key = withered ? 'withered' : 'healthy'
  if (!NEIGHBOR_CROP_CANOPY_MATERIAL_CACHE.has(key)) {
    NEIGHBOR_CROP_CANOPY_MATERIAL_CACHE.set(key, markSharedAsset(new THREE.MeshStandardMaterial({
      color: withered ? 0x666666 : 0x32cd32,
      roughness: 0.7
    })))
  }

  return NEIGHBOR_CROP_CANOPY_MATERIAL_CACHE.get(key)
}

// Active neighbor farm renders: Map<key, { group, nameSprite, lastState }>
const renderedNeighbors = new Map()

let scene = null

function init (sceneRef) {
  scene = sceneRef
}

// ── Update neighbors from the neighbor list ─────────────────────────────────
function updateNeighbors (neighborList) {
  if (!scene) return

  // Sort by distance to pick closest neighbors
  const sorted = [...neighborList].sort((a, b) => {
    const da = Math.abs(a.position?.x || 0) + Math.abs(a.position?.z || 0)
    const db = Math.abs(b.position?.x || 0) + Math.abs(b.position?.z || 0)
    return da - db
  })

  const visible = sorted.slice(0, MAX_VISIBLE_NEIGHBORS)
  const visibleKeys = new Set(visible.map(n => n.key))

  // Remove neighbors no longer visible
  for (const [key, data] of renderedNeighbors) {
    if (!visibleKeys.has(key)) {
      removeNeighborFarm(key)
    }
  }

  // Render or update visible neighbors
  visible.forEach((neighbor, idx) => {
    const offsetX = (idx + 1) * FARM_WIDTH * (idx % 2 === 0 ? 1 : -1)
    renderNeighborFarm(neighbor, offsetX)
  })
}

// ── Render a single neighbor's farm ─────────────────────────────────────────
function renderNeighborFarm (neighbor, offsetX) {
  const key = neighbor.key
  const existing = renderedNeighbors.get(key)

  // If already rendered with same state, just update position
  if (existing) {
    existing.group.position.x = offsetX
    // Update farm state if it changed
    if (neighbor.farmState && neighbor.farmState !== existing.lastState) {
      rebuildFarmMeshes(existing, neighbor.farmState, offsetX)
      existing.lastState = neighbor.farmState
    }
    updateNameSprite(existing, neighbor.name, offsetX)
    return
  }

  // Create new neighbor farm group
  const group = new THREE.Group()
  group.position.set(offsetX, 0, 0)

  // Base terrain
  const terrain = new THREE.Mesh(NEIGHBOR_TERRAIN_GEOMETRY, NEIGHBOR_TERRAIN_MATERIAL)
  terrain.rotation.x = -Math.PI / 2
  terrain.position.y = -0.04
  terrain.receiveShadow = true
  group.add(terrain)

  // Grid overlay (subtle)
  const gridMesh = new THREE.Mesh(NEIGHBOR_GRID_GEOMETRY, NEIGHBOR_GRID_MATERIAL)
  gridMesh.rotation.x = -Math.PI / 2
  gridMesh.position.y = 0.01
  gridMesh.receiveShadow = true
  group.add(gridMesh)

  // Farm boundary fence
  addBoundaryFence(group)

  // Name label
  const nameSprite = createNameSprite(neighbor.name || 'Unknown')
  nameSprite.position.set(0, 8, -20)
  group.add(nameSprite)

  scene.add(group)

  const data = { group, nameSprite, lastState: null, farmMeshes: [] }
  renderedNeighbors.set(key, data)

  // Render farm contents if we have state
  if (neighbor.farmState) {
    rebuildFarmMeshes(data, neighbor.farmState, offsetX)
    data.lastState = neighbor.farmState
  }
}

// ── Rebuild the 3D meshes for a neighbor's farm state ───────────────────────
function rebuildFarmMeshes (data, farmState, offsetX) {
  // Remove old farm content meshes
  for (const mesh of data.farmMeshes) {
    data.group.remove(mesh)
    disposeMesh(mesh)
  }
  data.farmMeshes = []

  if (!farmState) return

  // Render plots/crops
  if (farmState.plots) {
    renderNeighborPlots(data, farmState.plots)
  }

  // Render trees
  if (farmState.trees) {
    for (const tree of farmState.trees) {
      const mesh = createSimpleTree(tree)
      data.group.add(mesh)
      data.farmMeshes.push(mesh)
    }
  }

  // Render animals
  if (farmState.animals) {
    for (const animal of farmState.animals) {
      const mesh = createSimpleAnimal(animal)
      data.group.add(mesh)
      data.farmMeshes.push(mesh)
    }
  }

  // Render buildings
  if (farmState.buildings) {
    for (const building of farmState.buildings) {
      const mesh = createSimpleBuilding(building)
      data.group.add(mesh)
      data.farmMeshes.push(mesh)
    }
  }

  // Render decorations
  if (farmState.decorations) {
    for (const deco of farmState.decorations) {
      const mesh = createSimpleDeco(deco)
      data.group.add(mesh)
      data.farmMeshes.push(mesh)
    }
  }
}

// ── Render neighbor crop plots ──────────────────────────────────────────────
function renderNeighborPlots (data, plots) {
  for (const plotRow of plots) {
    if (!Array.isArray(plotRow)) continue
    for (const plot of plotRow) {
      if (!plot) continue

      // Render plowed plots
      if (plot.state === 'plowed' || plot.state === 'planted') {
        const plotMesh = new THREE.Mesh(NEIGHBOR_PLOT_GEOMETRY, NEIGHBOR_PLOT_MATERIAL)
        plotMesh.position.set(plot.x || 0, 0.03, plot.z || 0)
        plotMesh.receiveShadow = true
        data.group.add(plotMesh)
        data.farmMeshes.push(plotMesh)
      }

      // Render crops
      if (plot.crop && plot.state === 'planted') {
        const cropMesh = createSimpleCrop(plot.crop, plot.x || 0, plot.z || 0)
        data.group.add(cropMesh)
        data.farmMeshes.push(cropMesh)
      }
    }
  }
}

// ── Simple crop mesh for neighbor rendering ─────────────────────────────────
function createSimpleCrop (crop, x, z) {
  const group = new THREE.Group()
  const stage = crop.stage || 0
  const height = 0.1 + stage * 0.25

  // Simple cylinder for crop
  const geo = getSharedNeighborCropStemGeometry(stage)
  const mat = getSharedNeighborCropStemMaterial(stage, crop.withered)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = height / 2 + 0.08
  mesh.castShadow = true
  group.add(mesh)

  // Add leaf sphere at top for mature crops
  if (stage >= 2) {
    const leafGeo = getSharedNeighborCropCanopyGeometry(stage)
    const leafMat = getSharedNeighborCropCanopyMaterial(crop.withered)
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.position.y = height + 0.1
    leaf.castShadow = true
    group.add(leaf)
  }

  group.position.set(x, 0, z)
  return group
}

// ── Simple tree mesh for neighbor rendering ─────────────────────────────────
function createSimpleTree (tree) {
  const group = new THREE.Group()
  const scale = tree.growthScale || 1

  // Trunk
  const trunk = new THREE.Mesh(NEIGHBOR_TREE_TRUNK_GEOMETRY, NEIGHBOR_TREE_TRUNK_MATERIAL)
  trunk.scale.setScalar(scale)
  trunk.position.y = scale
  trunk.castShadow = true
  group.add(trunk)

  // Canopy
  const canopy = new THREE.Mesh(NEIGHBOR_TREE_CANOPY_GEOMETRY, NEIGHBOR_TREE_CANOPY_MATERIAL)
  canopy.scale.setScalar(scale)
  canopy.position.y = 2.6 * scale
  canopy.castShadow = true
  group.add(canopy)

  group.position.set(tree.x || 0, 0, tree.z || 0)
  return group
}

// ── Simple animal mesh for neighbor rendering ───────────────────────────────
function createSimpleAnimal (animal) {
  const group = new THREE.Group()

  // Body
  const body = new THREE.Mesh(NEIGHBOR_ANIMAL_BODY_GEOMETRY, NEIGHBOR_ANIMAL_MATERIAL)
  body.position.y = 0.5
  body.castShadow = true
  group.add(body)

  // Head
  const head = new THREE.Mesh(NEIGHBOR_ANIMAL_HEAD_GEOMETRY, NEIGHBOR_ANIMAL_MATERIAL)
  head.position.set(0, 0.7, -0.7)
  head.castShadow = true
  group.add(head)

  group.position.set(animal.x || 0, 0, animal.z || 0)
  return group
}

// ── Simple building mesh for neighbor rendering ─────────────────────────────
function createSimpleBuilding (building) {
  const group = new THREE.Group()

  const w = building.width || 4
  const h = building.height || 3
  const d = building.depth || 4
  const wallColor = building.wallColor || 0xb22222
  const roofColor = building.roofColor || 0x8b0000
  const roofRadius = Math.max(w, d) * 0.7
  const roofHeight = h * 0.4

  // Walls
  const walls = new THREE.Mesh(
    getSharedNeighborBuildingWallGeometry(w, h, d),
    getSharedNeighborBuildingWallMaterial(wallColor)
  )
  walls.position.y = h / 2
  walls.castShadow = true
  walls.receiveShadow = true
  group.add(walls)

  // Roof
  const roof = new THREE.Mesh(
    getSharedNeighborBuildingRoofGeometry(roofRadius, roofHeight),
    getSharedNeighborBuildingRoofMaterial(roofColor)
  )
  roof.position.y = h + h * 0.2
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  group.add(roof)

  group.position.set(building.x || 0, 0, building.z || 0)
  return group
}

// ── Simple decoration mesh ──────────────────────────────────────────────────
function createSimpleDeco (deco) {
  const group = new THREE.Group()

  const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8)
  const mat = new THREE.MeshStandardMaterial({
    color: deco.color || 0xff69b4,
    roughness: 0.6
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = 0.3
  mesh.castShadow = true
  group.add(mesh)

  group.position.set(deco.x || 0, 0, deco.z || 0)
  return group
}

// ── Boundary fence between farms ────────────────────────────────────────────
function addBoundaryFence (group) {
  const halfW = 42
  const postSpacing = 6
  const fenceHeight = 1.2

  // Fence posts along left and right boundaries
  for (const xSign of [-1, 1]) {
    for (let z = -halfW; z <= halfW; z += postSpacing) {
      const post = new THREE.Mesh(NEIGHBOR_FENCE_POST_GEOMETRY, NEIGHBOR_FENCE_MATERIAL)
      post.position.set(xSign * halfW, fenceHeight / 2, z)
      post.castShadow = true
      group.add(post)
    }

    // Horizontal rails
    for (const railY of [0.4, 0.9]) {
      const rail = new THREE.Mesh(NEIGHBOR_FENCE_RAIL_GEOMETRY_Z, NEIGHBOR_FENCE_MATERIAL)
      rail.position.set(xSign * halfW, railY, 0)
      group.add(rail)
    }
  }

  // Front and back fence
  for (const zSign of [-1, 1]) {
    for (let x = -halfW; x <= halfW; x += postSpacing) {
      const post = new THREE.Mesh(NEIGHBOR_FENCE_POST_GEOMETRY, NEIGHBOR_FENCE_MATERIAL)
      post.position.set(x, fenceHeight / 2, zSign * halfW)
      post.castShadow = true
      group.add(post)
    }

    for (const railY of [0.4, 0.9]) {
      const rail = new THREE.Mesh(NEIGHBOR_FENCE_RAIL_GEOMETRY_X, NEIGHBOR_FENCE_MATERIAL)
      rail.position.set(0, railY, zSign * halfW)
      group.add(rail)
    }
  }
}

// ── Name sprite (floating text above farm) ──────────────────────────────────
function createNameSprite (name) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.roundRect(10, 10, 492, 108, 16)
  ctx.fill()

  ctx.font = 'bold 48px Segoe UI, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#4caf50'
  ctx.fillText(name, 256, 64)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(10, 2.5, 1)
  return sprite
}

function updateNameSprite (data, name, offsetX) {
  // Only rebuild if name changed
  if (data.nameSprite && data.nameSprite.userData.name === name) return

  if (data.nameSprite) {
    data.group.remove(data.nameSprite)
    if (data.nameSprite.material.map) data.nameSprite.material.map.dispose()
    data.nameSprite.material.dispose()
  }

  const sprite = createNameSprite(name)
  sprite.position.set(0, 8, -20)
  sprite.userData.name = name
  data.group.add(sprite)
  data.nameSprite = sprite
}

// ── Remove a neighbor farm from the scene ───────────────────────────────────
function removeNeighborFarm (key) {
  const data = renderedNeighbors.get(key)
  if (!data) return

  // Dispose all meshes
  data.group.traverse(child => {
    if (child.isMesh) {
      if (child.geometry && !child.geometry.userData?.sharedAsset) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m.map && !m.map.userData?.sharedAsset) m.map.dispose()
            if (!m.userData?.sharedAsset) m.dispose()
          })
        } else {
          if (child.material.map && !child.material.map.userData?.sharedAsset) child.material.map.dispose()
          if (!child.material.userData?.sharedAsset) child.material.dispose()
        }
      }
    }
    if (child.isSprite && child.material) {
      if (child.material.map && !child.material.map.userData?.sharedAsset) child.material.map.dispose()
      if (!child.material.userData?.sharedAsset) child.material.dispose()
    }
  })

  scene.remove(data.group)
  renderedNeighbors.delete(key)
}

function disposeMesh (mesh) {
  if (!mesh) return
  mesh.traverse(child => {
    if (child.isMesh) {
      if (child.geometry && !child.geometry.userData?.sharedAsset) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (!m.userData?.sharedAsset) m.dispose()
          })
        } else if (!child.material.userData?.sharedAsset) {
          child.material.dispose()
        }
      }
    }
  })
}

// ── Get the neighbor at a world position (for visiting) ─────────────────────
function getNeighborAtPosition (worldX) {
  for (const [key, data] of renderedNeighbors) {
    const farmX = data.group.position.x
    if (Math.abs(worldX - farmX) < 40) {
      // Find the neighbor info
      return { key, offsetX: farmX }
    }
  }
  return null
}

// ── Get all rendered neighbor positions ─────────────────────────────────────
function getRenderedNeighborPositions () {
  const positions = []
  for (const [key, data] of renderedNeighbors) {
    positions.push({ key, x: data.group.position.x, z: data.group.position.z })
  }
  return positions
}

export {
  init,
  updateNeighbors,
  removeNeighborFarm,
  getNeighborAtPosition,
  getRenderedNeighborPositions,
  renderedNeighbors
}
