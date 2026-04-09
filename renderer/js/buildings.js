import * as THREE from './three.module.min.js'

// ── Building Definitions ────────────────────────────────────────────────────
export const BUILDING_DEFINITIONS = {
  // Storage
  barn: {
    name: 'Barn', level: 1, cost: 1000, size: [3, 2], type: 'storage',
    effect: 'capacity+50', capacity: 50,
    wallColor: 0xb22222, roofColor: 0x8b0000, doorColor: 0x5c3a1e,
    width: 6, height: 4, depth: 4
  },
  tool_shed: {
    name: 'Tool Shed', level: 3, cost: 600, size: [2, 2], type: 'storage',
    effect: 'capacity+30', capacity: 30,
    wallColor: 0x8b6914, roofColor: 0x6b4226, doorColor: 0x5c3a1e,
    width: 4, height: 3, depth: 4
  },

  // Crafting
  bakery: {
    name: 'Bakery', level: 5, cost: 2000, size: [2, 2], type: 'crafting',
    effect: 'wheat->bread x3', icon: '🍞',
    recipes: [
      { input: 'wheat', inputQty: 3, output: 'bread', outputQty: 1, value: 75, time: 30000 },
      { input: 'corn', inputQty: 3, output: 'cornbread', outputQty: 1, value: 90, time: 35000 }
    ],
    wallColor: 0xfff8dc, roofColor: 0xdaa520, doorColor: 0x8b6914,
    width: 4, height: 3.5, depth: 4
  },
  winery: {
    name: 'Winery', level: 10, cost: 4000, size: [3, 2], type: 'crafting',
    effect: 'grapes->wine x4', icon: '🍷',
    recipes: [
      { input: 'grape', inputQty: 5, output: 'wine', outputQty: 1, value: 200, time: 60000 },
      { input: 'blueberry', inputQty: 4, output: 'blueberry_jam', outputQty: 1, value: 160, time: 45000 }
    ],
    wallColor: 0x4b0082, roofColor: 0x2e0854, doorColor: 0x5c3a1e,
    width: 6, height: 4, depth: 4
  },
  kitchen: {
    name: 'Kitchen', level: 7, cost: 2500, size: [2, 2], type: 'crafting',
    effect: 'vegetables->meals x3', icon: '🍳',
    recipes: [
      { input: 'tomato', inputQty: 2, output: 'tomato_soup', outputQty: 1, value: 90, time: 25000 },
      { input: 'potato', inputQty: 3, output: 'fries', outputQty: 1, value: 85, time: 20000 },
      { input: 'carrot', inputQty: 2, output: 'carrot_cake', outputQty: 1, value: 95, time: 30000 }
    ],
    wallColor: 0xffffff, roofColor: 0xcc3333, doorColor: 0x8b6914,
    width: 4, height: 3.5, depth: 4
  },
  spa: {
    name: 'Spa', level: 12, cost: 5000, size: [3, 2], type: 'crafting',
    effect: 'flowers->cosmetics x4', icon: '💆',
    recipes: [
      { input: 'lavender', inputQty: 4, output: 'perfume', outputQty: 1, value: 240, time: 50000 },
      { input: 'rose', inputQty: 3, output: 'rose_oil', outputQty: 1, value: 200, time: 45000 }
    ],
    wallColor: 0xe6e6fa, roofColor: 0xdda0dd, doorColor: 0x9370db,
    width: 6, height: 3.5, depth: 4
  },

  // Special
  nursery: {
    name: 'Nursery', level: 4, cost: 1500, size: [2, 2], type: 'special',
    effect: 'tree_growth_2x',
    wallColor: 0x228b22, roofColor: 0x006400, doorColor: 0x5c3a1e,
    width: 4, height: 3, depth: 4
  },
  greenhouse: {
    name: 'Greenhouse', level: 6, cost: 2000, size: [3, 2], type: 'special',
    effect: 'crop_growth_2x',
    wallColor: 0xadd8e6, roofColor: 0x87ceeb, doorColor: 0x4682b4,
    width: 6, height: 3.5, depth: 4
  },
  fuel_station: {
    name: 'Fuel Station', level: 8, cost: 3000, size: [2, 2], type: 'special',
    effect: 'vehicle_speed_2x',
    wallColor: 0xc0c0c0, roofColor: 0x808080, doorColor: 0x333333,
    width: 4, height: 3, depth: 4
  }
}

// ── Window glow colors per building type ────────────────────────────────────
const WINDOW_GLOW = {
  barn:          { pane: 0xfff3c0, emissive: 0xffa020, emissiveIntensity: 0.55 }, // warm lantern
  tool_shed:     { pane: 0xfff3c0, emissive: 0xff9010, emissiveIntensity: 0.45 },
  bakery:        { pane: 0xffe8a0, emissive: 0xff7000, emissiveIntensity: 0.75 }, // oven glow
  winery:        { pane: 0xc8a0e0, emissive: 0x8b008b, emissiveIntensity: 0.55 }, // purple glow
  kitchen:       { pane: 0xfff0b0, emissive: 0xff8800, emissiveIntensity: 0.65 },
  spa:           { pane: 0xe8d0ff, emissive: 0xaa60dd, emissiveIntensity: 0.60 },
  nursery:       { pane: 0xc8ffb0, emissive: 0x44cc44, emissiveIntensity: 0.50 }, // plant grow light
  greenhouse:    { pane: 0xe0f8ff, emissive: 0x00bcd4, emissiveIntensity: 0.45 },
  fuel_station:  { pane: 0xffffff, emissive: 0x88aaff, emissiveIntensity: 0.50 }
}

// Buildings that get a chimney (smoke-producing)
const HAS_CHIMNEY = new Set(['barn', 'bakery', 'winery', 'kitchen'])

/**
 * Helper: create a window pane box that protrudes slightly from a wall face.
 * winW/winH = window size, zOffset = how far from wall center along Z (or X).
 * axis = 'z' for front/back walls, 'x' for side walls.
 */
function _makeWindow (winW, winH, yPos, lateralPos, faceZ, axis, glowDef) {
  const thk = 0.13  // protrusion thickness
  // Frame (slightly larger, dark wood)
  const frameW = winW + 0.12
  const frameH = winH + 0.12
  const frameGeo = axis === 'z'
    ? new THREE.BoxGeometry(frameW, frameH, thk * 0.6)
    : new THREE.BoxGeometry(thk * 0.6, frameH, frameW)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3e2206, roughness: 0.85 })
  const frame = new THREE.Mesh(frameGeo, frameMat)

  // Pane (emissive lit glass)
  const paneGeo = axis === 'z'
    ? new THREE.BoxGeometry(winW, winH, thk)
    : new THREE.BoxGeometry(thk, winH, winW)
  const paneMat = new THREE.MeshStandardMaterial({
    color: glowDef.pane,
    emissive: new THREE.Color(glowDef.emissive),
    emissiveIntensity: glowDef.emissiveIntensity,
    roughness: 0.1,
    metalness: 0.0,
    transparent: true,
    opacity: 0.88
  })
  const pane = new THREE.Mesh(paneGeo, paneMat)

  const winGroup = new THREE.Group()
  winGroup.add(frame)
  winGroup.add(pane)

  if (axis === 'z') {
    winGroup.position.set(lateralPos, yPos, faceZ)
  } else {
    winGroup.position.set(faceZ, yPos, lateralPos)
  }
  return winGroup
}

/**
 * Create a 3D building mesh: box walls + pyramid hip roof + door + windows + chimney
 * @param {string} buildingType - key in BUILDING_DEFINITIONS
 * @returns {THREE.Group}
 */
export function createBuildingMesh (buildingType) {
  const def = BUILDING_DEFINITIONS[buildingType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()
  group.userData.objectType = 'building'
  group.userData.buildingType = buildingType

  const w = def.width
  const d = def.depth
  const wallH = def.height * 0.7   // wall height derived from building definition
  const roofH = def.height * 0.3   // roof peak height derived from building definition

  // --- Foundation slab: slightly wider/deeper, gives a raised-floor look ---
  const slabGeo = new THREE.BoxGeometry(w + 0.3, 0.18, d + 0.3)
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.95, metalness: 0.05 })
  const slab = new THREE.Mesh(slabGeo, slabMat)
  slab.position.y = 0.09
  slab.receiveShadow = true
  group.add(slab)

  // --- Walls: BoxGeometry ---
  const wallGeo = new THREE.BoxGeometry(w, wallH, d)
  const wallMat = new THREE.MeshStandardMaterial({
    color: def.wallColor,
    roughness: 0.85,
    metalness: 0.05
  })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = wallH / 2 + 0.18   // sit on slab
  walls.castShadow = true
  walls.receiveShadow = true
  group.add(walls)

  const wallTop = wallH + 0.18   // Y of wall top

  // --- Roof: hip/pyramid — CylinderGeometry(0, r, h, 4) gives a square pyramid.
  // After rotation.y = PI/4 the base corners align with the XZ axes, then
  // scale.x = w/√2 and scale.z = d/√2 stretches the footprint to exactly w×d.
  // openEnded=true removes the redundant bottom cap (sits flush on box top).
  const roofGeo = new THREE.CylinderGeometry(0, 1, roofH, 4, 1, true)
  const roofMat = new THREE.MeshStandardMaterial({
    color: def.roofColor,
    roughness: 0.8,
    metalness: 0.0
  })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = wallTop + roofH / 2
  roof.rotation.y = Math.PI / 4
  roof.scale.set(w / Math.SQRT2, 1, d / Math.SQRT2)
  roof.castShadow = true
  roof.receiveShadow = true
  group.add(roof)

  // --- Roof overhang accent (flat ring to give eave depth) ---
  const eaveGeo = new THREE.BoxGeometry(w + 0.4, 0.1, d + 0.4)
  const eaveMat = new THREE.MeshStandardMaterial({ color: def.roofColor, roughness: 0.8 })
  const eave = new THREE.Mesh(eaveGeo, eaveMat)
  eave.position.y = wallTop + 0.05
  eave.castShadow = true
  eave.receiveShadow = true
  group.add(eave)

  // --- Door: small box on the front face (+Z side) ---
  const doorW = Math.min(w * 0.25, 1.0)
  const doorH = Math.min(wallH * 0.55, 1.0)
  const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.12)
  const doorMat = new THREE.MeshStandardMaterial({ color: def.doorColor, roughness: 0.7 })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(0, 0.18 + doorH / 2, d / 2 + 0.06)
  door.castShadow = true
  group.add(door)

  // --- Door frame accent (thin border around door) ---
  const dfW = doorW + 0.16
  const dfH = doorH + 0.10
  const doorFrameGeo = new THREE.BoxGeometry(dfW, dfH, 0.08)
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x3e2206, roughness: 0.8 })
  const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat)
  doorFrame.position.set(0, 0.18 + doorH / 2, d / 2 + 0.02)
  group.add(doorFrame)

  // --- Windows ---
  const glowDef = WINDOW_GLOW[buildingType] || WINDOW_GLOW.barn
  const winW = Math.min(w * 0.2, 0.8)
  const winH = Math.min(wallH * 0.35, 0.75)
  const winY = 0.18 + wallH * 0.62   // upper half of wall

  if (buildingType !== 'greenhouse') {
    // Front face windows (flanking the door, +Z side)
    const frontZ = d / 2 + 0.07
    if (w >= 4) {
      // Two front windows symmetrically placed
      const offset = w * 0.28
      group.add(_makeWindow(winW, winH, winY, -offset, frontZ, 'z', glowDef))
      group.add(_makeWindow(winW, winH, winY,  offset, frontZ, 'z', glowDef))
    } else {
      // Narrow building: one small front window
      group.add(_makeWindow(winW * 0.85, winH * 0.85, winY, 0, frontZ, 'z', glowDef))
    }

    // Back face windows (-Z side)
    const backZ = -(d / 2 + 0.07)
    group.add(_makeWindow(winW, winH, winY, 0, backZ, 'z', glowDef))

    // Side windows (+X / -X faces)
    const sideWinW = Math.min(d * 0.2, 0.75)
    if (d >= 4) {
      const sideZ = 0  // center of depth
      group.add(_makeWindow(sideWinW, winH, winY, 0, w / 2 + 0.07, 'x', glowDef))
      group.add(_makeWindow(sideWinW, winH, winY, 0, -(w / 2 + 0.07), 'x', glowDef))
    }
  }

  // --- Chimney (buildings that produce smoke/heat) ---
  if (HAS_CHIMNEY.has(buildingType)) {
    const chimW = 0.35
    const chimH = roofH * 0.9 + 0.5
    const chimGeo = new THREE.BoxGeometry(chimW, chimH, chimW)
    const chimMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 })
    const chim = new THREE.Mesh(chimGeo, chimMat)
    // Place chimney off-center on the roof
    chim.position.set(w * 0.25, wallTop + chimH / 2 + roofH * 0.35, -d * 0.2)
    chim.castShadow = true
    group.add(chim)

    // Chimney cap (small wider cylinder)
    const capGeo = new THREE.CylinderGeometry(chimW * 0.7, chimW * 0.55, 0.12, 6)
    const capMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 })
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.set(w * 0.25, wallTop + chimH + roofH * 0.35 + 0.06, -d * 0.2)
    group.add(cap)
  }

  // Greenhouse special: glass-like treatment on both walls and roof
  if (buildingType === 'greenhouse') {
    wallMat.transparent = true
    wallMat.opacity = 0.45
    wallMat.depthWrite = false
    roofMat.transparent = true
    roofMat.opacity = 0.55
    roofMat.depthWrite = false
  }

  return group
}

/**
 * Create building instance data
 */
export function createBuildingData (buildingType, x, z) {
  const def = BUILDING_DEFINITIONS[buildingType]
  return {
    type: buildingType,
    x,
    z,
    builtAt: Date.now(),
    mesh: null,
    craftQueue: [], // { recipe, startedAt, done }
    active: true
  }
}

/**
 * Get building effects for game state
 */
export function getBuildingEffects (buildings) {
  const effects = {
    storageBonus: 0,
    cropGrowthMultiplier: 1,
    treeGrowthMultiplier: 1,
    vehicleSpeedMultiplier: 1
  }

  for (const b of buildings) {
    const def = BUILDING_DEFINITIONS[b.type]
    if (!def) continue

    switch (def.effect) {
      case 'capacity+50': effects.storageBonus += 50; break
      case 'capacity+30': effects.storageBonus += 30; break
      case 'crop_growth_2x': effects.cropGrowthMultiplier *= 2; break
      case 'tree_growth_2x': effects.treeGrowthMultiplier *= 2; break
      case 'vehicle_speed_2x': effects.vehicleSpeedMultiplier *= 2; break
    }
  }

  return effects
}

/**
 * Update crafting queue
 * @returns {Array} completed items
 */
export function updateCraftingQueue (building, dtMs) {
  const completed = []
  const def = BUILDING_DEFINITIONS[building.type]
  if (!def || def.type !== 'crafting') return completed

  building.craftQueue = building.craftQueue.filter(item => {
    const elapsed = Date.now() - item.startedAt
    if (elapsed >= item.recipe.time) {
      completed.push(item)
      return false
    }
    return true
  })

  return completed
}

/**
 * Start crafting a recipe in a building
 */
export function startCrafting (building, recipeIndex) {
  const def = BUILDING_DEFINITIONS[building.type]
  if (!def || def.type !== 'crafting') return null
  if (!def.recipes || recipeIndex >= def.recipes.length) return null

  const recipe = def.recipes[recipeIndex]
  building.craftQueue.push({
    recipe,
    startedAt: Date.now(),
    done: false
  })

  return recipe
}

window.BuildingSystem = { BUILDING_DEFINITIONS, createBuildingMesh, createBuildingData, getBuildingEffects, updateCraftingQueue, startCrafting }
