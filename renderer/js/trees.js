import * as THREE from './three.module.min.js'
import { applySeasonalColors, createSeasonalColorScratch } from './seasonal-colors.js'

// ── 15+ Tree Definitions ────────────────────────────────────────────────────
export const TREE_DEFINITIONS = {
  oak: {
    name: 'Oak', level: 1, cost: 200, harvestTime: 120000, sellPrice: 45, xp: 5,
    fruitColor: 0x8b4513, trunkColor: 0x5c3a1e, canopyColor: 0x2d6b1e, canopySize: 1.8
  },
  cherry: {
    name: 'Cherry', level: 2, cost: 300, harvestTime: 100000, sellPrice: 55, xp: 6,
    fruitColor: 0xdc143c, trunkColor: 0x6b3a2a, canopyColor: 0x228b22, canopySize: 1.5
  },
  apple: {
    name: 'Apple', level: 3, cost: 350, harvestTime: 110000, sellPrice: 60, xp: 7,
    fruitColor: 0xff2222, trunkColor: 0x5c3a1e, canopyColor: 0x2e8b57, canopySize: 1.6
  },
  orange: {
    name: 'Orange', level: 4, cost: 400, harvestTime: 130000, sellPrice: 65, xp: 7,
    fruitColor: 0xff8c00, trunkColor: 0x6b4226, canopyColor: 0x228b22, canopySize: 1.7
  },
  lemon: {
    name: 'Lemon', level: 5, cost: 420, harvestTime: 125000, sellPrice: 62, xp: 7,
    fruitColor: 0xffd700, trunkColor: 0x5c3a1e, canopyColor: 0x2e8b57, canopySize: 1.5
  },
  peach: {
    name: 'Peach', level: 6, cost: 450, harvestTime: 140000, sellPrice: 70, xp: 8,
    fruitColor: 0xffb07c, trunkColor: 0x6b3a2a, canopyColor: 0x228b22, canopySize: 1.6
  },
  acai: {
    name: 'Acai', level: 8, cost: 600, harvestTime: 180000, sellPrice: 95, xp: 10,
    fruitColor: 0x2e0854, trunkColor: 0x5c3a1e, canopyColor: 0x1a5e1a, canopySize: 2.0
  },
  pecan: {
    name: 'Pecan', level: 10, cost: 550, harvestTime: 160000, sellPrice: 85, xp: 9,
    fruitColor: 0x8b6914, trunkColor: 0x6b4226, canopyColor: 0x2d7a1e, canopySize: 1.9
  },
  maple: {
    name: 'Maple', level: 12, cost: 700, harvestTime: 200000, sellPrice: 110, xp: 12,
    fruitColor: 0xcc6600, trunkColor: 0x5c3a1e, canopyColor: 0xcc4400, canopySize: 2.0
  },
  pine: {
    name: 'Pine', level: 5, cost: 380, harvestTime: 150000, sellPrice: 55, xp: 6,
    fruitColor: 0x8b6914, trunkColor: 0x5c3a1e, canopyColor: 0x1a5e1a, canopySize: 1.8, isPine: true
  },
  banana: {
    name: 'Banana', level: 7, cost: 500, harvestTime: 140000, sellPrice: 75, xp: 8,
    fruitColor: 0xffe135, trunkColor: 0x8fbc8f, canopyColor: 0x228b22, canopySize: 1.4
  },
  coconut: {
    name: 'Coconut', level: 9, cost: 580, harvestTime: 170000, sellPrice: 90, xp: 10,
    fruitColor: 0x8b5e3c, trunkColor: 0x8b7355, canopyColor: 0x2e8b57, canopySize: 1.6
  },
  olive: {
    name: 'Olive', level: 11, cost: 650, harvestTime: 190000, sellPrice: 100, xp: 11,
    fruitColor: 0x556b2f, trunkColor: 0x808080, canopyColor: 0x6b8e23, canopySize: 1.5
  },
  fig: {
    name: 'Fig', level: 13, cost: 750, harvestTime: 210000, sellPrice: 120, xp: 13,
    fruitColor: 0x4b0082, trunkColor: 0x6b4226, canopyColor: 0x2d7a1e, canopySize: 1.7
  },
  pomegranate: {
    name: 'Pomegranate', level: 15, cost: 900, harvestTime: 240000, sellPrice: 150, xp: 15,
    fruitColor: 0xb22222, trunkColor: 0x5c3a1e, canopyColor: 0x228b22, canopySize: 1.6
  }
}

function _trackInteractiveMesh (group, mesh) {
  if (mesh?.isMesh) group.userData.interactiveMeshes.push(mesh)
  return mesh
}

// ── Shared asset caches ─────────────────────────────────────────────────────
// Trees of the same type share trunk/canopy/fruit geometries and materials so
// that growth-stage rebuilds (createTreeMesh is called every time growth crosses
// a threshold) and save/visit reloads stop allocating fresh GPU resources.
//
// Geometries are unit-sized; per-tree growthScale and per-type canopySize are
// applied via mesh.scale, so a single CylinderGeometry/SphereGeometry/ConeGeometry
// covers every tree at every growth stage.
//
// Materials are keyed by treeType because setFarmTreeSeasonColors() mutates
// canopy material colors and we want all trees of the same type to season-shift
// in lockstep — which is the desired behavior.
const treeGeometryCache = new Map()
const treeMaterialCache = new Map()

// Track current season so canopy materials created AFTER a season change still
// pick up the right tint. setFarmTreeSeasonColors() updates this; the canopy
// material factory consults it to seed new materials with the active blend.
let currentTreeSeason = null
const _newCanopyColorScratch = new THREE.Color()
const _newCanopyTargetScratch = new THREE.Color()

const CANOPY_SEASON_TARGETS = {
  spring: { deciduous: { hex: 0x4ccf30, t: 0.30 }, pine: null },
  summer: { deciduous: null,                         pine: null },
  autumn: { deciduous: { hex: 0xd4780a, t: 0.72 }, pine: null },
  winter: { deciduous: { hex: 0x8a7a6a, t: 0.80 }, pine: { hex: 0xccddcc, t: 0.15 } }
}

function _applySeasonToCanopyMaterial (material, def, season) {
  if (!material || !def) return
  const seasonDef = season ? CANOPY_SEASON_TARGETS[season] : null
  const blend = seasonDef ? (def.isPine ? seasonDef.pine : seasonDef.deciduous) : null
  _newCanopyColorScratch.set(def.canopyColor)
  if (!blend) {
    material.color.copy(_newCanopyColorScratch)
    return
  }
  _newCanopyTargetScratch.set(blend.hex)
  material.color.copy(_newCanopyColorScratch).lerp(_newCanopyTargetScratch, blend.t)
}

function _markSharedAsset (asset) {
  if (!asset) return asset
  asset.userData = asset.userData || {}
  asset.userData.sharedAsset = true
  return asset
}

function _getSharedTreeGeometry (cacheKey, factory) {
  let geometry = treeGeometryCache.get(cacheKey)
  if (!geometry) {
    geometry = _markSharedAsset(factory())
    treeGeometryCache.set(cacheKey, geometry)
  }
  return geometry
}

function _getSharedTreeMaterial (cacheKey, factory) {
  let material = treeMaterialCache.get(cacheKey)
  if (!material) {
    material = _markSharedAsset(factory())
    treeMaterialCache.set(cacheKey, material)
  }
  return material
}

function _getTrunkGeometry () {
  return _getSharedTreeGeometry('tree:trunk:cyl',
    () => new THREE.CylinderGeometry(0.18, 0.216, 1.2, 7))
}
function _getCanopySphereGeometry () {
  return _getSharedTreeGeometry('tree:canopy:sphere',
    () => new THREE.SphereGeometry(1, 10, 8))
}
function _getCanopyConeGeometry () {
  return _getSharedTreeGeometry('tree:canopy:cone',
    () => new THREE.ConeGeometry(1, 1, 10))
}
function _getFruitGeometry () {
  return _getSharedTreeGeometry('tree:fruit:sphere',
    () => new THREE.SphereGeometry(0.13, 5, 4))
}

function _getTrunkMaterial (treeType, def) {
  return _getSharedTreeMaterial(`tree:trunk:mat:${treeType}`,
    () => new THREE.MeshStandardMaterial({ color: def.trunkColor, roughness: 0.9, metalness: 0 }))
}
function _getCanopyMaterial (treeType, def) {
  return _getSharedTreeMaterial(`tree:canopy:mat:${treeType}`, () => {
    const mat = new THREE.MeshStandardMaterial({ color: def.canopyColor, roughness: 0.85, metalness: 0 })
    // Seed with current season tint so trees spawned mid-season are not stuck
    // on summer color until the next season transition.
    _applySeasonToCanopyMaterial(mat, def, currentTreeSeason)
    return mat
  })
}
function _getFruitMaterial (treeType, def) {
  return _getSharedTreeMaterial(`tree:fruit:mat:${treeType}`,
    () => new THREE.MeshStandardMaterial({ color: def.fruitColor, roughness: 0.7, metalness: 0 }))
}

/**
 * Create a 3D tree mesh: cylinder trunk + sphere/cone canopy.
 * Viewed top-down the canopy dominates; 3D geometry casts proper shadows.
 *
 * Geometries and materials are shared across all trees of the same type via
 * module-level caches (see _getSharedTree* helpers). Per-tree growthScale and
 * per-type canopySize are applied via mesh.scale so the same unit geometry
 * serves every tree at every growth stage.
 *
 * @param {string} treeType - key in TREE_DEFINITIONS
 * @param {boolean} mature - whether to show fruits
 * @param {number} growthScale - 0..1 for growth animation
 * @returns {THREE.Group}
 */
export function createTreeMesh (treeType, mature, growthScale) {
  const def = TREE_DEFINITIONS[treeType]
  if (!def) return new THREE.Group()

  const scale = growthScale != null ? growthScale : 1
  const group = new THREE.Group()
  group.userData.objectType = 'tree'
  group.userData.treeType = treeType
  group.userData.trunkMeshes = []
  group.userData.canopyMeshes = []
  group.userData.fruitMeshes = []
  group.userData.interactiveMeshes = []
  // Per-tree random phase offset so placed trees sway independently in the wind
  group.userData.windPhase = Math.random() * Math.PI * 2

  const canopyR = def.canopySize * scale
  const trunkH = 1.2 * scale

  // Trunk — shared unit cylinder, scaled per-tree to match growth.
  const trunk = new THREE.Mesh(_getTrunkGeometry(), _getTrunkMaterial(treeType, def))
  _trackInteractiveMesh(group, trunk)
  trunk.scale.setScalar(scale)
  trunk.position.y = trunkH / 2
  trunk.castShadow = true
  trunk.receiveShadow = true
  trunk.userData.isFarmTrunk = true
  trunk.userData.trunkHeight = trunkH
  group.add(trunk)
  group.userData.trunkMeshes.push(trunk)

  if (def.isPine) {
    // Pine: layered cones (stacked, decreasing radius upward) — shared unit cone
    // geometry, per-mesh scale handles per-layer radius and per-tree growth.
    const layers = 3
    const coneGeo = _getCanopyConeGeometry()
    const coneMat = _getCanopyMaterial(treeType, def)
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1)
      const coneR = canopyR * (1 - t * 0.45)
      const coneH = canopyR * 0.9
      const cone = new THREE.Mesh(coneGeo, coneMat)
      _trackInteractiveMesh(group, cone)
      cone.scale.set(coneR, coneH, coneR)
      cone.position.y = trunkH + (i * coneH * 0.55)
      cone.castShadow = true
      cone.receiveShadow = true
      cone.userData.isFarmCanopy = true
      cone.userData.canopyRadius = coneR
      cone.userData.baseColor = def.canopyColor
      cone.userData.isPine = true
      group.add(cone)
      group.userData.canopyMeshes.push(cone)
    }
  } else {
    // Broadleaf: shared unit sphere scaled to canopyR.
    const canopy = new THREE.Mesh(_getCanopySphereGeometry(), _getCanopyMaterial(treeType, def))
    _trackInteractiveMesh(group, canopy)
    canopy.scale.setScalar(canopyR)
    canopy.position.y = trunkH + canopyR * 0.65
    canopy.castShadow = true
    canopy.receiveShadow = true
    canopy.userData.isFarmCanopy = true
    canopy.userData.canopyRadius = canopyR
    canopy.userData.baseColor = def.canopyColor
    canopy.userData.isPine = false
    group.add(canopy)
    group.userData.canopyMeshes.push(canopy)

    // Fruit dots as small spheres embedded in the canopy (only on mature trees).
    // Shared fruit geometry (fixed 0.13 radius) + per-type material. Fruits ride a
    // pivot anchored at the canopy center so they rotate with the canopy — staying
    // mechanically attached to the leaf volume — plus a per-fruit jitter in local
    // space for organic wiggle.
    if (mature && scale >= 0.9) {
      const fruitCount = 4 + Math.floor(Math.random() * 3)
      const r = canopyR * 0.85
      const fruitGeo = _getFruitGeometry()
      const fruitMat = _getFruitMaterial(treeType, def)
      const fruitPivot = new THREE.Group()
      fruitPivot.position.copy(canopy.position)
      group.add(fruitPivot)
      canopy.userData.fruitPivot = fruitPivot
      for (let i = 0; i < fruitCount; i++) {
        const angle = (i / fruitCount) * Math.PI * 2 + Math.random() * 0.5
        const elevAngle = Math.random() * Math.PI * 0.4 // upper hemisphere
        const fruit = new THREE.Mesh(fruitGeo, fruitMat)
        _trackInteractiveMesh(group, fruit)
        // Local to fruitPivot (which sits at canopy center).
        fruit.position.set(
          Math.cos(angle) * Math.cos(elevAngle) * r,
          Math.sin(elevAngle) * r * 0.5,
          Math.sin(angle) * Math.cos(elevAngle) * r
        )
        fruit.castShadow = false
        fruit.userData.isFarmFruit = true
        fruit.userData.baseX = fruit.position.x
        fruit.userData.baseY = fruit.position.y
        fruit.userData.baseZ = fruit.position.z
        fruit.userData.fruitPhase = Math.random() * Math.PI * 2
        fruit.userData.canopyRadius = canopyR
        fruitPivot.add(fruit)
        group.userData.fruitMeshes.push(fruit)
      }
    }
  }

  return group
}

/**
 * Tree data for placed trees
 */
export function createTreeData (treeType, x, z) {
  const def = TREE_DEFINITIONS[treeType]
  return {
    type: treeType,
    x,
    z,
    plantedAt: Date.now(),
    lastHarvest: 0,
    mature: false,
    growthScale: 0.3,
    mesh: null
  }
}

/**
 * Update tree growth over time
 * @returns {boolean} true if visual changed
 */
export function updateTreeGrowth (tree, dtMs) {
  const def = TREE_DEFINITIONS[tree.type]
  if (!def) return false

  let changed = false
  const growDuration = def.harvestTime * 0.5 // trees take half their harvest time to fully grow

  if (tree.growthScale < 1) {
    const oldScale = tree.growthScale
    tree.growthScale = Math.min(1, tree.growthScale + (dtMs / growDuration))
    // Check if crossed a visual threshold
    if (Math.floor(oldScale * 4) !== Math.floor(tree.growthScale * 4)) {
      changed = true
    }
  }

  // Check if ready for harvest
  if (tree.growthScale >= 1) {
    const elapsed = Date.now() - (tree.lastHarvest || tree.plantedAt)
    const wasMature = tree.mature
    tree.mature = elapsed >= def.harvestTime
    if (tree.mature !== wasMature) changed = true
  }

  return changed
}

/**
 * Check if tree is ready to harvest
 */
export function isTreeReady (tree) {
  return tree.growthScale >= 1 && tree.mature
}

/**
 * Harvest a tree - resets timer, returns reward
 */
export function harvestTree (tree) {
  const def = TREE_DEFINITIONS[tree.type]
  if (!def || !isTreeReady(tree)) return null

  tree.lastHarvest = Date.now()
  tree.mature = false

  return {
    coins: def.sellPrice,
    xp: def.xp,
    product: def.name + ' Fruit'
  }
}

// ── Seasonal canopy color shift ───────────────────────────────────────────────
const _seasonalTreeColorScratch = createSeasonalColorScratch()

const _CANOPY_MAT_KEY_PREFIX = 'tree:canopy:mat:'

/**
 * Update canopy material colors to match the given season.
 * Called only on season change — zero per-frame cost.
 *
 * Walks every cached canopy material directly so types not present in
 * `placedTrees` (e.g. a tree type the player will plant later in this season)
 * still get the correct tint. Also runs the legacy per-mesh pass for any
 * canopy whose material is not in the cache.
 *
 * @param {Array} placedTrees — array of tree data objects with a .mesh property
 * @param {string} season — 'spring' | 'summer' | 'autumn' | 'winter'
 */
export function setFarmTreeSeasonColors (placedTrees, season) {
  const seasonDef = CANOPY_SEASON_TARGETS[season]
  if (!seasonDef) return

  currentTreeSeason = season

  // Pass 1: walk cached canopy materials so every tree type — including ones
  // not currently placed — has the right base color when next instantiated.
  for (const [key, material] of treeMaterialCache) {
    if (!key.startsWith(_CANOPY_MAT_KEY_PREFIX)) continue
    const treeType = key.slice(_CANOPY_MAT_KEY_PREFIX.length)
    const def = TREE_DEFINITIONS[treeType]
    if (!def) continue
    _applySeasonToCanopyMaterial(material, def, season)
  }

  // Pass 2: legacy per-mesh fallback for any canopy mesh whose material is
  // not in the cache (none today, but kept for safety against future refactors).
  const getBlend = (child) => child.userData.isPine ? seasonDef.pine : seasonDef.deciduous
  for (const tree of placedTrees) {
    if (!tree.mesh) continue
    const canopies = tree.mesh.userData.canopyMeshes
    if (Array.isArray(canopies) && canopies.length > 0) {
      // Skip canopies whose material is in the cache — Pass 1 already handled them.
      const uncached = canopies.filter(c => c.material && !c.material.userData?.sharedAsset)
      if (uncached.length > 0) {
        applySeasonalColors(uncached, getBlend, _seasonalTreeColorScratch)
      }
      continue
    }

    // Fallback for any legacy meshes created before cached refs existed.
    const legacyCanopies = []
    tree.mesh.traverse((child) => {
      if (!child.isMesh || !child.userData.isFarmCanopy) return
      legacyCanopies.push(child)
    })
    applySeasonalColors(legacyCanopies, getBlend, _seasonalTreeColorScratch)
  }
}

window.TreeSystem = { TREE_DEFINITIONS, createTreeMesh, createTreeData, updateTreeGrowth, isTreeReady, harvestTree, setFarmTreeSeasonColors }
