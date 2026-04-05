import * as THREE from './three.module.min.js'

// ── 50+ Crop Definitions across level tiers ──────────────────────────────────
// Each crop: name, level, seedCost, sellPrice, growTime (ms), xp, stages count,
//            colors per stage, height per stage
export const CROP_DEFINITIONS = {
  // ── Level 1 ──
  wheat: {
    name: 'Wheat', level: 1, seedCost: 10, sellPrice: 25, growTime: 30000, xp: 2,
    stages: 4,
    colors: [0x8b6914, 0x6b8e23, 0x9acd32, 0xdaa520],
    heights: [0.1, 0.3, 0.6, 1.0]
  },
  strawberry: {
    name: 'Strawberry', level: 1, seedCost: 15, sellPrice: 35, growTime: 45000, xp: 3,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xff2233],
    heights: [0.1, 0.25, 0.4, 0.5]
  },
  soybean: {
    name: 'Soybean', level: 1, seedCost: 8, sellPrice: 20, growTime: 25000, xp: 2,
    stages: 4,
    colors: [0x8b6914, 0x556b2f, 0x6b8e23, 0x9acd32],
    heights: [0.1, 0.3, 0.5, 0.7]
  },
  potato: {
    name: 'Potato', level: 1, seedCost: 12, sellPrice: 28, growTime: 35000, xp: 2,
    stages: 4,
    colors: [0x8b6914, 0x556b2f, 0x228b22, 0x8b7355],
    heights: [0.1, 0.2, 0.35, 0.4]
  },
  rice: {
    name: 'Rice', level: 1, seedCost: 10, sellPrice: 22, growTime: 28000, xp: 2,
    stages: 4,
    colors: [0x8b6914, 0x6b8e23, 0x9acd32, 0xf5deb3],
    heights: [0.1, 0.35, 0.6, 0.85]
  },

  // ── Level 2 ──
  corn: {
    name: 'Corn', level: 2, seedCost: 18, sellPrice: 40, growTime: 50000, xp: 3,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9acd32, 0xffd700],
    heights: [0.1, 0.35, 0.7, 1.1, 1.5]
  },
  carrot: {
    name: 'Carrot', level: 2, seedCost: 14, sellPrice: 32, growTime: 40000, xp: 3,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xff8c00],
    heights: [0.1, 0.2, 0.35, 0.5]
  },
  lettuce: {
    name: 'Lettuce', level: 2, seedCost: 12, sellPrice: 28, growTime: 32000, xp: 2,
    stages: 4,
    colors: [0x8b6914, 0x90ee90, 0x7cfc00, 0x32cd32],
    heights: [0.1, 0.2, 0.3, 0.4]
  },
  radish: {
    name: 'Radish', level: 2, seedCost: 10, sellPrice: 24, growTime: 25000, xp: 2,
    stages: 3,
    colors: [0x8b6914, 0x228b22, 0xdc143c],
    heights: [0.1, 0.25, 0.35]
  },
  peas: {
    name: 'Peas', level: 2, seedCost: 13, sellPrice: 30, growTime: 35000, xp: 2,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x00ff00],
    heights: [0.1, 0.3, 0.5, 0.7]
  },

  // ── Level 3 ──
  tomato: {
    name: 'Tomato', level: 3, seedCost: 20, sellPrice: 45, growTime: 55000, xp: 4,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9acd32, 0xff4500],
    heights: [0.1, 0.3, 0.5, 0.7, 0.8]
  },
  onion: {
    name: 'Onion', level: 3, seedCost: 16, sellPrice: 36, growTime: 42000, xp: 3,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x6b8e23, 0xdaa520],
    heights: [0.1, 0.2, 0.3, 0.35]
  },
  garlic: {
    name: 'Garlic', level: 3, seedCost: 18, sellPrice: 40, growTime: 48000, xp: 3,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x6b8e23, 0xfff8dc],
    heights: [0.1, 0.2, 0.3, 0.35]
  },
  celery: {
    name: 'Celery', level: 3, seedCost: 15, sellPrice: 34, growTime: 38000, xp: 3,
    stages: 4,
    colors: [0x8b6914, 0x90ee90, 0x7cfc00, 0x32cd32],
    heights: [0.1, 0.3, 0.6, 0.9]
  },
  spinach: {
    name: 'Spinach', level: 3, seedCost: 14, sellPrice: 30, growTime: 30000, xp: 2,
    stages: 3,
    colors: [0x8b6914, 0x228b22, 0x006400],
    heights: [0.1, 0.2, 0.35]
  },

  // ── Level 5 ──
  pepper: {
    name: 'Pepper', level: 5, seedCost: 22, sellPrice: 50, growTime: 60000, xp: 4,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9acd32, 0xff0000],
    heights: [0.1, 0.3, 0.5, 0.65, 0.7]
  },
  eggplant: {
    name: 'Eggplant', level: 5, seedCost: 24, sellPrice: 55, growTime: 65000, xp: 5,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x6b8e23, 0x4b0082],
    heights: [0.1, 0.3, 0.5, 0.65, 0.75]
  },
  cucumber: {
    name: 'Cucumber', level: 5, seedCost: 18, sellPrice: 42, growTime: 48000, xp: 4,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x006400],
    heights: [0.1, 0.25, 0.4, 0.5]
  },
  zucchini: {
    name: 'Zucchini', level: 5, seedCost: 20, sellPrice: 46, growTime: 52000, xp: 4,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x2e8b57],
    heights: [0.1, 0.25, 0.45, 0.55]
  },
  beet: {
    name: 'Beet', level: 5, seedCost: 16, sellPrice: 38, growTime: 40000, xp: 3,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x8b0000],
    heights: [0.1, 0.2, 0.3, 0.4]
  },

  // ── Level 7 ──
  watermelon: {
    name: 'Watermelon', level: 7, seedCost: 30, sellPrice: 72, growTime: 80000, xp: 6,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x2e8b57, 0x006400],
    heights: [0.1, 0.2, 0.35, 0.55, 0.7]
  },
  cantaloupe: {
    name: 'Cantaloupe', level: 7, seedCost: 28, sellPrice: 65, growTime: 72000, xp: 5,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xdaa520],
    heights: [0.1, 0.25, 0.4, 0.55]
  },
  pumpkin: {
    name: 'Pumpkin', level: 7, seedCost: 35, sellPrice: 80, growTime: 90000, xp: 7,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9acd32, 0xff8c00],
    heights: [0.1, 0.25, 0.4, 0.6, 0.8]
  },
  squash: {
    name: 'Squash', level: 7, seedCost: 25, sellPrice: 58, growTime: 65000, xp: 5,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xffd700],
    heights: [0.1, 0.25, 0.4, 0.55]
  },
  turnip: {
    name: 'Turnip', level: 7, seedCost: 20, sellPrice: 48, growTime: 55000, xp: 4,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x6b8e23, 0xe8d5b7],
    heights: [0.1, 0.2, 0.3, 0.4]
  },

  // ── Level 10 ──
  sunflower: {
    name: 'Sunflower', level: 10, seedCost: 40, sellPrice: 95, growTime: 100000, xp: 8,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9acd32, 0xffd700],
    heights: [0.1, 0.4, 0.8, 1.2, 1.6]
  },
  cotton: {
    name: 'Cotton', level: 10, seedCost: 35, sellPrice: 85, growTime: 90000, xp: 7,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xfffafa],
    heights: [0.1, 0.3, 0.6, 0.9]
  },
  sugarcane: {
    name: 'Sugarcane', level: 10, seedCost: 38, sellPrice: 90, growTime: 95000, xp: 7,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9acd32, 0xdeb887],
    heights: [0.1, 0.4, 0.8, 1.2, 1.5]
  },
  coffee: {
    name: 'Coffee', level: 10, seedCost: 45, sellPrice: 110, growTime: 110000, xp: 9,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x2e8b57, 0x4b3621],
    heights: [0.1, 0.3, 0.6, 0.8, 1.0]
  },
  tobacco: {
    name: 'Tobacco', level: 10, seedCost: 42, sellPrice: 100, growTime: 105000, xp: 8,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x8fbc8f],
    heights: [0.1, 0.35, 0.65, 1.0]
  },

  // ── Level 13 ──
  blueberry: {
    name: 'Blueberry', level: 13, seedCost: 50, sellPrice: 120, growTime: 120000, xp: 10,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x2e8b57, 0x4169e1],
    heights: [0.1, 0.25, 0.4, 0.55, 0.6]
  },
  raspberry: {
    name: 'Raspberry', level: 13, seedCost: 48, sellPrice: 115, growTime: 115000, xp: 9,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xdc143c],
    heights: [0.1, 0.25, 0.45, 0.55]
  },
  blackberry: {
    name: 'Blackberry', level: 13, seedCost: 46, sellPrice: 108, growTime: 108000, xp: 9,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x2c0033],
    heights: [0.1, 0.25, 0.45, 0.55]
  },
  cranberry: {
    name: 'Cranberry', level: 13, seedCost: 52, sellPrice: 125, growTime: 125000, xp: 10,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xb22222],
    heights: [0.1, 0.2, 0.3, 0.4]
  },
  grape: {
    name: 'Grape', level: 13, seedCost: 55, sellPrice: 130, growTime: 130000, xp: 11,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x6b8e23, 0x6a0dad],
    heights: [0.1, 0.3, 0.5, 0.7, 0.85]
  },

  // ── Level 17 ──
  artichoke: {
    name: 'Artichoke', level: 17, seedCost: 60, sellPrice: 145, growTime: 140000, xp: 12,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x6b8e23, 0x556b2f],
    heights: [0.1, 0.25, 0.45, 0.65, 0.8]
  },
  asparagus: {
    name: 'Asparagus', level: 17, seedCost: 55, sellPrice: 135, growTime: 130000, xp: 11,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x2e8b57],
    heights: [0.1, 0.35, 0.7, 1.0]
  },
  broccoli: {
    name: 'Broccoli', level: 17, seedCost: 58, sellPrice: 140, growTime: 135000, xp: 11,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x006400],
    heights: [0.1, 0.25, 0.4, 0.55]
  },
  cauliflower: {
    name: 'Cauliflower', level: 17, seedCost: 56, sellPrice: 138, growTime: 132000, xp: 11,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xfffff0],
    heights: [0.1, 0.25, 0.4, 0.55]
  },
  brussels_sprouts: {
    name: 'Brussels Sprouts', level: 17, seedCost: 54, sellPrice: 132, growTime: 128000, xp: 10,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x3cb371],
    heights: [0.1, 0.25, 0.4, 0.6]
  },

  // ── Level 22 ──
  lavender: {
    name: 'Lavender', level: 22, seedCost: 70, sellPrice: 170, growTime: 160000, xp: 14,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9370db, 0x7b68ee],
    heights: [0.1, 0.3, 0.5, 0.7, 0.85]
  },
  chamomile: {
    name: 'Chamomile', level: 22, seedCost: 65, sellPrice: 160, growTime: 150000, xp: 13,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xfffacd],
    heights: [0.1, 0.25, 0.4, 0.55]
  },
  ginger: {
    name: 'Ginger', level: 22, seedCost: 75, sellPrice: 180, growTime: 170000, xp: 15,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xdeb887],
    heights: [0.1, 0.2, 0.35, 0.5]
  },
  turmeric: {
    name: 'Turmeric', level: 22, seedCost: 72, sellPrice: 175, growTime: 165000, xp: 14,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xff8c00],
    heights: [0.1, 0.25, 0.4, 0.55]
  },
  saffron: {
    name: 'Saffron', level: 22, seedCost: 85, sellPrice: 200, growTime: 180000, xp: 16,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9370db, 0xff4500],
    heights: [0.1, 0.2, 0.35, 0.45, 0.5]
  },

  // ── Level 30 ──
  dragon_fruit: {
    name: 'Dragon Fruit', level: 30, seedCost: 100, sellPrice: 250, growTime: 200000, xp: 20,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x2e8b57, 0xff1493],
    heights: [0.1, 0.3, 0.5, 0.7, 0.85]
  },
  passion_fruit: {
    name: 'Passion Fruit', level: 30, seedCost: 95, sellPrice: 240, growTime: 195000, xp: 19,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x6b8e23, 0x8b008b],
    heights: [0.1, 0.3, 0.55, 0.7, 0.8]
  },
  lychee: {
    name: 'Lychee', level: 30, seedCost: 90, sellPrice: 230, growTime: 190000, xp: 18,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0xf08080],
    heights: [0.1, 0.25, 0.45, 0.6]
  },
  starfruit: {
    name: 'Starfruit', level: 30, seedCost: 105, sellPrice: 260, growTime: 210000, xp: 21,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9acd32, 0xffd700],
    heights: [0.1, 0.3, 0.5, 0.7, 0.85]
  },
  durian: {
    name: 'Durian', level: 30, seedCost: 110, sellPrice: 275, growTime: 220000, xp: 22,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x6b8e23, 0x808000],
    heights: [0.1, 0.25, 0.45, 0.65, 0.8]
  },

  // ── Level 40 ──
  truffle: {
    name: 'Truffle', level: 40, seedCost: 150, sellPrice: 380, growTime: 280000, xp: 30,
    stages: 4,
    colors: [0x8b6914, 0x556b2f, 0x3e2723, 0x1b0000],
    heights: [0.1, 0.15, 0.2, 0.3]
  },
  wasabi: {
    name: 'Wasabi', level: 40, seedCost: 140, sellPrice: 360, growTime: 260000, xp: 28,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x00ff7f],
    heights: [0.1, 0.2, 0.35, 0.45]
  },
  vanilla: {
    name: 'Vanilla', level: 40, seedCost: 160, sellPrice: 400, growTime: 300000, xp: 32,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x9acd32, 0xfff8dc],
    heights: [0.1, 0.35, 0.6, 0.85, 1.1]
  },
  cacao: {
    name: 'Cacao', level: 40, seedCost: 155, sellPrice: 390, growTime: 290000, xp: 31,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x2e8b57, 0x3e2723],
    heights: [0.1, 0.3, 0.55, 0.75, 0.9]
  },
  tea: {
    name: 'Tea', level: 40, seedCost: 145, sellPrice: 370, growTime: 270000, xp: 29,
    stages: 4,
    colors: [0x8b6914, 0x228b22, 0x32cd32, 0x006400],
    heights: [0.1, 0.3, 0.55, 0.75]
  },

  // ── Level 50 (Exotic/Rare) ──
  golden_wheat: {
    name: 'Golden Wheat', level: 50, seedCost: 200, sellPrice: 500, growTime: 350000, xp: 40,
    stages: 5,
    colors: [0x8b6914, 0xdaa520, 0xffd700, 0xffdf00, 0xfff44f],
    heights: [0.1, 0.35, 0.6, 0.85, 1.1]
  },
  crystal_berry: {
    name: 'Crystal Berry', level: 50, seedCost: 220, sellPrice: 550, growTime: 380000, xp: 44,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x00ced1, 0x7df9ff, 0xe0ffff],
    heights: [0.1, 0.2, 0.35, 0.45, 0.55]
  },
  moonflower: {
    name: 'Moonflower', level: 50, seedCost: 250, sellPrice: 620, growTime: 400000, xp: 50,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0x4169e1, 0x9370db, 0xe6e6fa],
    heights: [0.1, 0.3, 0.55, 0.8, 1.0]
  },
  starbloom: {
    name: 'Starbloom', level: 50, seedCost: 240, sellPrice: 600, growTime: 390000, xp: 48,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0xffd700, 0xff69b4, 0xff1493],
    heights: [0.1, 0.3, 0.55, 0.75, 0.95]
  },
  phoenix_pepper: {
    name: 'Phoenix Pepper', level: 50, seedCost: 260, sellPrice: 650, growTime: 420000, xp: 52,
    stages: 5,
    colors: [0x8b6914, 0x228b22, 0xff4500, 0xff0000, 0xff6347],
    heights: [0.1, 0.3, 0.5, 0.65, 0.75]
  }
}

// ── Procedural 3D crop mesh generation ───────────────────────────────────────

/**
 * Create a 3D mesh group for a crop at a specific growth stage
 * @param {string} cropType - key in CROP_DEFINITIONS
 * @param {number} stage - growth stage index (0 = seed, last = mature)
 * @returns {THREE.Group}
 */
export function createCropMesh (cropType, stage) {
  const def = CROP_DEFINITIONS[cropType]
  if (!def) return new THREE.Group()

  const clampedStage = Math.min(stage, def.stages - 1)
  const color = def.colors[clampedStage]
  const height = def.heights[clampedStage]
  const group = new THREE.Group()

  if (clampedStage === 0) {
    // Stage 0: seed mound - small brown bumps
    const moundGeo = new THREE.SphereGeometry(0.15, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2)
    const moundMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 })
    const mound = new THREE.Mesh(moundGeo, moundMat)
    mound.position.y = 0
    group.add(mound)

    // Tiny seed dots
    for (let i = 0; i < 3; i++) {
      const seedGeo = new THREE.SphereGeometry(0.04, 4, 4)
      const seedMat = new THREE.MeshStandardMaterial({ color: 0x5c4a1e })
      const seed = new THREE.Mesh(seedGeo, seedMat)
      seed.position.set((i - 1) * 0.08, 0.05, 0)
      group.add(seed)
    }
  } else if (clampedStage === 1) {
    // Stage 1: sprout - thin stem with small leaf
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, height, 5)
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x228b22 })
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = height / 2
    stem.castShadow = true
    group.add(stem)

    // Small leaf
    const leafGeo = new THREE.ConeGeometry(0.08, 0.15, 4)
    const leafMat = new THREE.MeshStandardMaterial({ color })
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.position.set(0.06, height * 0.7, 0)
    leaf.rotation.z = -0.5
    group.add(leaf)
  } else if (clampedStage === 2 || (clampedStage === 2 && def.stages === 3)) {
    // Stage 2: growing - taller stem, multiple leaves
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, height, 6)
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x228b22 })
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = height / 2
    stem.castShadow = true
    group.add(stem)

    // Multiple leaves
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const leafGeo = new THREE.ConeGeometry(0.1, 0.2, 4)
      const leafMat = new THREE.MeshStandardMaterial({ color })
      const leaf = new THREE.Mesh(leafGeo, leafMat)
      leaf.position.set(Math.cos(angle) * 0.1, height * 0.6, Math.sin(angle) * 0.1)
      leaf.rotation.z = -Math.cos(angle) * 0.6
      leaf.rotation.x = -Math.sin(angle) * 0.6
      group.add(leaf)
    }
  } else {
    // Stage 3+ (mature): crop-specific shapes
    _buildMatureCrop(group, cropType, def, clampedStage, color, height)
  }

  group.userData.cropType = cropType
  group.userData.stage = clampedStage
  return group
}

function _buildMatureCrop (group, cropType, def, stage, color, height) {
  // Stem (common to most crops)
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.07, height * 0.8, 6)
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x228b22 })
  const stem = new THREE.Mesh(stemGeo, stemMat)
  stem.position.y = height * 0.4
  stem.castShadow = true
  group.add(stem)

  // Leaves around stem
  const leafCount = stage >= 3 ? 5 : 3
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2
    const leafGeo = new THREE.ConeGeometry(0.1, 0.2, 4)
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x32cd32 })
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.position.set(Math.cos(angle) * 0.12, height * 0.4, Math.sin(angle) * 0.12)
    leaf.rotation.z = -Math.cos(angle) * 0.7
    leaf.rotation.x = -Math.sin(angle) * 0.7
    group.add(leaf)
  }

  // Crop-specific top / fruit
  switch (cropType) {
    case 'wheat':
    case 'golden_wheat':
    case 'rice': {
      // Stalks with grain head
      for (let i = 0; i < 5; i++) {
        const sx = (Math.random() - 0.5) * 0.2
        const sz = (Math.random() - 0.5) * 0.2
        const stalkGeo = new THREE.CylinderGeometry(0.02, 0.02, height, 4)
        const stalkMat = new THREE.MeshStandardMaterial({ color })
        const stalk = new THREE.Mesh(stalkGeo, stalkMat)
        stalk.position.set(sx, height / 2, sz)
        stalk.castShadow = true
        group.add(stalk)
        // Grain head
        const grainGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.15, 5)
        const grain = new THREE.Mesh(grainGeo, new THREE.MeshStandardMaterial({ color }))
        grain.position.set(sx, height + 0.05, sz)
        group.add(grain)
      }
      break
    }

    case 'strawberry':
    case 'blueberry':
    case 'raspberry':
    case 'blackberry':
    case 'cranberry':
    case 'crystal_berry': {
      // Small berries clustered
      const berryCount = 4 + stage
      for (let i = 0; i < berryCount; i++) {
        const angle = (i / berryCount) * Math.PI * 2
        const r = 0.12 + Math.random() * 0.05
        const berryGeo = new THREE.SphereGeometry(0.06, 6, 6)
        const berryMat = new THREE.MeshStandardMaterial({ color })
        const berry = new THREE.Mesh(berryGeo, berryMat)
        berry.position.set(Math.cos(angle) * r, height * 0.65 + Math.random() * 0.1, Math.sin(angle) * r)
        berry.castShadow = true
        group.add(berry)
      }
      break
    }

    case 'tomato':
    case 'pepper':
    case 'phoenix_pepper': {
      // Round fruits hanging
      const fruitCount = 2 + Math.floor(stage / 2)
      for (let i = 0; i < fruitCount; i++) {
        const angle = (i / fruitCount) * Math.PI * 2
        const fruitGeo = new THREE.SphereGeometry(0.1, 8, 8)
        const fruitMat = new THREE.MeshStandardMaterial({ color })
        const fruit = new THREE.Mesh(fruitGeo, fruitMat)
        fruit.position.set(Math.cos(angle) * 0.15, height * 0.5 + i * 0.08, Math.sin(angle) * 0.15)
        fruit.castShadow = true
        group.add(fruit)
      }
      break
    }

    case 'eggplant': {
      // Elongated purple fruit
      const eggGeo = new THREE.CapsuleGeometry(0.08, 0.2, 4, 8)
      const eggMat = new THREE.MeshStandardMaterial({ color })
      const egg = new THREE.Mesh(eggGeo, eggMat)
      egg.position.set(0.12, height * 0.5, 0)
      egg.rotation.z = 0.3
      egg.castShadow = true
      group.add(egg)
      break
    }

    case 'corn': {
      // Tall stalk with corn cob
      const cornCobGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.25, 8)
      const cornCobMat = new THREE.MeshStandardMaterial({ color })
      const cornCob = new THREE.Mesh(cornCobGeo, cornCobMat)
      cornCob.position.set(0.1, height * 0.6, 0)
      cornCob.rotation.z = 0.3
      cornCob.castShadow = true
      group.add(cornCob)
      // Husk leaves
      const huskGeo = new THREE.ConeGeometry(0.12, 0.3, 4)
      const huskMat = new THREE.MeshStandardMaterial({ color: 0x9acd32 })
      const husk = new THREE.Mesh(huskGeo, huskMat)
      husk.position.set(0.1, height * 0.6, 0)
      husk.rotation.z = 0.3
      group.add(husk)
      break
    }

    case 'pumpkin': {
      // Large orange sphere on ground
      const pumpGeo = new THREE.SphereGeometry(0.3, 10, 8)
      const pumpMat = new THREE.MeshStandardMaterial({ color })
      const pump = new THREE.Mesh(pumpGeo, pumpMat)
      pump.scale.y = 0.7
      pump.position.y = 0.2
      pump.castShadow = true
      group.add(pump)
      // Stem on top
      const pStemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 4)
      const pStemMat = new THREE.MeshStandardMaterial({ color: 0x228b22 })
      const pStem = new THREE.Mesh(pStemGeo, pStemMat)
      pStem.position.y = 0.4
      group.add(pStem)
      break
    }

    case 'watermelon': {
      // Large green ellipsoid on ground
      const wmGeo = new THREE.SphereGeometry(0.28, 10, 8)
      const wmMat = new THREE.MeshStandardMaterial({ color })
      const wm = new THREE.Mesh(wmGeo, wmMat)
      wm.scale.set(1.3, 0.7, 1.0)
      wm.position.y = 0.15
      wm.castShadow = true
      group.add(wm)
      break
    }

    case 'sunflower':
    case 'moonflower':
    case 'starbloom': {
      // Tall stem with flower head
      const headGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12)
      const headMat = new THREE.MeshStandardMaterial({ color })
      const head = new THREE.Mesh(headGeo, headMat)
      head.position.y = height
      head.castShadow = true
      group.add(head)
      // Center
      const centerGeo = new THREE.SphereGeometry(0.1, 8, 8)
      const centerMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 })
      const center = new THREE.Mesh(centerGeo, centerMat)
      center.position.y = height + 0.04
      group.add(center)
      // Petals
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const petalGeo = new THREE.BoxGeometry(0.08, 0.02, 0.12)
        const petalMat = new THREE.MeshStandardMaterial({ color })
        const petal = new THREE.Mesh(petalGeo, petalMat)
        petal.position.set(Math.cos(a) * 0.2, height, Math.sin(a) * 0.2)
        petal.rotation.y = -a
        group.add(petal)
      }
      break
    }

    case 'potato':
    case 'onion':
    case 'garlic':
    case 'beet':
    case 'turnip':
    case 'ginger':
    case 'turmeric':
    case 'truffle': {
      // Root vegetables - bulge at ground level
      const bulbGeo = new THREE.SphereGeometry(0.12, 8, 6)
      const bulbMat = new THREE.MeshStandardMaterial({ color })
      const bulb = new THREE.Mesh(bulbGeo, bulbMat)
      bulb.position.y = 0.05
      bulb.scale.y = 0.8
      bulb.castShadow = true
      group.add(bulb)
      // Tops (green leaves sticking up)
      for (let i = 0; i < 3; i++) {
        const topGeo = new THREE.ConeGeometry(0.03, height * 0.6, 4)
        const topMat = new THREE.MeshStandardMaterial({ color: 0x32cd32 })
        const top = new THREE.Mesh(topGeo, topMat)
        top.position.set((i - 1) * 0.06, height * 0.4, 0)
        group.add(top)
      }
      break
    }

    case 'carrot': {
      // Orange cone root + green top
      const rootGeo = new THREE.ConeGeometry(0.06, 0.25, 6)
      const rootMat = new THREE.MeshStandardMaterial({ color })
      const root = new THREE.Mesh(rootGeo, rootMat)
      root.position.y = 0.05
      root.rotation.x = Math.PI
      root.castShadow = true
      group.add(root)
      // Feathery greens
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        const fGeo = new THREE.ConeGeometry(0.04, 0.3, 3)
        const fMat = new THREE.MeshStandardMaterial({ color: 0x32cd32 })
        const f = new THREE.Mesh(fGeo, fMat)
        f.position.set(Math.cos(a) * 0.04, height * 0.5, Math.sin(a) * 0.04)
        group.add(f)
      }
      break
    }

    case 'cotton': {
      // White fluffy balls on stems
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        const fluffGeo = new THREE.SphereGeometry(0.09, 6, 6)
        const fluffMat = new THREE.MeshStandardMaterial({ color })
        const fluff = new THREE.Mesh(fluffGeo, fluffMat)
        fluff.position.set(Math.cos(a) * 0.12, height * 0.7 + i * 0.05, Math.sin(a) * 0.12)
        fluff.castShadow = true
        group.add(fluff)
      }
      break
    }

    case 'sugarcane':
    case 'asparagus':
    case 'celery': {
      // Tall stalks cluster
      for (let i = 0; i < 4; i++) {
        const sx = (Math.random() - 0.5) * 0.15
        const sz = (Math.random() - 0.5) * 0.15
        const sGeo = new THREE.CylinderGeometry(0.03, 0.04, height, 6)
        const sMat = new THREE.MeshStandardMaterial({ color })
        const s = new THREE.Mesh(sGeo, sMat)
        s.position.set(sx, height / 2, sz)
        s.castShadow = true
        group.add(s)
      }
      break
    }

    case 'grape':
    case 'passion_fruit': {
      // Cluster of small fruits hanging from vine
      const clusterGeo = new THREE.Group()
      for (let i = 0; i < 8; i++) {
        const gx = (Math.random() - 0.5) * 0.15
        const gy = Math.random() * 0.2
        const gz = (Math.random() - 0.5) * 0.15
        const gGeo = new THREE.SphereGeometry(0.05, 6, 6)
        const gMat = new THREE.MeshStandardMaterial({ color })
        const g = new THREE.Mesh(gGeo, gMat)
        g.position.set(gx, gy, gz)
        clusterGeo.add(g)
      }
      clusterGeo.position.y = height * 0.55
      group.add(clusterGeo)
      break
    }

    case 'dragon_fruit':
    case 'durian': {
      // Spiky exotic fruit
      const exoGeo = new THREE.SphereGeometry(0.15, 8, 8)
      const exoMat = new THREE.MeshStandardMaterial({ color })
      const exo = new THREE.Mesh(exoGeo, exoMat)
      exo.position.y = height * 0.55
      exo.castShadow = true
      group.add(exo)
      // Spikes
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const spikeGeo = new THREE.ConeGeometry(0.03, 0.1, 4)
        const spikeMat = new THREE.MeshStandardMaterial({ color })
        const spike = new THREE.Mesh(spikeGeo, spikeMat)
        spike.position.set(Math.cos(a) * 0.15, height * 0.55, Math.sin(a) * 0.15)
        spike.rotation.z = -Math.cos(a) * 1.2
        spike.rotation.x = -Math.sin(a) * 1.2
        group.add(spike)
      }
      break
    }

    case 'lychee':
    case 'starfruit': {
      // Round-ish exotic fruit
      const lfGeo = new THREE.SphereGeometry(0.1, 8, 8)
      const lfMat = new THREE.MeshStandardMaterial({ color })
      const lf = new THREE.Mesh(lfGeo, lfMat)
      lf.position.y = height * 0.6
      lf.castShadow = true
      group.add(lf)
      break
    }

    default: {
      // Generic: leafy bush top
      const bushGeo = new THREE.SphereGeometry(0.18, 8, 6)
      const bushMat = new THREE.MeshStandardMaterial({ color })
      const bush = new THREE.Mesh(bushGeo, bushMat)
      bush.position.y = height * 0.7
      bush.castShadow = true
      group.add(bush)
      break
    }
  }
}

/**
 * Create a withered version of a crop mesh (gray/droopy)
 */
export function createWitheredMesh (cropType) {
  const def = CROP_DEFINITIONS[cropType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()
  const height = def.heights[def.stages - 1] * 0.7 // Shorter/droopy

  // Wilted stem
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.07, height * 0.6, 6)
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x696969 })
  const stem = new THREE.Mesh(stemGeo, stemMat)
  stem.position.y = height * 0.3
  stem.rotation.z = 0.2 // Leaning
  stem.castShadow = true
  group.add(stem)

  // Droopy gray leaves
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2
    const leafGeo = new THREE.ConeGeometry(0.1, 0.2, 4)
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x808080 })
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.position.set(Math.cos(angle) * 0.1, height * 0.25, Math.sin(angle) * 0.1)
    leaf.rotation.z = Math.cos(angle) * 1.2 // Drooping down
    leaf.rotation.x = Math.sin(angle) * 1.2
    group.add(leaf)
  }

  group.userData.cropType = cropType
  group.userData.withered = true
  return group
}

/**
 * Update crop growth. Advances stage based on elapsed time and water multiplier.
 * @param {object} cropPlot - { type, plantedAt, watered, stage, withered, mesh, growthAccum }
 * @param {number} deltaTime - ms since last update
 * @returns {boolean} true if stage changed
 */
export function updateCropGrowth (cropPlot, deltaTime) {
  if (cropPlot.withered) return false

  const def = CROP_DEFINITIONS[cropPlot.type]
  if (!def) return false

  const maxStage = def.stages - 1
  const isMature = cropPlot.stage >= maxStage

  // Check withering: if mature for 2x growTime, wither
  if (isMature) {
    const elapsed = Date.now() - cropPlot.plantedAt
    const witherTime = def.growTime * (1 + 2) // total grow + 2x wither window
    if (elapsed > witherTime) {
      cropPlot.withered = true
      return true
    }
    return false
  }

  // Accumulate growth time
  const multiplier = cropPlot.watered ? 2 : 1
  cropPlot.growthAccum = (cropPlot.growthAccum || 0) + deltaTime * multiplier

  // Time per stage
  const timePerStage = def.growTime / maxStage

  if (cropPlot.growthAccum >= timePerStage) {
    cropPlot.growthAccum -= timePerStage
    cropPlot.stage = Math.min(cropPlot.stage + 1, maxStage)
    // Reset watered after stage advance
    cropPlot.watered = false
    return true
  }

  return false
}

window.CropSystem = { CROP_DEFINITIONS, createCropMesh, createWitheredMesh, updateCropGrowth }
