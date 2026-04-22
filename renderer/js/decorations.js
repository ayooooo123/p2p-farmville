import * as THREE from './three.module.min.js'

// ── 20+ Decoration Definitions ──────────────────────────────────────────────
export const DECO_DEFINITIONS = {
  white_fence: {
    name: 'White Fence', level: 1, cost: 25, size: [1, 1], bonus: 1,
    type: 'fence', color: 0xffffff
  },
  wooden_fence: {
    name: 'Wooden Fence', level: 1, cost: 20, size: [1, 1], bonus: 1,
    type: 'fence', color: 0x8b6914
  },
  stone_path: {
    name: 'Stone Path', level: 1, cost: 15, size: [1, 1], bonus: 0,
    type: 'path', color: 0x808080
  },
  hay_bale: {
    name: 'Hay Bale', level: 1, cost: 30, size: [1, 1], bonus: 1,
    type: 'bale', color: 0xdaa520
  },
  flower_box: {
    name: 'Flower Box', level: 2, cost: 40, size: [1, 1], bonus: 2,
    type: 'flowerbox', color: 0x8b6914, flowerColor: 0xff69b4
  },
  tulips: {
    name: 'Tulips', level: 2, cost: 35, size: [1, 1], bonus: 2,
    type: 'flower', color: 0xff4500, stemColor: 0x228b22
  },
  roses: {
    name: 'Roses', level: 3, cost: 50, size: [1, 1], bonus: 3,
    type: 'flower', color: 0xdc143c, stemColor: 0x006400
  },
  sunflowers: {
    name: 'Sunflowers', level: 4, cost: 55, size: [1, 1], bonus: 3,
    type: 'flower', color: 0xffd700, stemColor: 0x228b22, tall: true
  },
  fountain: {
    name: 'Fountain', level: 5, cost: 300, size: [2, 2], bonus: 8,
    type: 'fountain', color: 0xc0c0c0
  },
  scarecrow: {
    name: 'Scarecrow', level: 2, cost: 60, size: [1, 1], bonus: 2,
    type: 'scarecrow', color: 0x8b6914
  },
  mailbox: {
    name: 'Mailbox', level: 1, cost: 30, size: [1, 1], bonus: 1,
    type: 'mailbox', color: 0x4169e1
  },
  lamp_post: {
    name: 'Lamp Post', level: 3, cost: 80, size: [1, 1], bonus: 3,
    type: 'lamp', color: 0x333333
  },
  bench: {
    name: 'Bench', level: 2, cost: 45, size: [1, 1], bonus: 2,
    type: 'bench', color: 0x8b6914
  },
  garden_gnome: {
    name: 'Garden Gnome', level: 4, cost: 100, size: [1, 1], bonus: 4,
    type: 'gnome', color: 0xff0000
  },
  windmill: {
    name: 'Windmill', level: 8, cost: 500, size: [2, 2], bonus: 10,
    type: 'windmill', color: 0xffffff
  },
  doghouse: {
    name: 'Doghouse', level: 3, cost: 120, size: [1, 1], bonus: 3,
    type: 'doghouse', color: 0xb22222
  },
  pond: {
    name: 'Pond', level: 5, cost: 250, size: [2, 2], bonus: 6,
    type: 'pond', color: 0x4682b4
  },
  bridge: {
    name: 'Bridge', level: 6, cost: 200, size: [2, 1], bonus: 4,
    type: 'bridge', color: 0x8b6914
  },
  well: {
    name: 'Well', level: 4, cost: 180, size: [1, 1], bonus: 5,
    type: 'well', color: 0x808080
  },
  bird_bath: {
    name: 'Bird Bath', level: 3, cost: 90, size: [1, 1], bonus: 3,
    type: 'birdbath', color: 0xc0c0c0
  }
}

function _hashString (input) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function _normalizeSeed (seed) {
  return (seed >>> 0) || 0x6d2b79f5
}

function _seedFromPlacement (decoType, x, z) {
  return _normalizeSeed(_hashString(`${decoType}:${Math.round(x * 100)}:${Math.round(z * 100)}`))
}

function _createRng (seed) {
  let state = _normalizeSeed(seed)
  return function random () {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const decorationGeometryCache = new Map()
const decorationMaterialCache = new Map()

function _markSharedAsset (asset) {
  if (!asset) return asset
  asset.userData = asset.userData || {}
  asset.userData.sharedAsset = true
  return asset
}

function _getSharedGeometry (cacheKey, factory) {
  let geometry = decorationGeometryCache.get(cacheKey)
  if (!geometry) {
    geometry = _markSharedAsset(factory())
    decorationGeometryCache.set(cacheKey, geometry)
  }
  return geometry
}

function _getSharedMaterial (cacheKey, factory) {
  let material = decorationMaterialCache.get(cacheKey)
  if (!material) {
    material = _markSharedAsset(factory())
    decorationMaterialCache.set(cacheKey, material)
  }
  return material
}

/**
 * Create procedural 3D decoration mesh
 * @param {string} decoType - key in DECO_DEFINITIONS
 * @param {number} variantSeed - persisted seed so procedural details survive save/load
 * @returns {THREE.Group}
 */
export function createDecoMesh (decoType, variantSeed = 0) {
  const def = DECO_DEFINITIONS[decoType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()
  const rng = _createRng(variantSeed)
  group.userData.objectType = 'decoration'
  group.userData.decoType = decoType
  group.userData.variantSeed = _normalizeSeed(variantSeed)
  group.userData.windmillRotors = []
  group.userData.windDecorations = []
  group.userData.waterMeshes = []

  switch (def.type) {
    case 'fence': _buildFence(group, def); break
    case 'path': _buildPath(group, def, rng); break
    case 'bale': _buildHayBale(group, def); break
    case 'flowerbox': _buildFlowerBox(group, def, rng); break
    case 'flower': _buildFlower(group, def, rng); break
    case 'fountain': _buildFountain(group, def, rng); break
    case 'scarecrow': _buildScarecrow(group, def, rng); break
    case 'mailbox': _buildMailbox(group, def, rng); break
    case 'lamp': _buildLampPost(group, def); break
    case 'bench': _buildBench(group, def); break
    case 'gnome': _buildGnome(group, def); break
    case 'windmill': _buildWindmill(group, def); break
    case 'doghouse': _buildDoghouse(group, def); break
    case 'pond': _buildPond(group, def, rng); break
    case 'bridge': _buildBridge(group, def); break
    case 'well': _buildWell(group, def, rng); break
    case 'birdbath': _buildBirdBath(group, def, rng); break
    default: _buildGeneric(group, def); break
  }

  return group
}

function _trackWindDecoration (group, object3d, windKind, windBend = 1, rng = Math.random) {
  object3d.userData.isWindDecoration = true
  object3d.userData.windKind = windKind
  object3d.userData.windBend = windBend
  object3d.userData.baseRotationX = object3d.rotation.x
  object3d.userData.baseRotationZ = object3d.rotation.z
  object3d.userData.windPhase = rng() * Math.PI * 2
  group.userData.windDecorations.push(object3d)
}

function _trackWaterMesh (group, mesh, waterType, rng = Math.random) {
  mesh.userData.isWater = true
  mesh.userData.waterType = waterType
  mesh.userData.waterPhase = rng() * Math.PI * 2
  if (mesh.material) group.userData.waterMeshes.push(mesh)
}

function _trackWindmillRotor (group, rotor) {
  rotor.userData.isWindmillRotor = true
  group.userData.windmillRotors.push(rotor)
}

function _buildFence (g, def) {
  const mat = _getSharedMaterial(`fence:mat:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const postGeo = _getSharedGeometry('fence:post', () => new THREE.CylinderGeometry(0.05, 0.06, 0.8, 5))
  const railGeo = _getSharedGeometry('fence:rail', () => new THREE.BoxGeometry(1.5, 0.06, 0.04))

  // Two posts
  for (const side of [-0.7, 0.7]) {
    const post = new THREE.Mesh(postGeo, mat)
    post.position.set(side, 0.4, 0)
    post.castShadow = true
    g.add(post)
  }
  // Two rails
  for (const y of [0.25, 0.55]) {
    const rail = new THREE.Mesh(railGeo, mat)
    rail.position.y = y
    rail.castShadow = true
    g.add(rail)
  }
}

function _buildPath (g, def, rng) {
  const mat = _getSharedMaterial(`path:mat:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.95 }))
  const pathGeo = _getSharedGeometry('path:base', () => new THREE.BoxGeometry(1.8, 0.04, 1.8))
  const stoneMat = _getSharedMaterial('path:stone:mat', () => new THREE.MeshStandardMaterial({ color: 0x696969 }))
  const stoneGeo = _getSharedGeometry('path:stone:geo', () => new THREE.CylinderGeometry(0.15, 0.18, 0.03, 6))

  const path = new THREE.Mesh(pathGeo, mat)
  path.position.y = 0.02
  path.receiveShadow = true
  g.add(path)

  // Stone details
  for (let i = 0; i < 4; i++) {
    const stone = new THREE.Mesh(stoneGeo, stoneMat)
    stone.position.set((rng() - 0.5) * 1.2, 0.05, (rng() - 0.5) * 1.2)
    g.add(stone)
  }
}

function _buildHayBale (g, def) {
  const mat = _getSharedMaterial(`hay-bale:mat:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const baleGeo = _getSharedGeometry('hay-bale:geo', () => new THREE.CylinderGeometry(0.5, 0.5, 0.7, 12))
  const bale = new THREE.Mesh(baleGeo, mat)
  bale.rotation.z = Math.PI / 2
  bale.position.y = 0.5
  bale.castShadow = true
  g.add(bale)
}

function _buildFlowerBox (g, def, rng) {
  const boxMat = _getSharedMaterial(`flowerbox:box:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const stemMat = _getSharedMaterial('flowerbox:stem', () => new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 }))
  const flMat = _getSharedMaterial(`flowerbox:flower:${def.flowerColor}`, () => new THREE.MeshStandardMaterial({ color: def.flowerColor }))
  const boxGeo = _getSharedGeometry('flowerbox:box', () => new THREE.BoxGeometry(1.2, 0.4, 0.5))
  const flowerGeo = _getSharedGeometry('flowerbox:flower', () => new THREE.SphereGeometry(0.08, 6, 4))
  const box = new THREE.Mesh(boxGeo, boxMat)
  box.position.y = 0.2
  box.castShadow = true
  g.add(box)

  // Flowers — tiny stalk groups so the weather-driven wind system can sway them.
  for (let i = 0; i < 5; i++) {
    const stalk = new THREE.Group()
    const h = 0.18 + (i % 2) * 0.04 + (i === 2 ? 0.03 : 0)
    const zOffset = i % 2 === 0 ? -0.03 : 0.03
    stalk.position.set(-0.4 + i * 0.2, 0.4, zOffset)

    const stemGeo = _getSharedGeometry(`flowerbox:stem:${h.toFixed(2)}`, () => new THREE.CylinderGeometry(0.012, 0.014, h, 5))
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = h / 2
    stem.castShadow = true
    stalk.add(stem)

    const fl = new THREE.Mesh(flowerGeo, flMat)
    fl.position.y = h + 0.04
    fl.castShadow = true
    stalk.add(fl)

    _trackWindDecoration(g, stalk, 'flowerStalk', 0.55 + h * 0.8, rng)
    g.add(stalk)
  }
}

function _buildFlower (g, def, rng) {
  const stemMat = new THREE.MeshStandardMaterial({ color: def.stemColor, roughness: 0.9 })
  const petalMat = new THREE.MeshStandardMaterial({ color: def.color })
  const count = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < count; i++) {
    const h = def.tall ? 1.0 + rng() * 0.4 : 0.4 + rng() * 0.3
    const ox = (rng() - 0.5) * 0.8
    const oz = (rng() - 0.5) * 0.8

    const stalk = new THREE.Group()
    stalk.position.set(ox, 0, oz)

    const stemGeo = new THREE.CylinderGeometry(0.02, 0.025, h, 4)
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = h / 2
    stem.castShadow = true
    stalk.add(stem)

    const petalGeo = def.tall ? new THREE.SphereGeometry(0.15, 8, 6) : new THREE.SphereGeometry(0.08, 6, 4)
    const petal = new THREE.Mesh(petalGeo, petalMat)
    petal.position.y = h + 0.05
    petal.castShadow = true
    stalk.add(petal)

    _trackWindDecoration(g, stalk, 'flowerStalk', def.tall ? 1.35 : 0.9 + h * 0.3, rng)
    g.add(stalk)
  }
}

function _buildFountain (g, def, rng) {
  const mat = _getSharedMaterial(`fountain:stone:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const baseGeo = _getSharedGeometry('fountain:base', () => new THREE.CylinderGeometry(1.2, 1.4, 0.3, 16))
  const pillarGeo = _getSharedGeometry('fountain:pillar', () => new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8))
  const topGeo = _getSharedGeometry('fountain:top', () => new THREE.CylinderGeometry(0.5, 0.4, 0.15, 12))

  // Base
  const base = new THREE.Mesh(baseGeo, mat)
  base.position.y = 0.15
  g.add(base)
  // Water basin
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4682b4, transparent: true, opacity: 0.7 })
  const waterGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = 0.35
  _trackWaterMesh(g, water, 'fountain', rng)
  g.add(water)
  // Center pillar
  const pillar = new THREE.Mesh(pillarGeo, mat)
  pillar.position.y = 0.9
  pillar.castShadow = true
  g.add(pillar)
  // Top basin
  const top = new THREE.Mesh(topGeo, mat)
  top.position.y = 1.55
  g.add(top)
}

function _buildScarecrow (g, def, rng) {
  const woodMat = _getSharedMaterial('scarecrow:wood', () => new THREE.MeshStandardMaterial({ color: 0x8b6914 }))
  const poleGeo = _getSharedGeometry('scarecrow:pole', () => new THREE.CylinderGeometry(0.05, 0.06, 2.0, 5))
  const armGeo = _getSharedGeometry('scarecrow:arm', () => new THREE.CylinderGeometry(0.04, 0.04, 1.4, 5))
  const headMat = _getSharedMaterial('scarecrow:head', () => new THREE.MeshStandardMaterial({ color: 0xdeb887 }))
  const headGeo = _getSharedGeometry('scarecrow:head', () => new THREE.SphereGeometry(0.2, 8, 6))
  const hatMat = _getSharedMaterial('scarecrow:hat', () => new THREE.MeshStandardMaterial({ color: 0x8b4513 }))
  const hatGeo = _getSharedGeometry('scarecrow:hat', () => new THREE.ConeGeometry(0.3, 0.3, 8))
  const brimGeo = _getSharedGeometry('scarecrow:brim', () => new THREE.CylinderGeometry(0.35, 0.35, 0.04, 10))
  const clothMat = _getSharedMaterial('scarecrow:cloth', () => new THREE.MeshStandardMaterial({ color: 0xcd5c5c }))
  const clothGeo = _getSharedGeometry('scarecrow:cloth', () => new THREE.BoxGeometry(0.5, 0.6, 0.05))

  // Vertical pole
  const pole = new THREE.Mesh(poleGeo, woodMat)
  pole.position.y = 1.0
  pole.castShadow = true
  g.add(pole)
  // Horizontal bar (arms)
  const arm = new THREE.Mesh(armGeo, woodMat)
  arm.rotation.z = Math.PI / 2
  arm.position.y = 1.5
  arm.castShadow = true
  g.add(arm)
  // Head
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = 2.15
  head.castShadow = true
  g.add(head)
  // Hat
  const hat = new THREE.Mesh(hatGeo, hatMat)
  hat.position.y = 2.45
  g.add(hat)
  const brim = new THREE.Mesh(brimGeo, hatMat)
  brim.position.y = 2.32
  g.add(brim)
  // Cloth on arms — tagged so app.js can sway it with the weather-driven wind system
  const cloth = new THREE.Mesh(clothGeo, clothMat)
  cloth.position.set(0, 1.2, 0)
  cloth.userData.isWindDecoration = true
  cloth.userData.windKind = 'scarecrowCloth'
  cloth.userData.baseRotationX = cloth.rotation.x
  cloth.userData.baseRotationZ = cloth.rotation.z
  cloth.userData.windPhase = rng() * Math.PI * 2
  g.add(cloth)
}

function _buildMailbox (g, def, rng) {
  const mat = _getSharedMaterial(`mailbox:box:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const postMat = _getSharedMaterial('mailbox:post', () => new THREE.MeshStandardMaterial({ color: 0x8b6914 }))
  const postGeo = _getSharedGeometry('mailbox:post', () => new THREE.CylinderGeometry(0.06, 0.06, 1.0, 5))
  const boxGeo = _getSharedGeometry('mailbox:box', () => new THREE.BoxGeometry(0.35, 0.25, 0.2))
  const flagMat = _getSharedMaterial('mailbox:flag', () => new THREE.MeshStandardMaterial({ color: 0xff0000 }))
  const flagGeo = _getSharedGeometry('mailbox:flag', () => new THREE.BoxGeometry(0.04, 0.15, 0.04))

  // Post
  const post = new THREE.Mesh(postGeo, postMat)
  post.position.y = 0.5
  post.castShadow = true
  g.add(post)
  // Box
  const box = new THREE.Mesh(boxGeo, mat)
  box.position.y = 1.1
  box.castShadow = true
  g.add(box)
  // Flag — tagged so the weather-driven wind system can flutter it
  const flag = new THREE.Mesh(flagGeo, flagMat)
  flag.position.set(0.2, 1.2, 0)
  flag.castShadow = true
  flag.userData.isWindDecoration = true
  flag.userData.windKind = 'mailboxFlag'
  flag.userData.baseRotationX = flag.rotation.x
  flag.userData.baseRotationZ = flag.rotation.z
  flag.userData.windPhase = rng() * Math.PI * 2
  g.add(flag)
}

function _buildLampPost (g, def) {
  const mat = _getSharedMaterial(`lamp-post:metal:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const poleGeo = _getSharedGeometry('lamp-post:pole', () => new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6))
  const lampGeo = _getSharedGeometry('lamp-post:lamp-geo', () => new THREE.SphereGeometry(0.2, 8, 6))
  const armGeo = _getSharedGeometry('lamp-post:arm', () => new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4))

  // Pole
  const pole = new THREE.Mesh(poleGeo, mat)
  pole.position.y = 1.25
  pole.castShadow = true
  g.add(pole)
  // Lamp head — starts dim, brightened at night by applyWindowGlow
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xfff0a0, emissiveIntensity: 0.0 })
  const lamp = new THREE.Mesh(lampGeo, lampMat)
  lamp.position.y = 2.6
  lamp.userData.isLampGlow = true // tagged for day/night wiring in app.js
  g.add(lamp)

  // Soft halo sprite — radial alpha texture gives an actual feathered glow instead
  // of a hard-edged transparent sphere. Animated per-frame in app.js.
  const haloMat = new THREE.SpriteMaterial({
    map: _getLampHaloTexture(),
    color: 0xffd890,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const halo = new THREE.Sprite(haloMat)
  halo.position.y = 2.6
  halo.scale.set(1.15, 1.15, 1)
  halo.userData.isLampHalo = true
  halo.userData.baseScale = 1.0
  g.add(halo)

  // Arm
  const arm = new THREE.Mesh(armGeo, mat)
  arm.rotation.z = Math.PI / 3
  arm.position.set(0.1, 2.5, 0)
  g.add(arm)
  // PointLight — warm yellow, only active at night (intensity driven by app.js)
  const ptLight = new THREE.PointLight(0xffd070, 0, 8, 2)
  ptLight.position.set(0, 2.8, 0)
  ptLight.userData.isLampLight = true
  g.add(ptLight)
  // Store refs on group for fast access
  g.userData.lampGlowMesh = lamp
  g.userData.lampHaloMesh = halo
  g.userData.lampPointLight = ptLight
}

function _buildBench (g, def) {
  const mat = _getSharedMaterial(`bench:wood:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const seatGeo = _getSharedGeometry('bench:seat', () => new THREE.BoxGeometry(1.2, 0.06, 0.4))
  const backGeo = _getSharedGeometry('bench:back', () => new THREE.BoxGeometry(1.2, 0.5, 0.06))
  const legMat = _getSharedMaterial('bench:leg', () => new THREE.MeshStandardMaterial({ color: 0x333333 }))
  const legGeo = _getSharedGeometry('bench:leg', () => new THREE.CylinderGeometry(0.04, 0.04, 0.45, 4))

  // Seat
  const seat = new THREE.Mesh(seatGeo, mat)
  seat.position.y = 0.45
  seat.castShadow = true
  g.add(seat)
  // Back
  const back = new THREE.Mesh(backGeo, mat)
  back.position.set(0, 0.7, 0.18)
  back.castShadow = true
  g.add(back)
  // Legs
  for (const x of [-0.5, 0.5]) {
    const leg = new THREE.Mesh(legGeo, legMat)
    leg.position.set(x, 0.22, 0)
    g.add(leg)
  }
}

function _buildGnome (g, def) {
  const bodyMat = _getSharedMaterial('gnome:body', () => new THREE.MeshStandardMaterial({ color: 0x4169e1 }))
  const bodyGeo = _getSharedGeometry('gnome:body', () => new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8))
  const headMat = _getSharedMaterial('gnome:head', () => new THREE.MeshStandardMaterial({ color: 0xffcc99 }))
  const headGeo = _getSharedGeometry('gnome:head', () => new THREE.SphereGeometry(0.14, 8, 6))
  const hatMat = _getSharedMaterial(`gnome:hat:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const hatGeo = _getSharedGeometry('gnome:hat', () => new THREE.ConeGeometry(0.15, 0.35, 8))
  const beardMat = _getSharedMaterial('gnome:beard', () => new THREE.MeshStandardMaterial({ color: 0xffffff }))
  const beardGeo = _getSharedGeometry('gnome:beard', () => new THREE.ConeGeometry(0.1, 0.2, 6))

  // Body
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.25
  body.castShadow = true
  g.add(body)
  // Head
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = 0.55
  g.add(head)
  // Hat
  const hat = new THREE.Mesh(hatGeo, hatMat)
  hat.position.y = 0.82
  hat.castShadow = true
  g.add(hat)
  // Beard
  const beard = new THREE.Mesh(beardGeo, beardMat)
  beard.position.set(0, 0.4, -0.08)
  g.add(beard)
}

function _buildWindmill (g) {
  const mat = _getSharedMaterial('windmill:tower', () => new THREE.MeshStandardMaterial({ color: 0xffffff }))
  const towerGeo = _getSharedGeometry('windmill:tower', () => new THREE.CylinderGeometry(0.5, 0.8, 3.5, 8))
  const roofMat = _getSharedMaterial('windmill:roof', () => new THREE.MeshStandardMaterial({ color: 0xb22222 }))
  const roofGeo = _getSharedGeometry('windmill:roof', () => new THREE.ConeGeometry(0.7, 0.8, 8))
  const hubGeo = _getSharedGeometry('windmill:hub', () => new THREE.SphereGeometry(0.15, 6, 4))
  const bladeMat = _getSharedMaterial('windmill:blade', () => new THREE.MeshStandardMaterial({ color: 0xdeb887 }))
  const bladeGeo = _getSharedGeometry('windmill:blade', () => new THREE.BoxGeometry(0.15, 1.5, 0.03))

  // Tower
  const tower = new THREE.Mesh(towerGeo, mat)
  tower.position.y = 1.75
  tower.castShadow = true
  g.add(tower)
  // Roof
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 3.9
  roof.castShadow = true
  g.add(roof)
  // Rotor group — hub + blades, rotated by game loop via userData.isWindmillRotor
  const rotor = new THREE.Group()
  rotor.position.set(0, 3.0, -0.55)
  _trackWindmillRotor(g, rotor)
  g.add(rotor)
  rotor.add(new THREE.Mesh(hubGeo, mat))
  // 4 blades radiating outward from rotor pivot
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat)
    const angle = (Math.PI / 2) * i
    blade.position.set(Math.cos(angle) * 0.75, Math.sin(angle) * 0.75, -0.10)
    blade.rotation.z = angle
    blade.castShadow = true
    rotor.add(blade)
  }
}

function _buildDoghouse (g, def) {
  const mat = _getSharedMaterial(`doghouse:base:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const baseGeo = _getSharedGeometry('doghouse:base', () => new THREE.BoxGeometry(0.8, 0.6, 0.8))
  const roofMat = _getSharedMaterial('doghouse:roof', () => new THREE.MeshStandardMaterial({ color: 0x333333 }))
  const roofGeo = _getSharedGeometry('doghouse:roof', () => new THREE.ConeGeometry(0.65, 0.4, 4))
  const doorMat = _getSharedMaterial('doghouse:door', () => new THREE.MeshStandardMaterial({ color: 0x222222 }))
  const doorGeo = _getSharedGeometry('doghouse:door', () => new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8))

  // Base
  const base = new THREE.Mesh(baseGeo, mat)
  base.position.y = 0.3
  base.castShadow = true
  g.add(base)
  // Roof
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 0.8
  roof.rotation.y = Math.PI / 4
  g.add(roof)
  // Door hole
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.rotation.x = Math.PI / 2
  door.position.set(0, 0.22, -0.42)
  g.add(door)
}

function _buildPond (g, def, rng) {
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4682b4, transparent: true, opacity: 0.7 })
  const waterGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.08, 16)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = 0.04
  water.receiveShadow = true
  _trackWaterMesh(g, water, 'pond', rng)
  g.add(water)
  // Edge rocks
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x696969 })
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 / 10) * i
    const rockGeo = new THREE.SphereGeometry(0.15 + rng() * 0.1, 5, 4)
    const rock = new THREE.Mesh(rockGeo, rockMat)
    rock.position.set(Math.cos(angle) * 1.5, 0.1, Math.sin(angle) * 1.5)
    rock.scale.y = 0.5
    g.add(rock)
  }
}

function _buildBridge (g, def) {
  const mat = _getSharedMaterial(`bridge:wood:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const deckGeo = _getSharedGeometry('bridge:deck', () => new THREE.BoxGeometry(2.0, 0.1, 1.0))
  const railGeo = _getSharedGeometry('bridge:rail', () => new THREE.BoxGeometry(2.0, 0.4, 0.06))
  const postGeo = _getSharedGeometry('bridge:post', () => new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4))

  // Deck
  const deck = new THREE.Mesh(deckGeo, mat)
  deck.position.y = 0.3
  deck.receiveShadow = true
  g.add(deck)
  // Railings
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, mat)
    rail.position.set(0, 0.55, side * 0.48)
    rail.castShadow = true
    g.add(rail)
    // Posts
    for (const x of [-0.8, 0, 0.8]) {
      const post = new THREE.Mesh(postGeo, mat)
      post.position.set(x, 0.55, side * 0.48)
      g.add(post)
    }
  }
}

function _buildWell (g, def, rng) {
  const mat = _getSharedMaterial(`well:stone:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const baseGeo = _getSharedGeometry('well:base', () => new THREE.CylinderGeometry(0.5, 0.55, 0.7, 10))
  const woodMat = _getSharedMaterial('well:wood', () => new THREE.MeshStandardMaterial({ color: 0x8b6914 }))
  const postGeo = _getSharedGeometry('well:post', () => new THREE.CylinderGeometry(0.05, 0.05, 1.2, 5))
  const roofGeo = _getSharedGeometry('well:roof', () => new THREE.ConeGeometry(0.6, 0.4, 4))

  // Base cylinder
  const base = new THREE.Mesh(baseGeo, mat)
  base.position.y = 0.35
  base.castShadow = true
  g.add(base)
  // Water inside
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.6 })
  const waterGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 10)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = 0.5
  _trackWaterMesh(g, water, 'well', rng)
  g.add(water)
  // Roof supports
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, woodMat)
    post.position.set(side * 0.45, 1.3, 0)
    post.castShadow = true
    g.add(post)
  }
  // Roof
  const roof = new THREE.Mesh(roofGeo, woodMat)
  roof.position.y = 2.1
  roof.rotation.y = Math.PI / 4
  g.add(roof)
}

function _buildBirdBath (g, def, rng) {
  const mat = _getSharedMaterial(`birdbath:stone:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const pedGeo = _getSharedGeometry('birdbath:pedestal', () => new THREE.CylinderGeometry(0.12, 0.2, 0.8, 8))
  const basinGeo = _getSharedGeometry('birdbath:basin', () => new THREE.CylinderGeometry(0.5, 0.3, 0.15, 12))

  // Pedestal
  const ped = new THREE.Mesh(pedGeo, mat)
  ped.position.y = 0.4
  ped.castShadow = true
  g.add(ped)
  // Basin
  const basin = new THREE.Mesh(basinGeo, mat)
  basin.position.y = 0.85
  g.add(basin)
  // Water
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4682b4, transparent: true, opacity: 0.6 })
  const waterGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.04, 12)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = 0.92
  water.receiveShadow = true
  _trackWaterMesh(g, water, 'birdbath', rng)
  g.add(water)
}

function _buildGeneric (g, def) {
  const mat = _getSharedMaterial(`generic:mat:${def.color}`, () => new THREE.MeshStandardMaterial({ color: def.color }))
  const geo = _getSharedGeometry('generic:geo', () => new THREE.BoxGeometry(0.5, 0.5, 0.5))
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = 0.25
  mesh.castShadow = true
  g.add(mesh)
}

let lampHaloTexture = null

function _getLampHaloTexture () {
  if (lampHaloTexture) return lampHaloTexture

  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.10, size / 2, size / 2, size * 0.5)
  gradient.addColorStop(0.00, 'rgba(255,250,220,1.0)')
  gradient.addColorStop(0.18, 'rgba(255,230,170,0.92)')
  gradient.addColorStop(0.42, 'rgba(255,210,130,0.42)')
  gradient.addColorStop(0.72, 'rgba(255,185,90,0.12)')
  gradient.addColorStop(1.00, 'rgba(255,185,90,0.0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  lampHaloTexture = new THREE.CanvasTexture(canvas)
  lampHaloTexture.needsUpdate = true
  return lampHaloTexture
}

/**
 * Create decoration instance data
 */
export function createDecoData (decoType, x, z, variantSeed) {
  return {
    type: decoType,
    x,
    z,
    variantSeed: _normalizeSeed(variantSeed ?? _seedFromPlacement(decoType, x, z)),
    placedAt: Date.now(),
    mesh: null
  }
}

window.DecoSystem = { DECO_DEFINITIONS, createDecoMesh, createDecoData }
