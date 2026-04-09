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

/**
 * Create a 3D building mesh: box walls + pyramid hip roof + door
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

  // --- Walls: BoxGeometry ---
  const wallGeo = new THREE.BoxGeometry(w, wallH, d)
  const wallMat = new THREE.MeshStandardMaterial({
    color: def.wallColor,
    roughness: 0.85,
    metalness: 0.05
  })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = wallH / 2
  walls.castShadow = true
  walls.receiveShadow = true
  group.add(walls)

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
  roof.position.y = wallH + roofH / 2
  roof.rotation.y = Math.PI / 4
  roof.scale.set(w / Math.SQRT2, 1, d / Math.SQRT2)
  roof.castShadow = true
  roof.receiveShadow = true
  group.add(roof)

  // --- Door: small box on the front face (+Z side) ---
  const doorW = Math.min(w * 0.25, 1.0)
  const doorH = Math.min(wallH * 0.55, 1.0)
  const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.12)
  const doorMat = new THREE.MeshStandardMaterial({ color: def.doorColor, roughness: 0.7 })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(0, doorH / 2, d / 2 + 0.06)
  door.castShadow = true
  group.add(door)

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
