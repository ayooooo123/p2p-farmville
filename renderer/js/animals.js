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

const animalGeometryCache = new Map()
const animalMaterialCache = new Map()

function _markSharedAsset (asset) {
  if (!asset) return asset
  asset.userData = asset.userData || {}
  asset.userData.sharedAsset = true
  return asset
}

function _getSharedGeometry (cacheKey, factory) {
  let geometry = animalGeometryCache.get(cacheKey)
  if (!geometry) {
    geometry = _markSharedAsset(factory())
    animalGeometryCache.set(cacheKey, geometry)
  }
  return geometry
}

function _getSharedMaterial (cacheKey, factory) {
  let material = animalMaterialCache.get(cacheKey)
  if (!material) {
    material = _markSharedAsset(factory())
    animalMaterialCache.set(cacheKey, material)
  }
  return material
}

function _trackInteractiveMesh (group, mesh) {
  if (mesh?.isMesh) group.userData.interactiveMeshes.push(mesh)
  return mesh
}

/**
 * Create a 3D animal mesh with leg pivot groups for animation.
 * group.userData.legPivots = [p0, p1, ...] — rotate .rotation.x to swing.
 * @param {string} animalType
 * @returns {THREE.Group}
 */
export function createAnimalMesh (animalType) {
  const def = ANIMAL_DEFINITIONS[animalType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()
  group.userData.objectType = 'animal'
  group.userData.animalType = animalType
  group.userData.interactiveMeshes = []

  // ── 3D body: box geometry ─────────────────────────────────────────────────
  const bodyH = def.bodyH
  const bodyGeo = _getSharedGeometry(`body:${animalType}:${def.bodyW}:${bodyH}:${def.bodyD}`, () => new THREE.BoxGeometry(def.bodyW, bodyH, def.bodyD))
  const bodyMat = _getSharedMaterial(`body:${animalType}:${def.bodyColor}`, () => new THREE.MeshStandardMaterial({ color: def.bodyColor, roughness: 0.85, metalness: 0.0 }))
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  _trackInteractiveMesh(group, body)
  body.position.y = bodyH / 2
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  // Woolly overlay for sheep
  if (def.woolly) {
    const woolR = Math.max(def.bodyW, def.bodyD) * 0.55
    const woolGeo = _getSharedGeometry(`wool:${animalType}:${woolR}`, () => new THREE.SphereGeometry(woolR, 10, 8))
    const woolMat = _getSharedMaterial(`wool:${animalType}`, () => new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.98, metalness: 0.0 }))
    const wool = new THREE.Mesh(woolGeo, woolMat)
    _trackInteractiveMesh(group, wool)
    wool.position.y = bodyH * 0.75
    wool.scale.set(1, 0.65, 1)
    wool.castShadow = true
    group.add(wool)
  }

  // ── 3D head: sphere offset forward ───────────────────────────────────────
  const headFwdZ = -(def.bodyD / 2 + def.headSize * 0.55)
  const headGroup = new THREE.Group()
  headGroup.position.set(0, bodyH * 0.85, headFwdZ)
  group.add(headGroup)
  group.userData.headGroup = headGroup
  group.userData.headGroupBaseRotX = headGroup.rotation.x
  group.userData.headGroupBaseY = headGroup.position.y

  const headGeo = _getSharedGeometry(`head:${animalType}:${def.headSize}`, () => new THREE.SphereGeometry(def.headSize, 10, 8))
  const headMat = _getSharedMaterial(`head:${animalType}:${def.headColor}`, () => new THREE.MeshStandardMaterial({ color: def.headColor, roughness: 0.8, metalness: 0.0 }))
  const head = new THREE.Mesh(headGeo, headMat)
  _trackInteractiveMesh(group, head)
  head.position.set(0, 0, 0)
  head.castShadow = true
  headGroup.add(head)

  // Eyes: one small dark sphere per side, mounted on headGroup so they follow
  // the walk-cycle head animation. Shared unit geometry/material avoids adding
  // per-animal allocations for this cosmetic detail.
  const eyeGeo = _getSharedGeometry('eye:unit', () => new THREE.SphereGeometry(1, 6, 5))
  const eyeMat = _getSharedMaterial('eye:dark', () => new THREE.MeshBasicMaterial({ color: 0x111111 }))
  const eyeR = def.headSize * 0.16
  for (const ex of [-def.headSize * 0.55, def.headSize * 0.55]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat)
    eye.position.set(ex, def.headSize * 0.18, -def.headSize * 0.78)
    eye.scale.setScalar(eyeR)
    headGroup.add(eye)
  }

  // ── Legs: each wrapped in a pivot Group for rotation ─────────────────────
  // Pivot is placed at the body-bottom attachment point.
  // The leg mesh hangs downward from the pivot (position.y = -legH/2).
  const legH = bodyH * 0.55
  const legR = 0.04
  const legGeo = _getSharedGeometry(`leg:${animalType}:${legR}:${legH}`, () => new THREE.CylinderGeometry(legR, legR * 1.1, legH, 5))
  const legMat = _getSharedMaterial(`leg:${animalType}:${def.legColor}`, () => new THREE.MeshStandardMaterial({ color: def.legColor, roughness: 0.9 }))
  const legCount = def.legs === 2 ? 2 : 4
  const lxOff = def.bodyW * 0.32
  const lzOff = def.bodyD * 0.32
  // Pivot sits at y=0 (ground level body bottom attachment).
  const pivotY = 0
  const legPositions = legCount === 2
    ? [[-lxOff * 0.5, lzOff * 0.3], [lxOff * 0.5, -lzOff * 0.3]]
    : [[-lxOff, lzOff], [lxOff, lzOff], [-lxOff, -lzOff], [lxOff, -lzOff]]

  const legPivots = []
  for (const [lx, lz] of legPositions) {
    const pivot = new THREE.Group()
    pivot.position.set(lx, pivotY, lz)
    const leg = new THREE.Mesh(legGeo, legMat)
    _trackInteractiveMesh(group, leg)
    // Leg mesh center at -legH/2 so top of leg is at pivot
    leg.position.y = -legH / 2
    leg.castShadow = true
    pivot.add(leg)
    group.add(pivot)
    legPivots.push(pivot)
  }
  group.userData.legPivots = legPivots
  group.userData.legCount = legCount

  // ── Spots for cow ─────────────────────────────────────────────────────────
  if (def.spots) {
    const spotGeo = _getSharedGeometry(`spot:${animalType}`, () => new THREE.SphereGeometry(0.07, 6, 5))
    const spotMat = _getSharedMaterial(`spot:${animalType}:${def.spotColor}`, () => new THREE.MeshStandardMaterial({ color: def.spotColor, roughness: 0.9 }))
    for (let i = 0; i < 3; i++) {
      const spot = new THREE.Mesh(spotGeo, spotMat)
      _trackInteractiveMesh(group, spot)
      spot.position.set(
        (Math.random() - 0.5) * def.bodyW * 0.5,
        bodyH + 0.04,
        (Math.random() - 0.5) * def.bodyD * 0.4
      )
      group.add(spot)
    }
  }

  // ── Per-animal characteristic features ────────────────────────────────────
  if (animalType === 'chicken' || animalType === 'duck') {
    // Beak: small flat cone pointing forward
    const beakGeo = _getSharedGeometry(`beak:${animalType}`, () => new THREE.ConeGeometry(0.045, 0.14, 5))
    const beakMat = _getSharedMaterial(`beak:${animalType}`, () => new THREE.MeshStandardMaterial({ color: animalType === 'duck' ? 0xff8c00 : 0xffaa00, roughness: 0.7 }))
    const beak = new THREE.Mesh(beakGeo, beakMat)
    _trackInteractiveMesh(group, beak)
    beak.rotation.x = Math.PI / 2
    beak.position.set(0, 0, -def.headSize * 0.9)
    beak.castShadow = true
    headGroup.add(beak)

    if (animalType === 'chicken') {
      // Red comb: two small rounded bumps on top of head
      const combMat = _getSharedMaterial('comb:chicken', () => new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.8, emissive: 0x440000, emissiveIntensity: 0.3 }))
      for (let i = 0; i < 2; i++) {
        const combGeo = _getSharedGeometry(`comb:chicken:${i}`, () => new THREE.SphereGeometry(0.04 - i * 0.01, 6, 5))
        const comb = new THREE.Mesh(combGeo, combMat)
        _trackInteractiveMesh(group, comb)
        comb.position.set(i * 0.04 - 0.02, def.headSize + 0.04, 0)
        headGroup.add(comb)
      }
    }
  }

  if (animalType === 'pig') {
    // Snout: flat disc (cylinder) on nose
    const snoutGeo = _getSharedGeometry('snout:pig', () => new THREE.CylinderGeometry(0.09, 0.09, 0.04, 8))
    const snoutMat = _getSharedMaterial('snout:pig', () => new THREE.MeshStandardMaterial({ color: 0xff8fa0, roughness: 0.9 }))
    const snout = new THREE.Mesh(snoutGeo, snoutMat)
    _trackInteractiveMesh(group, snout)
    snout.rotation.x = Math.PI / 2
    snout.position.set(0, -bodyH * 0.07, -def.headSize * 0.85)
    snout.castShadow = true
    headGroup.add(snout)
    // Nostrils: two tiny dark spheres on snout face
    const nostrilGeo = _getSharedGeometry('nostril:pig', () => new THREE.SphereGeometry(0.02, 5, 4))
    const nostrilMat = _getSharedMaterial('nostril:pig', () => new THREE.MeshStandardMaterial({ color: 0xcc4455, roughness: 1 }))
    for (const nx of [-0.03, 0.03]) {
      const n = new THREE.Mesh(nostrilGeo, nostrilMat)
      _trackInteractiveMesh(group, n)
      n.position.set(nx, -bodyH * 0.07, -def.headSize * 0.85 - 0.03)
      headGroup.add(n)
    }
  }

  if (animalType === 'rabbit') {
    // Long upright ears: two tall thin cylinders with pink inner ear
    const earGeo = _getSharedGeometry('ear:rabbit', () => new THREE.CylinderGeometry(0.025, 0.03, 0.38, 5))
    const earMat = _getSharedMaterial(`ear:rabbit:${def.headColor}`, () => new THREE.MeshStandardMaterial({ color: def.headColor, roughness: 0.9 }))
    const innerGeo = _getSharedGeometry('ear-inner:rabbit', () => new THREE.CylinderGeometry(0.012, 0.016, 0.28, 5))
    const innerEarMat = _getSharedMaterial('ear-inner:rabbit', () => new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.95 }))
    for (const ex of [-0.07, 0.07]) {
      const ear = new THREE.Mesh(earGeo, earMat)
      _trackInteractiveMesh(group, ear)
      ear.position.set(ex, def.headSize + 0.19, 0)
      ear.castShadow = true
      headGroup.add(ear)
      const inner = new THREE.Mesh(innerGeo, innerEarMat)
      _trackInteractiveMesh(group, inner)
      inner.position.set(ex, def.headSize + 0.19, -0.018)
      headGroup.add(inner)
    }
  }

  if (animalType === 'horse' || animalType === 'donkey') {
    // Mane: elongated sphere along the neck top
    const maneColor = animalType === 'horse' ? 0x4a2a10 : 0x444444
    const maneMat = _getSharedMaterial(`mane:${animalType}:${maneColor}`, () => new THREE.MeshStandardMaterial({ color: maneColor, roughness: 0.95 }))
    const maneGeo = _getSharedGeometry(`mane:${animalType}:${def.headSize}`, () => new THREE.SphereGeometry(def.headSize * 0.55, 8, 6))
    const mane = new THREE.Mesh(maneGeo, maneMat)
    _trackInteractiveMesh(group, mane)
    mane.scale.set(0.5, 0.6, 2.2)
    mane.position.set(0, bodyH * 0.95, headFwdZ * 0.45)
    mane.castShadow = true
    group.add(mane)
    // Tail: small tuft at rear
    const tailGeo = _getSharedGeometry(`tail:${animalType}:${def.headSize}`, () => new THREE.SphereGeometry(def.headSize * 0.35, 6, 5))
    const tail = new THREE.Mesh(tailGeo, maneMat)
    _trackInteractiveMesh(group, tail)
    tail.scale.set(0.5, 0.9, 1.4)
    tail.position.set(0, bodyH * 0.7, def.bodyD / 2 + 0.12)
    group.add(tail)
  }

  if (animalType === 'cow' || animalType === 'goat') {
    // Horns: two small cones on head top
    const hornColor = animalType === 'cow' ? 0xc8a96e : 0xd4b483
    const hornGeo = _getSharedGeometry(`horn:${animalType}`, () => new THREE.ConeGeometry(0.025, 0.12, 5))
    const hornMat = _getSharedMaterial(`horn:${animalType}:${hornColor}`, () => new THREE.MeshStandardMaterial({ color: hornColor, roughness: 0.7 }))
    for (const hx of [-def.headSize * 0.5, def.headSize * 0.5]) {
      const horn = new THREE.Mesh(hornGeo, hornMat)
      _trackInteractiveMesh(group, horn)
      horn.position.set(hx, def.headSize + 0.05, 0)
      horn.rotation.z = hx < 0 ? 0.3 : -0.3
      horn.castShadow = true
      headGroup.add(horn)
    }
  }

  if (animalType === 'sheep') {
    // Small dark snout protrusion visible through wool
    const snoutMat = _getSharedMaterial('snout:sheep', () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }))
    const snoutGeo = _getSharedGeometry('snout:sheep', () => new THREE.SphereGeometry(0.06, 6, 5))
    const snout = new THREE.Mesh(snoutGeo, snoutMat)
    _trackInteractiveMesh(group, snout)
    snout.scale.set(1, 0.7, 0.8)
    snout.position.set(0, -bodyH * 0.07, -def.headSize * 0.5)
    headGroup.add(snout)
  }

  if (animalType === 'llama') {
    // Pointed ears
    const earGeo = _getSharedGeometry('ear:llama', () => new THREE.CylinderGeometry(0.02, 0.035, 0.2, 5))
    const earMat = _getSharedMaterial(`ear:llama:${def.headColor}`, () => new THREE.MeshStandardMaterial({ color: def.headColor, roughness: 0.9 }))
    for (const ex of [-0.1, 0.1]) {
      const ear = new THREE.Mesh(earGeo, earMat)
      _trackInteractiveMesh(group, ear)
      ear.position.set(ex, def.headSize + 0.1, 0)
      ear.rotation.z = ex < 0 ? 0.2 : -0.2
      headGroup.add(ear)
    }
    // Fluffy elongated neck
    const neckMat = _getSharedMaterial(`neck:${animalType}:${def.bodyColor}`, () => new THREE.MeshStandardMaterial({ color: def.bodyColor, roughness: 0.98 }))
    const neckGeo = _getSharedGeometry(`neck:${animalType}:${def.headSize}`, () => new THREE.SphereGeometry(def.headSize * 0.7, 8, 6))
    const neck = new THREE.Mesh(neckGeo, neckMat)
    _trackInteractiveMesh(group, neck)
    neck.scale.set(0.6, 2.0, 0.6)
    neck.position.set(0, bodyH * 0.85, headFwdZ * 0.55)
    neck.castShadow = true
    group.add(neck)
  }

  return group
}

/**
 * Create animal instance data.
 * Includes wander state for idle movement.
 */
export function createAnimalData (animalType, x, z) {
  return {
    type: animalType,
    x,
    z,
    // home position — animal stays near this
    homeX: x,
    homeZ: z,
    placedAt: Date.now(),
    lastFed: 0,
    fed: false,
    productReady: false,
    mesh: null,
    // animation
    bobPhase: Math.random() * Math.PI * 2,
    walkPhase: Math.random() * Math.PI * 2,
    // wander
    wanderAngle: Math.random() * Math.PI * 2,
    wanderTimer: Math.random() * 2000,   // ms until next state change
    walking: false,
    walkSpeed: 0.8 + Math.random() * 0.5  // world units / second
  }
}

const LEG_SWING = 0.45  // radians peak swing
const WALK_CYCLE_SPEED = 7.0  // rad/s at full walk
const WANDER_RADIUS = 0.8     // max distance from home tile center

/**
 * Update animal state — wander movement + leg swing + body bob.
 * @param {object} animal
 * @param {number} dtMs — delta time in milliseconds
 * @returns {boolean} true if visual state changed (product ready)
 */
export function updateAnimalState (animal, dtMs) {
  const def = ANIMAL_DEFINITIONS[animal.type]
  if (!def) return false

  let changed = false
  const dt = dtMs / 1000  // seconds

  // ── Product ready check ───────────────────────────────────────────────────
  if (animal.fed && !animal.productReady) {
    const elapsed = Date.now() - animal.lastFed
    if (elapsed >= def.harvestTime) {
      animal.productReady = true
      changed = true
    }
  }

  if (!animal.mesh) return changed

  const legPivots = animal.mesh.userData.legPivots
  const legCount = animal.mesh.userData.legCount || 0

  // ── Wander state machine ──────────────────────────────────────────────────
  animal.wanderTimer -= dtMs
  if (animal.wanderTimer <= 0) {
    if (animal.walking) {
      // Stop walking, pause 2-5 seconds
      animal.walking = false
      animal.wanderTimer = 2000 + Math.random() * 3000
    } else {
      // Start walking — pick a new random heading biased back toward home
      const dx = animal.homeX - animal.x
      const dz = animal.homeZ - animal.z
      const distFromHome = Math.sqrt(dx * dx + dz * dz)
      if (distFromHome > WANDER_RADIUS * 0.6) {
        // Drift back toward home with some noise
        animal.wanderAngle = Math.atan2(dz, dx) + (Math.random() - 0.5) * 1.0
      } else {
        animal.wanderAngle = Math.random() * Math.PI * 2
      }
      animal.walking = true
      animal.wanderTimer = 800 + Math.random() * 1500
    }
  }

  // ── Movement ──────────────────────────────────────────────────────────────
  if (animal.walking) {
    const speed = animal.walkSpeed
    const nx = animal.x + Math.cos(animal.wanderAngle) * speed * dt
    const nz = animal.z + Math.sin(animal.wanderAngle) * speed * dt
    // Clamp to wander radius around home
    const dxH = nx - animal.homeX
    const dzH = nz - animal.homeZ
    const dist = Math.sqrt(dxH * dxH + dzH * dzH)
    if (dist <= WANDER_RADIUS) {
      animal.x = nx
      animal.z = nz
    } else {
      // Hit boundary — stop and turn
      animal.walking = false
      animal.wanderTimer = 500
    }
    animal.mesh.position.x = animal.x
    animal.mesh.position.z = animal.z
    // Face direction of travel
    animal.mesh.rotation.y = -animal.wanderAngle + Math.PI / 2
  }

  // ── Walk cycle (leg swing) ────────────────────────────────────────────────
  if (animal.walking) {
    animal.walkPhase += WALK_CYCLE_SPEED * dt
  } else {
    // Smoothly return legs to neutral
    animal.walkPhase *= 0.9
  }

  if (legPivots && legPivots.length > 0) {
    const phase = animal.walkPhase
    if (legCount === 4) {
      // Diagonal trot gait: FL+BR swing together, FR+BL counter-swing
      // [0]=FL, [1]=FR, [2]=BL, [3]=BR
      legPivots[0].rotation.x =  Math.sin(phase) * LEG_SWING  // FL
      legPivots[3].rotation.x =  Math.sin(phase) * LEG_SWING  // BR — same phase as FL
      legPivots[1].rotation.x = -Math.sin(phase) * LEG_SWING  // FR
      legPivots[2].rotation.x = -Math.sin(phase) * LEG_SWING  // BL — same as FR
    } else if (legCount === 2) {
      // Biped alternating
      legPivots[0].rotation.x =  Math.sin(phase) * LEG_SWING
      legPivots[1].rotation.x = -Math.sin(phase) * LEG_SWING
    }
  }

  // ── Body bob ──────────────────────────────────────────────────────────────
  animal.bobPhase += dtMs * (animal.walking ? 0.008 : 0.002)
  const bobY = Math.sin(animal.bobPhase) * (animal.walking ? 0.04 : 0.02)
  animal.mesh.position.y = bobY

  // ── Head nod ──────────────────────────────────────────────────────────────
  const headPivot = animal.mesh.userData.headGroup
  if (headPivot) {
    if (animal.walkAmount === undefined) animal.walkAmount = 0
    const walkTarget = animal.walking ? 1 : 0
    const k = Math.min(1, 6 * dt)
    animal.walkAmount += (walkTarget - animal.walkAmount) * k

    const baseY = animal.mesh.userData.headGroupBaseY ?? headPivot.position.y
    const baseRotX = animal.mesh.userData.headGroupBaseRotX ?? headPivot.rotation.x
    const walkRot = Math.sin(animal.walkPhase) * 0.08
    const walkY = Math.sin(animal.walkPhase + Math.PI / 2) * 0.015
    const idleRot = Math.sin(animal.bobPhase * 0.5) * 0.025
    const idleY = Math.sin(animal.bobPhase * 0.5) * 0.005
    const w = animal.walkAmount
    headPivot.rotation.x = baseRotX + walkRot * w + idleRot * (1 - w)
    headPivot.position.y = baseY + walkY * w + idleY * (1 - w)
  }

  return changed
}

/**
 * Feed an animal - starts production timer
 */
export function feedAnimal (animal) {
  const def = ANIMAL_DEFINITIONS[animal.type]
  if (!def) return null
  if (animal.fed && !animal.productReady) return null

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
