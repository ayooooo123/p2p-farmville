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

/**
 * Create procedural 3D decoration mesh
 * @param {string} decoType - key in DECO_DEFINITIONS
 * @returns {THREE.Group}
 */
export function createDecoMesh (decoType) {
  const def = DECO_DEFINITIONS[decoType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()
  group.userData.objectType = 'decoration'
  group.userData.decoType = decoType

  switch (def.type) {
    case 'fence': _buildFence(group, def); break
    case 'path': _buildPath(group, def); break
    case 'bale': _buildHayBale(group, def); break
    case 'flowerbox': _buildFlowerBox(group, def); break
    case 'flower': _buildFlower(group, def); break
    case 'fountain': _buildFountain(group, def); break
    case 'scarecrow': _buildScarecrow(group, def); break
    case 'mailbox': _buildMailbox(group, def); break
    case 'lamp': _buildLampPost(group, def); break
    case 'bench': _buildBench(group, def); break
    case 'gnome': _buildGnome(group, def); break
    case 'windmill': _buildWindmill(group, def); break
    case 'doghouse': _buildDoghouse(group, def); break
    case 'pond': _buildPond(group, def); break
    case 'bridge': _buildBridge(group, def); break
    case 'well': _buildWell(group, def); break
    case 'birdbath': _buildBirdBath(group, def); break
    default: _buildGeneric(group, def); break
  }

  return group
}

function _buildFence (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  // Two posts
  for (const side of [-0.7, 0.7]) {
    const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.8, 5)
    const post = new THREE.Mesh(postGeo, mat)
    post.position.set(side, 0.4, 0)
    post.castShadow = true
    g.add(post)
  }
  // Two rails
  for (const y of [0.25, 0.55]) {
    const railGeo = new THREE.BoxGeometry(1.5, 0.06, 0.04)
    const rail = new THREE.Mesh(railGeo, mat)
    rail.position.y = y
    rail.castShadow = true
    g.add(rail)
  }
}

function _buildPath (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.95 })
  const pathGeo = new THREE.BoxGeometry(1.8, 0.04, 1.8)
  const path = new THREE.Mesh(pathGeo, mat)
  path.position.y = 0.02
  path.receiveShadow = true
  g.add(path)
  // Stone details
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x696969 })
  for (let i = 0; i < 4; i++) {
    const stoneGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.03, 6)
    const stone = new THREE.Mesh(stoneGeo, stoneMat)
    stone.position.set((Math.random() - 0.5) * 1.2, 0.05, (Math.random() - 0.5) * 1.2)
    g.add(stone)
  }
}

function _buildHayBale (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  const baleGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.7, 12)
  const bale = new THREE.Mesh(baleGeo, mat)
  bale.rotation.z = Math.PI / 2
  bale.position.y = 0.5
  bale.castShadow = true
  g.add(bale)
}

function _buildFlowerBox (g, def) {
  const boxMat = new THREE.MeshStandardMaterial({ color: def.color })
  const boxGeo = new THREE.BoxGeometry(1.2, 0.4, 0.5)
  const box = new THREE.Mesh(boxGeo, boxMat)
  box.position.y = 0.2
  box.castShadow = true
  g.add(box)
  // Flowers
  const flMat = new THREE.MeshStandardMaterial({ color: def.flowerColor })
  for (let i = 0; i < 5; i++) {
    const flGeo = new THREE.SphereGeometry(0.08, 6, 4)
    const fl = new THREE.Mesh(flGeo, flMat)
    fl.position.set(-0.4 + i * 0.2, 0.5, 0)
    g.add(fl)
  }
}

function _buildFlower (g, def) {
  const stemMat = new THREE.MeshStandardMaterial({ color: def.stemColor })
  const petalMat = new THREE.MeshStandardMaterial({ color: def.color })
  const count = 3 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    const h = def.tall ? 1.0 + Math.random() * 0.4 : 0.4 + Math.random() * 0.3
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.025, h, 4)
    const stem = new THREE.Mesh(stemGeo, stemMat)
    const ox = (Math.random() - 0.5) * 0.8
    const oz = (Math.random() - 0.5) * 0.8
    stem.position.set(ox, h / 2, oz)
    g.add(stem)
    const petalGeo = def.tall ? new THREE.SphereGeometry(0.15, 8, 6) : new THREE.SphereGeometry(0.08, 6, 4)
    const petal = new THREE.Mesh(petalGeo, petalMat)
    petal.position.set(ox, h + 0.05, oz)
    petal.castShadow = true
    g.add(petal)
  }
}

function _buildFountain (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  // Base
  const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.3, 16)
  const base = new THREE.Mesh(baseGeo, mat)
  base.position.y = 0.15
  g.add(base)
  // Water basin
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4682b4, transparent: true, opacity: 0.7 })
  const waterGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = 0.35
  g.add(water)
  // Center pillar
  const pillarGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8)
  const pillar = new THREE.Mesh(pillarGeo, mat)
  pillar.position.y = 0.9
  pillar.castShadow = true
  g.add(pillar)
  // Top basin
  const topGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.15, 12)
  const top = new THREE.Mesh(topGeo, mat)
  top.position.y = 1.55
  g.add(top)
}

function _buildScarecrow (g) {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 })
  // Vertical pole
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.0, 5)
  const pole = new THREE.Mesh(poleGeo, woodMat)
  pole.position.y = 1.0
  pole.castShadow = true
  g.add(pole)
  // Horizontal bar (arms)
  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 5)
  const arm = new THREE.Mesh(armGeo, woodMat)
  arm.rotation.z = Math.PI / 2
  arm.position.y = 1.5
  arm.castShadow = true
  g.add(arm)
  // Head
  const headMat = new THREE.MeshStandardMaterial({ color: 0xdeb887 })
  const headGeo = new THREE.SphereGeometry(0.2, 8, 6)
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = 2.15
  head.castShadow = true
  g.add(head)
  // Hat
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  const hatGeo = new THREE.ConeGeometry(0.3, 0.3, 8)
  const hat = new THREE.Mesh(hatGeo, hatMat)
  hat.position.y = 2.45
  g.add(hat)
  const brimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 10)
  const brim = new THREE.Mesh(brimGeo, hatMat)
  brim.position.y = 2.32
  g.add(brim)
  // Cloth on arms
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xcd5c5c })
  const clothGeo = new THREE.BoxGeometry(0.5, 0.6, 0.05)
  const cloth = new THREE.Mesh(clothGeo, clothMat)
  cloth.position.set(0, 1.2, 0)
  g.add(cloth)
}

function _buildMailbox (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  const postMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 })
  // Post
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 5)
  const post = new THREE.Mesh(postGeo, postMat)
  post.position.y = 0.5
  post.castShadow = true
  g.add(post)
  // Box
  const boxGeo = new THREE.BoxGeometry(0.35, 0.25, 0.2)
  const box = new THREE.Mesh(boxGeo, mat)
  box.position.y = 1.1
  box.castShadow = true
  g.add(box)
  // Flag
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  const flagGeo = new THREE.BoxGeometry(0.04, 0.15, 0.04)
  const flag = new THREE.Mesh(flagGeo, flagMat)
  flag.position.set(0.2, 1.2, 0)
  g.add(flag)
}

function _buildLampPost (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6)
  const pole = new THREE.Mesh(poleGeo, mat)
  pole.position.y = 1.25
  pole.castShadow = true
  g.add(pole)
  // Lamp head
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.5 })
  const lampGeo = new THREE.SphereGeometry(0.2, 8, 6)
  const lamp = new THREE.Mesh(lampGeo, lampMat)
  lamp.position.y = 2.6
  g.add(lamp)
  // Arm
  const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4)
  const arm = new THREE.Mesh(armGeo, mat)
  arm.rotation.z = Math.PI / 3
  arm.position.set(0.1, 2.5, 0)
  g.add(arm)
}

function _buildBench (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  // Seat
  const seatGeo = new THREE.BoxGeometry(1.2, 0.06, 0.4)
  const seat = new THREE.Mesh(seatGeo, mat)
  seat.position.y = 0.45
  seat.castShadow = true
  g.add(seat)
  // Back
  const backGeo = new THREE.BoxGeometry(1.2, 0.5, 0.06)
  const back = new THREE.Mesh(backGeo, mat)
  back.position.set(0, 0.7, 0.18)
  back.castShadow = true
  g.add(back)
  // Legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
  for (const x of [-0.5, 0.5]) {
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 4)
    const leg = new THREE.Mesh(legGeo, legMat)
    leg.position.set(x, 0.22, 0)
    g.add(leg)
  }
}

function _buildGnome (g, def) {
  // Body
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4169e1 })
  const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.25
  body.castShadow = true
  g.add(body)
  // Head
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 })
  const headGeo = new THREE.SphereGeometry(0.14, 8, 6)
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = 0.55
  g.add(head)
  // Hat
  const hatMat = new THREE.MeshStandardMaterial({ color: def.color })
  const hatGeo = new THREE.ConeGeometry(0.15, 0.35, 8)
  const hat = new THREE.Mesh(hatGeo, hatMat)
  hat.position.y = 0.82
  hat.castShadow = true
  g.add(hat)
  // Beard
  const beardMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
  const beardGeo = new THREE.ConeGeometry(0.1, 0.2, 6)
  const beard = new THREE.Mesh(beardGeo, beardMat)
  beard.position.set(0, 0.4, -0.08)
  g.add(beard)
}

function _buildWindmill (g) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff })
  // Tower
  const towerGeo = new THREE.CylinderGeometry(0.5, 0.8, 3.5, 8)
  const tower = new THREE.Mesh(towerGeo, mat)
  tower.position.y = 1.75
  tower.castShadow = true
  g.add(tower)
  // Roof
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xb22222 })
  const roofGeo = new THREE.ConeGeometry(0.7, 0.8, 8)
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 3.9
  roof.castShadow = true
  g.add(roof)
  // Blades hub
  const hubGeo = new THREE.SphereGeometry(0.15, 6, 4)
  const hub = new THREE.Mesh(hubGeo, mat)
  hub.position.set(0, 3.0, -0.55)
  g.add(hub)
  // Blades
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xdeb887 })
  for (let i = 0; i < 4; i++) {
    const bladeGeo = new THREE.BoxGeometry(0.15, 1.5, 0.03)
    const blade = new THREE.Mesh(bladeGeo, bladeMat)
    blade.position.set(0, 3.0, -0.65)
    blade.rotation.z = (Math.PI / 2) * i
    // Offset from center along rotation
    const angle = (Math.PI / 2) * i
    blade.position.x += Math.cos(angle) * 0.75
    blade.position.y += Math.sin(angle) * 0.75
    blade.castShadow = true
    g.add(blade)
  }
}

function _buildDoghouse (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  // Base
  const baseGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8)
  const base = new THREE.Mesh(baseGeo, mat)
  base.position.y = 0.3
  base.castShadow = true
  g.add(base)
  // Roof
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
  const roofGeo = new THREE.ConeGeometry(0.65, 0.4, 4)
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 0.8
  roof.rotation.y = Math.PI / 4
  g.add(roof)
  // Door hole
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const doorGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8)
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.rotation.x = Math.PI / 2
  door.position.set(0, 0.22, -0.42)
  g.add(door)
}

function _buildPond (g) {
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4682b4, transparent: true, opacity: 0.7 })
  const waterGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.08, 16)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = 0.04
  water.receiveShadow = true
  g.add(water)
  // Edge rocks
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x696969 })
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 / 10) * i
    const rockGeo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 5, 4)
    const rock = new THREE.Mesh(rockGeo, rockMat)
    rock.position.set(Math.cos(angle) * 1.5, 0.1, Math.sin(angle) * 1.5)
    rock.scale.y = 0.5
    g.add(rock)
  }
}

function _buildBridge (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  // Deck
  const deckGeo = new THREE.BoxGeometry(2.0, 0.1, 1.0)
  const deck = new THREE.Mesh(deckGeo, mat)
  deck.position.y = 0.3
  deck.receiveShadow = true
  g.add(deck)
  // Railings
  for (const side of [-1, 1]) {
    const railGeo = new THREE.BoxGeometry(2.0, 0.4, 0.06)
    const rail = new THREE.Mesh(railGeo, mat)
    rail.position.set(0, 0.55, side * 0.48)
    rail.castShadow = true
    g.add(rail)
    // Posts
    for (const x of [-0.8, 0, 0.8]) {
      const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4)
      const post = new THREE.Mesh(postGeo, mat)
      post.position.set(x, 0.55, side * 0.48)
      g.add(post)
    }
  }
}

function _buildWell (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  // Base cylinder
  const baseGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.7, 10)
  const base = new THREE.Mesh(baseGeo, mat)
  base.position.y = 0.35
  base.castShadow = true
  g.add(base)
  // Water inside
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.6 })
  const waterGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 10)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = 0.5
  g.add(water)
  // Roof supports
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 })
  for (const side of [-1, 1]) {
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 5)
    const post = new THREE.Mesh(postGeo, woodMat)
    post.position.set(side * 0.45, 1.3, 0)
    post.castShadow = true
    g.add(post)
  }
  // Roof
  const roofGeo = new THREE.ConeGeometry(0.6, 0.4, 4)
  const roof = new THREE.Mesh(roofGeo, woodMat)
  roof.position.y = 2.1
  roof.rotation.y = Math.PI / 4
  g.add(roof)
}

function _buildBirdBath (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  // Pedestal
  const pedGeo = new THREE.CylinderGeometry(0.12, 0.2, 0.8, 8)
  const ped = new THREE.Mesh(pedGeo, mat)
  ped.position.y = 0.4
  ped.castShadow = true
  g.add(ped)
  // Basin
  const basinGeo = new THREE.CylinderGeometry(0.5, 0.3, 0.15, 12)
  const basin = new THREE.Mesh(basinGeo, mat)
  basin.position.y = 0.85
  g.add(basin)
  // Water
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4682b4, transparent: true, opacity: 0.6 })
  const waterGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.04, 12)
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.position.y = 0.92
  g.add(water)
}

function _buildGeneric (g, def) {
  const mat = new THREE.MeshStandardMaterial({ color: def.color })
  const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = 0.25
  mesh.castShadow = true
  g.add(mesh)
}

/**
 * Create decoration instance data
 */
export function createDecoData (decoType, x, z) {
  return {
    type: decoType,
    x,
    z,
    placedAt: Date.now(),
    mesh: null
  }
}

window.DecoSystem = { DECO_DEFINITIONS, createDecoMesh, createDecoData }
