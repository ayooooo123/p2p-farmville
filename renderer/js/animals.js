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
 * Create a simple low-poly 3D animal mesh
 * @param {string} animalType - key in ANIMAL_DEFINITIONS
 * @returns {THREE.Group}
 */
export function createAnimalMesh (animalType) {
  const def = ANIMAL_DEFINITIONS[animalType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()
  group.userData.objectType = 'animal'
  group.userData.animalType = animalType

  // Body
  const bodyGeo = def.woolly
    ? new THREE.SphereGeometry(Math.max(def.bodyW, def.bodyD) * 0.5, 8, 6)
    : new THREE.BoxGeometry(def.bodyW, def.bodyH, def.bodyD)
  const bodyMat = new THREE.MeshStandardMaterial({ color: def.bodyColor })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  const legH = def.legs === 2 ? 0.25 : 0.4
  body.position.y = legH + def.bodyH / 2
  body.castShadow = true
  group.add(body)

  // Spots for cow
  if (def.spots) {
    const spotMat = new THREE.MeshStandardMaterial({ color: def.spotColor })
    for (let i = 0; i < 3; i++) {
      const spotGeo = new THREE.SphereGeometry(0.12, 6, 4)
      const spot = new THREE.Mesh(spotGeo, spotMat)
      spot.position.set(
        (Math.random() - 0.5) * def.bodyW * 0.6,
        body.position.y + (Math.random() - 0.5) * def.bodyH * 0.3,
        (Math.random() - 0.5) * def.bodyD * 0.5
      )
      spot.scale.set(1, 0.5, 1)
      group.add(spot)
    }
  }

  // Head
  const headGeo = new THREE.SphereGeometry(def.headSize, 8, 6)
  const headMat = new THREE.MeshStandardMaterial({ color: def.headColor })
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.set(0, body.position.y + def.bodyH * 0.2, -def.bodyD / 2 - def.headSize * 0.6)
  head.castShadow = true
  group.add(head)

  // Beak/snout for certain animals
  if (animalType === 'chicken' || animalType === 'duck') {
    const beakGeo = new THREE.ConeGeometry(0.05, 0.12, 4)
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xff8c00 })
    const beak = new THREE.Mesh(beakGeo, beakMat)
    beak.rotation.x = Math.PI / 2
    beak.position.set(0, head.position.y - 0.02, head.position.z - def.headSize - 0.04)
    group.add(beak)
  }

  // Ears for rabbit
  if (animalType === 'rabbit') {
    const earMat = new THREE.MeshStandardMaterial({ color: 0xddccbb })
    for (const side of [-1, 1]) {
      const earGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.3, 4)
      const ear = new THREE.Mesh(earGeo, earMat)
      ear.position.set(side * 0.08, head.position.y + 0.2, head.position.z)
      ear.rotation.z = side * 0.2
      group.add(ear)
    }
  }

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.05, 0.06, legH, 5)
  const legMat = new THREE.MeshStandardMaterial({ color: def.legColor })
  if (def.legs === 2) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, legMat)
      leg.position.set(side * def.bodyW * 0.25, legH / 2, 0)
      group.add(leg)
    }
  } else {
    const offX = def.bodyW * 0.35
    const offZ = def.bodyD * 0.3
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(legGeo, legMat)
      leg.position.set(sx * offX, legH / 2, sz * offZ)
      group.add(leg)
    }
  }

  // Tail (simple small cylinder)
  const tailGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.2, 4)
  const tailMat = new THREE.MeshStandardMaterial({ color: def.bodyColor })
  const tail = new THREE.Mesh(tailGeo, tailMat)
  tail.position.set(0, body.position.y, def.bodyD / 2 + 0.08)
  tail.rotation.x = -0.5
  group.add(tail)

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
