import * as THREE from './three.module.min.js'

// ── 10+ Animal Definitions ──────────────────────────────────────────────────
export const ANIMAL_DEFINITIONS = {
  chicken: {
    name: 'Chicken', level: 1, cost: 150, feedCost: 10, harvestTime: 60000,
    product: 'Eggs', sellPrice: 30, xp: 3,
    bodyColor: 0xffdd44, headColor: 0xffee66, legColor: 0xff8c00,
    bodyW: 0.5, bodyH: 0.4, bodyD: 0.6, headSize: 0.2, legs: 2
  },
  cow: {
    name: 'Cow', level: 3, cost: 500, feedCost: 25, harvestTime: 120000,
    product: 'Milk', sellPrice: 65, xp: 6,
    bodyColor: 0xf5f5f5, headColor: 0xf0f0f0, legColor: 0x333333,
    bodyW: 0.9, bodyH: 0.7, bodyD: 1.2, headSize: 0.35, legs: 4,
    spots: true, spotColor: 0x222222
  },
  horse: {
    name: 'Horse', level: 5, cost: 800, feedCost: 30, harvestTime: 180000,
    product: 'Horseshoe', sellPrice: 100, xp: 10,
    bodyColor: 0x8b4513, headColor: 0x7a3b10, legColor: 0x5c3a1e,
    bodyW: 0.7, bodyH: 0.8, bodyD: 1.4, headSize: 0.4, legs: 4
  },
  sheep: {
    name: 'Sheep', level: 4, cost: 400, feedCost: 20, harvestTime: 100000,
    product: 'Wool', sellPrice: 55, xp: 5,
    bodyColor: 0xfafafa, headColor: 0x333333, legColor: 0x333333,
    bodyW: 0.7, bodyH: 0.6, bodyD: 0.9, headSize: 0.25, legs: 4, woolly: true
  },
  pig: {
    name: 'Pig', level: 6, cost: 600, feedCost: 25, harvestTime: 150000,
    product: 'Truffles', sellPrice: 85, xp: 8,
    bodyColor: 0xffb6c1, headColor: 0xffaaaa, legColor: 0xffaaaa,
    bodyW: 0.7, bodyH: 0.5, bodyD: 0.9, headSize: 0.3, legs: 4
  },
  goat: {
    name: 'Goat', level: 7, cost: 550, feedCost: 22, harvestTime: 130000,
    product: 'Goat Milk', sellPrice: 75, xp: 7,
    bodyColor: 0xd2b48c, headColor: 0xc4a882, legColor: 0x8b6914,
    bodyW: 0.6, bodyH: 0.6, bodyD: 1.0, headSize: 0.25, legs: 4
  },
  duck: {
    name: 'Duck', level: 2, cost: 200, feedCost: 12, harvestTime: 70000,
    product: 'Duck Eggs', sellPrice: 35, xp: 4,
    bodyColor: 0xf5f5f5, headColor: 0x006400, legColor: 0xff8c00,
    bodyW: 0.4, bodyH: 0.35, bodyD: 0.55, headSize: 0.2, legs: 2
  },
  rabbit: {
    name: 'Rabbit', level: 3, cost: 250, feedCost: 10, harvestTime: 80000,
    product: 'Angora Wool', sellPrice: 45, xp: 4,
    bodyColor: 0xddd5cc, headColor: 0xddd5cc, legColor: 0xccbbaa,
    bodyW: 0.35, bodyH: 0.35, bodyD: 0.5, headSize: 0.2, legs: 4
  },
  donkey: {
    name: 'Donkey', level: 8, cost: 700, feedCost: 28, harvestTime: 160000,
    product: 'Donkey Milk', sellPrice: 90, xp: 9,
    bodyColor: 0x808080, headColor: 0x696969, legColor: 0x555555,
    bodyW: 0.7, bodyH: 0.75, bodyD: 1.3, headSize: 0.35, legs: 4
  },
  llama: {
    name: 'Llama', level: 10, cost: 900, feedCost: 30, harvestTime: 200000,
    product: 'Llama Wool', sellPrice: 120, xp: 12,
    bodyColor: 0xf5deb3, headColor: 0xf0d8a8, legColor: 0xdeb887,
    bodyW: 0.6, bodyH: 0.9, bodyD: 1.1, headSize: 0.3, legs: 4
  }
}

/**
 * Create a flat top-down animal mesh (colored circle/oval from above)
 * @param {string} animalType - key in ANIMAL_DEFINITIONS
 * @returns {THREE.Group}
 */
export function createAnimalMesh (animalType) {
  const def = ANIMAL_DEFINITIONS[animalType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()
  group.userData.objectType = 'animal'
  group.userData.animalType = animalType

  // Body oval/circle (flat from above)
  const bodyR = Math.max(def.bodyW, def.bodyD) * 0.5
  const bodyGeo = new THREE.CircleGeometry(bodyR, 16)
  const bodyMat = new THREE.MeshStandardMaterial({ color: def.bodyColor })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.rotation.x = -Math.PI / 2
  body.position.y = 0.02
  // Stretch to oval for non-square animals
  if (def.bodyD > def.bodyW * 1.2) {
    body.scale.set(def.bodyW / def.bodyD, 1, 1)
  }
  group.add(body)

  // Head circle (slightly offset forward)
  const headGeo = new THREE.CircleGeometry(def.headSize, 12)
  const headMat = new THREE.MeshStandardMaterial({ color: def.headColor })
  const head = new THREE.Mesh(headGeo, headMat)
  head.rotation.x = -Math.PI / 2
  head.position.set(0, 0.025, -bodyR * 0.7)
  group.add(head)

  // Spots for cow (small dark circles)
  if (def.spots) {
    const spotMat = new THREE.MeshStandardMaterial({ color: def.spotColor })
    for (let i = 0; i < 3; i++) {
      const spotGeo = new THREE.CircleGeometry(0.1, 6)
      const spot = new THREE.Mesh(spotGeo, spotMat)
      spot.rotation.x = -Math.PI / 2
      spot.position.set(
        (Math.random() - 0.5) * bodyR * 0.8,
        0.03,
        (Math.random() - 0.5) * bodyR * 0.6
      )
      group.add(spot)
    }
  }

  return group
}

/**
 * Create animal instance data
 */
export function createAnimalData (animalType, x, z) {
  return {
    type: animalType,
    x,
    z,
    placedAt: Date.now(),
    lastFed: 0,
    fed: false,
    productReady: false,
    mesh: null,
    bobPhase: Math.random() * Math.PI * 2
  }
}

/**
 * Update animal state
 * @returns {boolean} true if visual state changed
 */
export function updateAnimalState (animal, dtMs) {
  const def = ANIMAL_DEFINITIONS[animal.type]
  if (!def) return false

  let changed = false

  // Check if product is ready
  if (animal.fed && !animal.productReady) {
    const elapsed = Date.now() - animal.lastFed
    if (elapsed >= def.harvestTime) {
      animal.productReady = true
      changed = true
    }
  }

  // Idle bobbing animation
  if (animal.mesh) {
    animal.bobPhase += dtMs * 0.003
    animal.mesh.position.y = Math.sin(animal.bobPhase) * 0.03
  }

  return changed
}

/**
 * Feed an animal - starts production timer
 */
export function feedAnimal (animal) {
  const def = ANIMAL_DEFINITIONS[animal.type]
  if (!def) return null
  if (animal.fed && !animal.productReady) return null // already fed, waiting

  animal.lastFed = Date.now()
  animal.fed = true
  animal.productReady = false

  return { feedCost: def.feedCost }
}

/**
 * Collect animal product
 */
export function collectAnimalProduct (animal) {
  const def = ANIMAL_DEFINITIONS[animal.type]
  if (!def || !animal.productReady) return null

  animal.fed = false
  animal.productReady = false

  return {
    coins: def.sellPrice,
    xp: def.xp,
    product: def.product
  }
}

window.AnimalSystem = { ANIMAL_DEFINITIONS, createAnimalMesh, createAnimalData, updateAnimalState, feedAnimal, collectAnimalProduct }
