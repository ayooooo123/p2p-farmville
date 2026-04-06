import * as THREE from './three.module.min.js'

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

/**
 * Create a flat top-down tree mesh (circle representing canopy from above)
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

  // Canopy circle (flat from above)
  const canopyR = def.canopySize * scale
  const canopyGeo = new THREE.CircleGeometry(canopyR, 20)
  const canopyMat = new THREE.MeshStandardMaterial({ color: def.canopyColor })
  const canopy = new THREE.Mesh(canopyGeo, canopyMat)
  canopy.rotation.x = -Math.PI / 2
  canopy.position.y = 0.02
  group.add(canopy)

  // Small trunk circle in center (visible from above)
  const trunkR = 0.2 * scale
  const trunkGeo = new THREE.CircleGeometry(trunkR, 8)
  const trunkMat = new THREE.MeshStandardMaterial({ color: def.trunkColor })
  const trunk = new THREE.Mesh(trunkGeo, trunkMat)
  trunk.rotation.x = -Math.PI / 2
  trunk.position.y = 0.025
  group.add(trunk)

  // Fruit dots (only on mature trees at full growth)
  if (mature && scale >= 0.9) {
    const fruitCount = 4 + Math.floor(Math.random() * 3)
    for (let i = 0; i < fruitCount; i++) {
      const angle = (i / fruitCount) * Math.PI * 2 + Math.random() * 0.5
      const r = canopyR * (0.4 + Math.random() * 0.35)
      const fruitGeo = new THREE.CircleGeometry(0.12, 6)
      const fruitMat = new THREE.MeshStandardMaterial({ color: def.fruitColor })
      const fruit = new THREE.Mesh(fruitGeo, fruitMat)
      fruit.rotation.x = -Math.PI / 2
      fruit.position.set(Math.cos(angle) * r, 0.03, Math.sin(angle) * r)
      group.add(fruit)
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

window.TreeSystem = { TREE_DEFINITIONS, createTreeMesh, createTreeData, updateTreeGrowth, isTreeReady, harvestTree }
