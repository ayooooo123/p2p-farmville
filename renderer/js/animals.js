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
    spots: true, spotColor: 0x222222, grazeable: true
  },
  horse: {
    name: 'Horse', level: 5, cost: 800, feedCost: 30, harvestTime: 180000,
    product: 'Horseshoe', sellPrice: 100, xp: 10,
    bodyColor: 0x8b4513, headColor: 0x7a3b10, legColor: 0x5c3a1e,
    bodyW: 0.7, bodyH: 0.8, bodyD: 1.4, headSize: 0.4, legs: 4, grazeable: true
  },
  sheep: {
    name: 'Sheep', level: 4, cost: 400, feedCost: 20, harvestTime: 100000,
    product: 'Wool', sellPrice: 55, xp: 5,
    bodyColor: 0xfafafa, headColor: 0x333333, legColor: 0x333333,
    bodyW: 0.7, bodyH: 0.6, bodyD: 0.9, headSize: 0.25, legs: 4, woolly: true, grazeable: true
  },
  pig: {
    name: 'Pig', level: 6, cost: 600, feedCost: 25, harvestTime: 150000,
    product: 'Truffles', sellPrice: 85, xp: 8,
    bodyColor: 0xffb6c1, headColor: 0xffaaaa, legColor: 0xffaaaa,
    bodyW: 0.7, bodyH: 0.5, bodyD: 0.9, headSize: 0.3, legs: 4, grazeable: true
  },
  goat: {
    name: 'Goat', level: 7, cost: 550, feedCost: 22, harvestTime: 130000,
    product: 'Goat Milk', sellPrice: 75, xp: 7,
    bodyColor: 0xd2b48c, headColor: 0xc4a882, legColor: 0x8b6914,
    bodyW: 0.6, bodyH: 0.6, bodyD: 1.0, headSize: 0.25, legs: 4, grazeable: true
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
    bodyW: 0.35, bodyH: 0.35, bodyD: 0.5, headSize: 0.2, legs: 4, hopGait: true
  },
  donkey: {
    name: 'Donkey', level: 8, cost: 700, feedCost: 28, harvestTime: 160000,
    product: 'Donkey Milk', sellPrice: 90, xp: 9,
    bodyColor: 0x808080, headColor: 0x696969, legColor: 0x555555,
    bodyW: 0.7, bodyH: 0.75, bodyD: 1.3, headSize: 0.35, legs: 4, grazeable: true
  },
  llama: {
    name: 'Llama', level: 10, cost: 900, feedCost: 30, harvestTime: 200000,
    product: 'Llama Wool', sellPrice: 120, xp: 12,
    bodyColor: 0xf5deb3, headColor: 0xf0d8a8, legColor: 0xdeb887,
    bodyW: 0.6, bodyH: 0.9, bodyD: 1.1, headSize: 0.3, legs: 4, grazeable: true
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
  group.userData.headGroupBaseRotY = headGroup.rotation.y
  group.userData.headGroupBaseY = headGroup.position.y
  group.userData.grazeable = !!def.grazeable
  group.userData.grazeHeadSize = def.headSize

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
  const eyeMeshes = []
  for (const ex of [-def.headSize * 0.55, def.headSize * 0.55]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat)
    eye.position.set(ex, def.headSize * 0.18, -def.headSize * 0.78)
    eye.scale.setScalar(eyeR)
    eye.userData.baseScaleY = eye.scale.y
    headGroup.add(eye)
    eyeMeshes.push(eye)
  }
  group.userData.eyeMeshes = eyeMeshes

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
  group.userData.hopGait = !!def.hopGait

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

    // Wings: thin slab on each flank, in pivot groups so they can flap.
    // Pivot sits on the body surface at a shoulder-like attach point; the wing
    // hangs down from the pivot so rotation.z pivots the tip outward/inward
    // in the XZ top-down projection. Cosmetic only — not tracked as interactive
    // to keep the raycast set small. Initialized to the resting spread so there
    // is no visible snap on the first animation tick.
    const wingW = 0.04
    const wingH = def.bodyH * 0.55
    const wingD = def.bodyD * 0.65
    const wingGeo = _getSharedGeometry(
      `wing:${animalType}:${wingW}:${wingH}:${wingD}`,
      () => new THREE.BoxGeometry(wingW, wingH, wingD)
    )
    const wingPivots = []
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group()
      pivot.position.set(sx * (def.bodyW / 2 + wingW / 2), bodyH * 0.65, 0)
      pivot.rotation.z = sx * WING_BASE_SPREAD
      const wing = new THREE.Mesh(wingGeo, bodyMat)
      wing.position.set(0, -wingH * 0.4, 0)
      wing.castShadow = true
      pivot.add(wing)
      pivot.userData.isWingPivot = true
      pivot.userData.sign = sx
      group.add(pivot)
      wingPivots.push(pivot)
    }
    group.userData.wingPivots = wingPivots
    group.userData.peckable = true
    group.userData.peckHeadSize = def.headSize
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
    // Curly tail: partial torus laid flat in the XZ plane so the 3/4 curl is
    // visible from the top-down orthographic camera. A tiny stem cylinder
    // connects the rump to the curl so it doesn't read as floating. Pivot
    // rotates around Y to wiggle side-to-side.
    const tailMat = _getSharedMaterial('tail:pig', () => new THREE.MeshStandardMaterial({ color: 0xffaaaa, roughness: 0.9 }))
    const tailCurlGeo = _getSharedGeometry('tail:pig:curl', () => new THREE.TorusGeometry(0.05, 0.015, 6, 10, Math.PI * 1.5))
    const tailStemGeo = _getSharedGeometry('tail:pig:stem', () => new THREE.CylinderGeometry(0.015, 0.018, 0.06, 5))

    const tailPivot = new THREE.Group()
    tailPivot.position.set(0, bodyH * 0.75, def.bodyD / 2 + 0.02)

    const tailStem = new THREE.Mesh(tailStemGeo, tailMat)
    tailStem.rotation.x = Math.PI / 2                // lay cylinder along Z (rearward)
    tailStem.position.set(0, 0, 0.03)                // bridge from rump to curl
    tailStem.castShadow = true
    tailPivot.add(tailStem)

    const tailCurl = new THREE.Mesh(tailCurlGeo, tailMat)
    tailCurl.rotation.x = Math.PI / 2                // ring flat in XZ plane → readable from above
    tailCurl.rotation.z = 0.25                       // slight cant so curl opens up visually
    tailCurl.position.set(0, 0.02, 0.08)             // sit just behind stem end
    tailCurl.castShadow = true
    tailPivot.add(tailCurl)

    group.add(tailPivot)
    group.userData.pigTailPivot = tailPivot
  }

  if (animalType === 'rabbit') {
    // Long upright ears wrapped in pivot Groups so they can twitch from the base.
    // Pivot sits at the top of the head; ear meshes are offset upward inside the
    // pivot so the cylinder extends from the pivot point upward — rotating the
    // pivot tilts the ear from its base, like a real rabbit ear.
    const earGeo = _getSharedGeometry('ear:rabbit', () => new THREE.CylinderGeometry(0.025, 0.03, 0.38, 5))
    const earMat = _getSharedMaterial(`ear:rabbit:${def.headColor}`, () => new THREE.MeshStandardMaterial({ color: def.headColor, roughness: 0.9 }))
    const innerGeo = _getSharedGeometry('ear-inner:rabbit', () => new THREE.CylinderGeometry(0.012, 0.016, 0.28, 5))
    const innerEarMat = _getSharedMaterial('ear-inner:rabbit', () => new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.95 }))
    const earPivots = []
    for (const ex of [-0.07, 0.07]) {
      const pivot = new THREE.Group()
      pivot.position.set(ex, def.headSize, 0)
      // Slight outward cant so ears silhouette better from top-down.
      pivot.rotation.z = ex < 0 ? 0.10 : -0.10
      pivot.userData.baseRotX = pivot.rotation.x
      pivot.userData.baseRotZ = pivot.rotation.z
      pivot.userData.sign = ex < 0 ? -1 : 1

      const ear = new THREE.Mesh(earGeo, earMat)
      _trackInteractiveMesh(group, ear)
      ear.position.set(0, 0.19, 0)
      ear.castShadow = true
      pivot.add(ear)

      const inner = new THREE.Mesh(innerGeo, innerEarMat)
      _trackInteractiveMesh(group, inner)
      inner.position.set(0, 0.19, -0.018)
      pivot.add(inner)

      headGroup.add(pivot)
      earPivots.push(pivot)
    }
    group.userData.earPivots = earPivots
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
    // Tail: small tuft at rear, wrapped in a pivot Group so it swishes
    // sideways around the rump attachment point (rotation.y on the pivot).
    const tailGeo = _getSharedGeometry(`tail:${animalType}:${def.headSize}`, () => new THREE.SphereGeometry(def.headSize * 0.35, 6, 5))
    const tail = new THREE.Mesh(tailGeo, maneMat)
    _trackInteractiveMesh(group, tail)
    tail.scale.set(0.5, 0.9, 1.4)
    tail.position.set(0, 0, 0.12)          // local offset from pivot (attached at rump)
    tail.castShadow = true
    const tailPivot = new THREE.Group()
    tailPivot.position.set(0, bodyH * 0.7, def.bodyD / 2)
    tailPivot.add(tail)
    group.add(tailPivot)
    group.userData.tailPivot = tailPivot
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

  if (animalType === 'cow') {
    // Thin whip-tail: shaft extending backward from the rump with a dark tuft
    // at the tip. Shaft uses the body material (no extra cache entry). Pivot
    // yaw is driven by the existing tailPivot swish animation in updateAnimalState
    // so rotation.y sweeps the tuft side-to-side from top-down.
    const shaftLen = 0.3
    const shaftGeo = _getSharedGeometry('tail:cow:shaft', () => new THREE.CylinderGeometry(0.012, 0.018, shaftLen, 5))
    const tuftGeo = _getSharedGeometry('tail:cow:tuft', () => new THREE.SphereGeometry(0.045, 6, 5))
    const tuftMat = _getSharedMaterial('tail:cow:tuft', () => new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 }))

    const tailPivot = new THREE.Group()
    tailPivot.position.set(0, bodyH * 0.68, def.bodyD / 2 + 0.01)

    const shaft = new THREE.Mesh(shaftGeo, bodyMat)
    _trackInteractiveMesh(group, shaft)
    shaft.rotation.x = Math.PI / 2            // lay cylinder along local +Z (rearward)
    shaft.position.set(0, -0.04, shaftLen / 2) // slight droop, extend backward
    shaft.castShadow = true
    tailPivot.add(shaft)

    const tuft = new THREE.Mesh(tuftGeo, tuftMat)
    _trackInteractiveMesh(group, tuft)
    tuft.position.set(0, -0.04, shaftLen + 0.02)
    tuft.castShadow = true
    tailPivot.add(tuft)

    group.add(tailPivot)
    group.userData.tailPivot = tailPivot
  }

  if (animalType === 'goat') {
    // Short upright goat tail: stumpy tapered cylinder angled up-and-back from
    // the rump. Geometry is pre-translated so the base sits at the pivot origin
    // (cylinders are centered by default); rotating the mesh then pivots from
    // the base instead of the middle. Existing tailPivot swish code drives
    // rotation.y so the tail wags side-to-side like cow/horse.
    const shaftLen = 0.16
    const shaftGeo = _getSharedGeometry('tail:goat:shaft', () => {
      const g = new THREE.CylinderGeometry(0.008, 0.015, shaftLen, 5)
      g.translate(0, shaftLen / 2, 0)   // base at y=0, tip at y=+shaftLen
      return g
    })

    const tailPivot = new THREE.Group()
    tailPivot.position.set(0, bodyH * 0.7, def.bodyD / 2 + 0.01)

    const shaft = new THREE.Mesh(shaftGeo, bodyMat)
    _trackInteractiveMesh(group, shaft)
    shaft.rotation.x = Math.PI / 4            // 45° up-and-back from vertical
    shaft.castShadow = true
    tailPivot.add(shaft)

    group.add(tailPivot)
    group.userData.tailPivot = tailPivot
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

    // Short wool-puff tail at the rump. Reuses the sheep wool material so it
    // matches the fleece overlay. Positioned far enough behind the wool sphere
    // (bodyD/2 + 0.04 with extra +0.07 local Z) that it clears the overlay
    // volume and stays visible from the top-down camera. Attached via
    // tailPivot → existing updateAnimalState tailPivot.rotation.y swish drives
    // the sideways wag at idle/walk amplitude like cow/goat/horse.
    const woolMat = _getSharedMaterial('wool:sheep', () => new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.98, metalness: 0.0 }))
    const puffGeo = _getSharedGeometry('tail:sheep:puff', () => new THREE.SphereGeometry(0.09, 6, 5))
    const tailPivot = new THREE.Group()
    tailPivot.position.set(0, bodyH * 0.68, def.bodyD / 2 + 0.04)
    const puff = new THREE.Mesh(puffGeo, woolMat)
    _trackInteractiveMesh(group, puff)
    puff.scale.set(1.0, 0.85, 1.1)
    puff.position.set(0, -0.03, 0.07)
    puff.castShadow = true
    tailPivot.add(puff)
    group.add(tailPivot)
    group.userData.tailPivot = tailPivot
  }

  if (animalType === 'llama') {
    // Pointed ears wrapped in pivot Groups so each ear can twitch from its base
    // (top of head). Animation reuses the shared earPivots loop in updateAnimalState.
    const earGeo = _getSharedGeometry('ear:llama', () => new THREE.CylinderGeometry(0.02, 0.035, 0.2, 5))
    const earMat = _getSharedMaterial(`ear:llama:${def.headColor}`, () => new THREE.MeshStandardMaterial({ color: def.headColor, roughness: 0.9 }))
    const earPivots = []
    for (const ex of [-0.1, 0.1]) {
      const pivot = new THREE.Group()
      pivot.position.set(ex, def.headSize, 0)
      pivot.rotation.z = ex < 0 ? 0.2 : -0.2
      pivot.userData.baseRotX = pivot.rotation.x
      pivot.userData.baseRotZ = pivot.rotation.z
      pivot.userData.sign = ex < 0 ? -1 : 1

      const ear = new THREE.Mesh(earGeo, earMat)
      _trackInteractiveMesh(group, ear)
      ear.position.set(0, 0.1, 0)
      ear.castShadow = true
      pivot.add(ear)

      headGroup.add(pivot)
      earPivots.push(pivot)
    }
    group.userData.earPivots = earPivots
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
const WING_BASE_SPREAD = 0.12 // radians — resting wing angle away from body

// Peck (chicken / duck) — quick down, brief hold, slower return.
const PECK_INTERVAL_MIN_MS = 1800
const PECK_INTERVAL_MAX_MS = 5200
const PECK_DURATION_MS = 480
const PECK_DOWN_END = 0.28        // fraction of cycle: end of downswing
const PECK_HOLD_END = 0.45        // fraction of cycle: end of hold
const PECK_DIP_RAD = 0.85         // peak head dip (rad)
const PECK_DROP_FACTOR = 0.30     // peak head drop as fraction of headSize

// Eye blink (all animals) — close, brief hold, slightly slower open.
const BLINK_DURATION_MS = 180
const BLINK_INTERVAL_MIN_MS = 2500
const BLINK_INTERVAL_MAX_MS = 6000
const BLINK_CLOSED_SCALE = 0.05   // eyelid-closed Y scale, as fraction of base
const BLINK_CLOSE_END = 0.4       // fraction of cycle: lid fully closed
const BLINK_HOLD_END = 0.55       // fraction of cycle: end of hold

// Graze (large mammals) — slow head dip to ground, long chewing hold, ease back.
const GRAZE_INTERVAL_MIN_MS = 4500
const GRAZE_INTERVAL_MAX_MS = 12000
const GRAZE_DURATION_MIN_MS = 1800
const GRAZE_DURATION_MAX_MS = 2600
const GRAZE_DOWN_END = 0.18       // fraction of cycle: head reaches the ground
const GRAZE_HOLD_END = 0.85       // fraction of cycle: end of chew hold
const GRAZE_DIP_RAD = 0.42        // peak head dip (rad) — gentler than peck
const GRAZE_DROP_FACTOR = 0.30    // peak head drop as fraction of headSize
const GRAZE_CHEW_FREQ = 11        // rad/s lateral jaw sway during hold
const GRAZE_CHEW_AMP_Y = 0.04     // rad — small lateral chew (rotation.y)
const GRAZE_CHEW_AMP_X = 0.02     // rad — micro vertical jaw bob

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

  // ── Walk/idle blend (shared by bob, head nod, tail swish) ─────────────────
  if (animal.walkAmount === undefined) animal.walkAmount = 0
  const walkTarget = animal.walking ? 1 : 0
  const blendK = Math.min(1, 6 * dt)
  animal.walkAmount += (walkTarget - animal.walkAmount) * blendK
  const w = animal.walkAmount

  if (legPivots && legPivots.length > 0) {
    const phase = animal.walkPhase
    if (animal.mesh.userData.hopGait && legCount === 4) {
      // Bound gait: fronts together, backs together in anti-phase — hind legs
      // swing wider than fronts so the hop reads rabbit-shaped from above.
      // Scaled by walkAmount so legs fade to neutral when stopping mid-stride.
      const s = Math.sin(phase) * LEG_SWING * w
      legPivots[0].rotation.x =  s * 1.2   // FL
      legPivots[1].rotation.x =  s * 1.2   // FR
      legPivots[2].rotation.x = -s * 1.6   // BL
      legPivots[3].rotation.x = -s * 1.6   // BR
    } else if (legCount === 4) {
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
  const idleBob = Math.sin(animal.bobPhase) * 0.02
  let bobY
  if (animal.mesh.userData.hopGait) {
    // Full-cycle springy arc aligned with the leg bound cycle so body lift
    // stays in sync with leg motion (no grounded-pedaling). walkAmount `w`
    // fades the hop in/out so stopping mid-air settles gently.
    const hopArc = 0.5 * (1 - Math.cos(animal.walkPhase))
    bobY = hopArc * 0.07 * w + idleBob * (1 - w)
  } else {
    bobY = Math.sin(animal.bobPhase) * (animal.walking ? 0.04 : 0.02)
  }
  animal.mesh.position.y = bobY

  // ── Head nod ──────────────────────────────────────────────────────────────
  const headPivot = animal.mesh.userData.headGroup
  if (headPivot) {
    const baseY = animal.mesh.userData.headGroupBaseY ?? headPivot.position.y
    const baseRotX = animal.mesh.userData.headGroupBaseRotX ?? headPivot.rotation.x
    const baseRotY = animal.mesh.userData.headGroupBaseRotY ?? 0
    const walkRot = Math.sin(animal.walkPhase) * 0.08
    const walkY = Math.sin(animal.walkPhase + Math.PI / 2) * 0.015
    const idleRot = Math.sin(animal.bobPhase * 0.5) * 0.025
    const idleY = Math.sin(animal.bobPhase * 0.5) * 0.005
    headPivot.rotation.x = baseRotX + walkRot * w + idleRot * (1 - w)
    headPivot.rotation.y = baseRotY
    headPivot.position.y = baseY + walkY * w + idleY * (1 - w)
  }

  // ── Peck (chicken / duck) ─────────────────────────────────────────────────
  // Idle-only behaviour: dip the head sharply (≈ 49°) toward the ground,
  // hold briefly, then ease back. Three-phase curve (down / hold / up).
  // Walking aborts the peck and reseeds the timer so the animal doesn't
  // peck instantly the moment it stops.
  if (headPivot && animal.mesh.userData.peckable) {
    if (!animal.peckState) {
      animal.peckState = {
        timer: PECK_INTERVAL_MIN_MS + Math.random() * (PECK_INTERVAL_MAX_MS - PECK_INTERVAL_MIN_MS),
        phase: 0,
        pecking: false
      }
    }
    const ps = animal.peckState
    const idleEnough = w < 0.1
    if (!idleEnough) {
      // Walking (or fading out of a walk) suppresses pecks AND keeps the
      // timer at a fresh random interval, so a pent-up timer can't fire the
      // instant the animal stops.
      ps.pecking = false
      ps.phase = 0
      ps.timer = PECK_INTERVAL_MIN_MS + Math.random() * (PECK_INTERVAL_MAX_MS - PECK_INTERVAL_MIN_MS)
    } else if (ps.pecking) {
      ps.phase += dtMs / PECK_DURATION_MS
      if (ps.phase >= 1) {
        ps.pecking = false
        ps.phase = 0
        ps.timer = PECK_INTERVAL_MIN_MS + Math.random() * (PECK_INTERVAL_MAX_MS - PECK_INTERVAL_MIN_MS)
      }
    } else {
      ps.timer -= dtMs
      if (ps.timer <= 0) {
        ps.pecking = true
        ps.phase = 0
      }
    }

    if (ps.pecking) {
      // Three phases mapped over [0, 1]:
      //   [0, DOWN_END)            — down (smoothstep ramp)
      //   [DOWN_END, HOLD_END)     — hold at peak
      //   [HOLD_END, 1]            — up (smoothstep return)
      let dip
      if (ps.phase < PECK_DOWN_END) {
        const t = ps.phase / PECK_DOWN_END
        dip = t * t * (3 - 2 * t)
      } else if (ps.phase < PECK_HOLD_END) {
        dip = 1
      } else {
        const t = (ps.phase - PECK_HOLD_END) / (1 - PECK_HOLD_END)
        dip = 1 - t * t * (3 - 2 * t)
      }
      const headSize = animal.mesh.userData.peckHeadSize || 0.2
      headPivot.rotation.x += dip * PECK_DIP_RAD
      headPivot.position.y -= dip * headSize * PECK_DROP_FACTOR
    }
  }

  // ── Graze (cow / horse / sheep / goat / pig / donkey / llama) ─────────────
  // Idle-only behaviour: lower the head toward the ground, hold while
  // chewing (small lateral jaw sway), then ease back up. Walking aborts
  // and reseeds the timer so the animal doesn't graze the moment it stops.
  // Mutually exclusive with peck (peckable vs grazeable on disjoint sets).
  if (headPivot && animal.mesh.userData.grazeable) {
    if (!animal.grazeState) {
      animal.grazeState = {
        timer: GRAZE_INTERVAL_MIN_MS + Math.random() * (GRAZE_INTERVAL_MAX_MS - GRAZE_INTERVAL_MIN_MS),
        phase: 0,
        grazing: false,
        duration: GRAZE_DURATION_MIN_MS,
        chewT: 0
      }
    }
    const gs = animal.grazeState
    const idleEnough = w < 0.1
    if (!idleEnough) {
      gs.grazing = false
      gs.phase = 0
      gs.chewT = 0
      gs.timer = GRAZE_INTERVAL_MIN_MS + Math.random() * (GRAZE_INTERVAL_MAX_MS - GRAZE_INTERVAL_MIN_MS)
    } else if (gs.grazing) {
      gs.phase += dtMs / gs.duration
      if (gs.phase >= 1) {
        const overshootMs = (gs.phase - 1) * gs.duration
        gs.grazing = false
        gs.phase = 0
        gs.chewT = 0
        const nextIntervalMs = GRAZE_INTERVAL_MIN_MS + Math.random() * (GRAZE_INTERVAL_MAX_MS - GRAZE_INTERVAL_MIN_MS)
        gs.timer = Math.max(0, nextIntervalMs - overshootMs)
      }
    } else {
      gs.timer -= dtMs
      if (gs.timer <= 0) {
        gs.duration = GRAZE_DURATION_MIN_MS + Math.random() * (GRAZE_DURATION_MAX_MS - GRAZE_DURATION_MIN_MS)
        const carryPhase = Math.min(1, Math.max(0, -gs.timer / gs.duration))
        if (carryPhase >= 1) {
          // Overshoot already consumed the whole graze — finish immediately.
          gs.grazing = false
          gs.phase = 0
          gs.chewT = 0
          gs.timer = GRAZE_INTERVAL_MIN_MS + Math.random() * (GRAZE_INTERVAL_MAX_MS - GRAZE_INTERVAL_MIN_MS)
        } else {
          gs.grazing = true
          gs.phase = carryPhase
          gs.chewT = 0
        }
      }
    }

    if (gs.grazing) {
      let dip
      if (gs.phase < GRAZE_DOWN_END) {
        const t = gs.phase / GRAZE_DOWN_END
        dip = t * t * (3 - 2 * t)
      } else if (gs.phase < GRAZE_HOLD_END) {
        dip = 1
      } else {
        const t = (gs.phase - GRAZE_HOLD_END) / (1 - GRAZE_HOLD_END)
        dip = 1 - t * t * (3 - 2 * t)
      }
      const headSize = animal.mesh.userData.grazeHeadSize || 0.3
      headPivot.rotation.x += dip * GRAZE_DIP_RAD
      headPivot.position.y -= dip * headSize * GRAZE_DROP_FACTOR

      // Chewing — lateral jaw sway, only meaningful during the hold phase.
      // Envelope by `dip` so the chew fades in/out smoothly with the dip.
      gs.chewT += dt
      const chew = Math.sin(gs.chewT * GRAZE_CHEW_FREQ)
      headPivot.rotation.y += chew * GRAZE_CHEW_AMP_Y * dip
      headPivot.rotation.x += Math.abs(chew) * GRAZE_CHEW_AMP_X * dip
    }
  }

  // ── Tail swish (horse / donkey / cow / goat / sheep) ──────────────────────
  // Pivot rotates around Y so the tail sweeps side to side behind the rump.
  // Amplitude eases between idle (~5.7°) and walking (~14°) using walkAmount.
  const tailPivot = animal.mesh.userData.tailPivot
  if (tailPivot) {
    if (animal.tailPhase === undefined) animal.tailPhase = Math.random() * Math.PI * 2
    // Frequency: 6 rad/s walking, 1.5 rad/s idle — blended by walkAmount
    const tailFreq = 1.5 + w * 4.5
    animal.tailPhase += tailFreq * dt
    const tailAmp = 0.10 + w * 0.15     // 0.10 idle → 0.25 walking
    tailPivot.rotation.y = Math.sin(animal.tailPhase) * tailAmp
  }

  // ── Pig tail wiggle ───────────────────────────────────────────────────────
  // Curly tail rotates around Y (yaw) so the opening of the 3/4-torus sweeps
  // side-to-side behind the rump — reads from top-down. Frequency and
  // amplitude both scale with walkAmount so idle is a slow shimmy and walking
  // is a faster, wider wag.
  const pigTailPivot = animal.mesh.userData.pigTailPivot
  if (pigTailPivot) {
    if (animal.pigTailPhase === undefined) animal.pigTailPhase = Math.random() * Math.PI * 2
    const freq = 3 + w * 5         // 3 rad/s idle → 8 rad/s walking
    animal.pigTailPhase += freq * dt
    const amp = 0.25 + w * 0.15    // 0.25 idle → 0.40 walking (smaller wag avoids body clip)
    pigTailPivot.rotation.y = Math.sin(animal.pigTailPhase) * amp
  }

  // ── Wing flap (chicken / duck) ────────────────────────────────────────────
  // pivot.rotation.z = sign * amp → symmetric flap: both wing tips swing
  // away from and back toward the body together, centered on the resting
  // spread. Sin is centered at 0 so the flap crosses neutral rather than only
  // opening — reads as an actual flap, not just a spread-wiggle.
  const wingPivots = animal.mesh.userData.wingPivots
  if (wingPivots && wingPivots.length > 0) {
    if (animal.wingPhase === undefined) animal.wingPhase = Math.random() * Math.PI * 2
    // Single phase drives both idle ruffle and walk flap; frequency and
    // amplitude both scale with walkAmount so idle state uses tiny slow
    // motion and walking snaps into a quick beat.
    const wingFreq = 3 + w * 15       // 3 rad/s idle → 18 rad/s walking
    animal.wingPhase += wingFreq * dt
    const flapAmp = 0.04 + w * 0.18   // 0.04 idle → 0.22 walking
    const amp = WING_BASE_SPREAD + Math.sin(animal.wingPhase) * flapAmp
    for (const pivot of wingPivots) {
      pivot.rotation.z = pivot.userData.sign * amp
    }
  }

  // ── Ear twitch (rabbit, llama) ────────────────────────────────────────────
  // Two independent ears: each carries an idle sway plus an occasional sharp
  // twitch toward a random forward/back tilt that eases back to neutral.
  // Smoother is dt-correct (1 - exp(-k*dt)) so behaviour is frame-rate stable.
  // Walking slightly suppresses twitch amplitude (ears flatten while running)
  // — the existing walkAmount blend `w` reuses the same easing.
  const earPivots = animal.mesh.userData.earPivots
  if (earPivots && earPivots.length > 0) {
    if (!animal.earState) {
      animal.earState = {
        timers: [600 + Math.random() * 1800, 900 + Math.random() * 1800], // ms until next twitch
        targets: [0, 0],     // current twitch target offset (rad)
        offsets: [0, 0],     // current smoothed twitch offset (rad)
        idlePhase: Math.random() * Math.PI * 2
      }
    }
    const es = animal.earState
    es.idlePhase += dt * 0.55
    const idleSway = Math.sin(es.idlePhase) * 0.022
    const twitchScale = 1 - 0.5 * w   // running: ears settle a bit
    const decayK = 6.0                // ease-back rate (per second)
    const decayFactor = 1 - Math.exp(-decayK * dt)

    for (let i = 0; i < earPivots.length; i++) {
      es.timers[i] -= dtMs
      if (es.timers[i] <= 0) {
        // Pick a fresh twitch direction; mostly back, occasionally forward.
        const dir = Math.random() < 0.7 ? -1 : 1
        const mag = 0.25 + Math.random() * 0.20
        es.targets[i] = dir * mag
        es.offsets[i] = es.targets[i]   // snap to peak, then ease back
        // Carry overshoot into the next interval so long frames don't skew cadence.
        es.timers[i] += 1200 + Math.random() * 2000
      }
      // Ease the offset back toward zero (target naturally decays to 0 too).
      es.offsets[i] += (0 - es.offsets[i]) * decayFactor

      const pivot = earPivots[i]
      const baseX = pivot.userData.baseRotX || 0
      pivot.rotation.x = baseX + (es.offsets[i] + idleSway) * twitchScale
    }
  }

  // ── Eye blink (all animals) ───────────────────────────────────────────────
  // Lazy state: random initial timer so the herd doesn't blink in lockstep.
  // While idle we only tick the timer; while blinking we mutate eye.scale.y
  // through close → hold → open with smoothstep easing.
  const eyes = animal.mesh.userData.eyeMeshes
  if (eyes && eyes.length > 0) {
    if (!animal.blinkState) {
      animal.blinkState = {
        timer: BLINK_INTERVAL_MIN_MS + Math.random() * (BLINK_INTERVAL_MAX_MS - BLINK_INTERVAL_MIN_MS),
        blinking: false,
        phase: 0
      }
    }
    const bs = animal.blinkState
    if (bs.blinking) {
      bs.phase += dtMs / BLINK_DURATION_MS
      let scaleFrac
      if (bs.phase < BLINK_CLOSE_END) {
        const t = bs.phase / BLINK_CLOSE_END
        const e = t * t * (3 - 2 * t)
        scaleFrac = 1 + (BLINK_CLOSED_SCALE - 1) * e
      } else if (bs.phase < BLINK_HOLD_END) {
        scaleFrac = BLINK_CLOSED_SCALE
      } else if (bs.phase < 1) {
        const t = (bs.phase - BLINK_HOLD_END) / (1 - BLINK_HOLD_END)
        const e = t * t * (3 - 2 * t)
        scaleFrac = BLINK_CLOSED_SCALE + (1 - BLINK_CLOSED_SCALE) * e
      } else {
        scaleFrac = 1
        bs.blinking = false
        // Subtract any overshoot from the next interval so a long frame
        // doesn't stretch cadence; clamp lower bound so we never schedule the
        // next blink in the past.
        const overshootMs = (bs.phase - 1) * BLINK_DURATION_MS
        const nextIntervalMs = BLINK_INTERVAL_MIN_MS + Math.random() * (BLINK_INTERVAL_MAX_MS - BLINK_INTERVAL_MIN_MS)
        bs.timer = Math.max(0, nextIntervalMs - overshootMs)
        bs.phase = 0
      }
      for (const eye of eyes) {
        eye.scale.y = eye.userData.baseScaleY * scaleFrac
      }
    } else {
      bs.timer -= dtMs
      if (bs.timer <= 0) {
        bs.blinking = true
        bs.phase = -bs.timer / BLINK_DURATION_MS  // carry overshoot in
      }
    }
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
