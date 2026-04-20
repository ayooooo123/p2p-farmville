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

// ── 3D growth-stage crop mesh generation ─────────────────────────────────────
//
// Each stage renders differently to give visual depth in the top-down view:
//   Stage 0 (seed)     — tiny flat disc, dark brown
//   Stage 1 (sprout)   — short cylinder (stem) + tiny sphere, bright green
//   Stage 2 (growing)  — taller cylinder + small sphere, medium green → crop color
//   Stage 3 (maturing) — full cylinder + larger sphere in crop color
//   Stage 4+ (ready)   — same as stage 3 + pulsing emissive glow ring

// Stage geometry parameters [cylinderRadius, cylinderHeight, sphereRadius]
const STAGE_GEOM = [
  [0.08, 0,    0   ],   // 0: seed — just a flat disc
  [0.07, 0.18, 0.10],   // 1: sprout
  [0.08, 0.32, 0.16],   // 2: growing
  [0.09, 0.48, 0.22],   // 3: maturing
  [0.10, 0.55, 0.28]    // 4: mature
]

const cropSpriteTextureCache = new Map()
const cropSpriteMaterialCache = new Map()
const cropStemGeometryCache = new Map()
const cropStemMaterialCache = new Map()

function _markSharedAsset (asset) {
  if (!asset) return asset
  asset.userData = asset.userData || {}
  asset.userData.sharedAsset = true
  return asset
}

const sproutGeometry = _markSharedAsset(new THREE.CylinderGeometry(0.025, 0.05, 0.12, 6))
const sproutMaterial = _markSharedAsset(new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.9 }))
const witheredStemGeometry = _markSharedAsset(new THREE.CylinderGeometry(0.035, 0.055, 0.16, 5))
const witheredStemMaterial = _markSharedAsset(new THREE.MeshStandardMaterial({ color: 0x6a5842, roughness: 1.0 }))

// Shared ring/arc assets used by every ready / growing crop instance.
// Ready-crop glow rings share one of two materials — normal (yellow) or
// wither-warn (orange) — swapped by setCropWitherWarn. Opacity is animated
// globally by setReadyGlowOpacity so animateReadyCrops mutates shared state
// exactly twice per frame instead of once per ring.
const GLOW_RING_GEOMETRY = _markSharedAsset(new THREE.RingGeometry(0.28, 0.46, 32))
const GLOW_RING_MATERIAL_NORMAL = _markSharedAsset(new THREE.MeshBasicMaterial({
  color: 0xffee44,
  transparent: true,
  opacity: 0.75,
  side: THREE.DoubleSide,
  depthWrite: false
}))
const GLOW_RING_MATERIAL_WARN = _markSharedAsset(new THREE.MeshBasicMaterial({
  color: 0xff6600,
  transparent: true,
  opacity: 0.75,
  side: THREE.DoubleSide,
  depthWrite: false
}))

const PROGRESS_ARC_MATERIAL = _markSharedAsset(new THREE.MeshBasicMaterial({
  color: 0x44ff88,
  transparent: true,
  opacity: 0.65,
  side: THREE.DoubleSide,
  depthWrite: false
}))
const progressArcGeometryCache = new Map()

function _getProgressArcGeometry (stage, maxStage) {
  if (!Number.isFinite(maxStage) || maxStage <= 0) return null
  const cacheKey = stage + ':' + maxStage
  let geo = progressArcGeometryCache.get(cacheKey)
  if (!geo) {
    const arcLen = 2 * Math.PI * (stage / maxStage)
    geo = _markSharedAsset(new THREE.RingGeometry(0.26, 0.36, 32, 1, -Math.PI / 2, arcLen))
    progressArcGeometryCache.set(cacheKey, geo)
  }
  return geo
}

function _getCropStemGeometry (radiusTop, radiusBottom, height, radialSegments) {
  const cacheKey = radiusTop + ':' + radiusBottom + ':' + height + ':' + radialSegments
  let geo = cropStemGeometryCache.get(cacheKey)
  if (!geo) {
    geo = _markSharedAsset(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments))
    cropStemGeometryCache.set(cacheKey, geo)
  }
  return geo
}

function _getCropStemMaterial (color, roughness = 0.85) {
  const cacheKey = color + ':' + roughness
  let mat = cropStemMaterialCache.get(cacheKey)
  if (!mat) {
    mat = _markSharedAsset(new THREE.MeshStandardMaterial({ color, roughness }))
    cropStemMaterialCache.set(cacheKey, mat)
  }
  return mat
}

function _hexToCss (hex) {
  return '#' + new THREE.Color(hex).getHexString()
}

function _makeCropSpriteTexture (cropType, stage, withered = false) {
  const def = CROP_DEFINITIONS[cropType]
  const maxStage = def ? def.stages - 1 : 0
  const clampedStage = Math.max(0, Math.min(stage, maxStage))
  const cacheKey = cropType + ':' + clampedStage + ':' + (withered ? 'w' : 'n')
  const cached = cropSpriteTextureCache.get(cacheKey)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const seed = def ? new THREE.Color(def.colors[clampedStage]) : new THREE.Color(0x44aa44)
  const leaf = withered ? new THREE.Color(0x7b5d3c) : seed.clone().lerp(new THREE.Color(0x228b22), 0.35)
  const fruit = withered ? new THREE.Color(0x6a5842) : seed.clone()
  const stem = withered ? new THREE.Color(0x5a4530) : new THREE.Color(0x2f7d32)
  const bark = withered ? 'rgba(90,69,48,0.45)' : 'rgba(25,60,25,0.25)'

  const cx = 64
  const cy = 66
  const stageScale = 0.48 + clampedStage * 0.08
  const leafCount = withered ? 3 : Math.min(6, 2 + clampedStage)

  // Soft shadow under the plant to anchor it to the plot without looking like a debug dot.
  const shadowGrad = ctx.createRadialGradient(cx, cy + 10, 2, cx, cy + 10, 30)
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.22)')
  shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.08)')
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = shadowGrad
  ctx.beginPath()
  ctx.ellipse(cx, cy + 12, 22 + stageScale * 4, 8 + stageScale * 1.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Stem
  ctx.strokeStyle = _hexToCss(stem.getHex())
  ctx.lineWidth = withered ? 6 : 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, cy + 18)
  ctx.quadraticCurveTo(cx + (withered ? -2 : 0), cy + 3, cx, cy - 10 + (withered ? 2 : 0))
  ctx.stroke()

  // Leaves / petals built from curved lobes rather than circles.
  for (let i = 0; i < leafCount; i++) {
    const angle = (Math.PI * 2 / leafCount) * i + (withered ? 0.15 : 0)
    const len = 18 + stageScale * 10 + (withered ? -2 : 0)
    const spread = withered ? 0.55 : 0.85
    const x1 = cx + Math.cos(angle) * 3
    const y1 = cy + Math.sin(angle) * 3
    const x2 = cx + Math.cos(angle) * len
    const y2 = cy + Math.sin(angle) * len
    const ctrlX = cx + Math.cos(angle + Math.PI / 2) * len * spread
    const ctrlY = cy + Math.sin(angle + Math.PI / 2) * len * spread

    ctx.fillStyle = _hexToCss((withered ? leaf.clone().lerp(new THREE.Color(0x3f2f20), 0.35) : leaf).getHex())
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2)
    ctx.quadraticCurveTo((cx + x2) / 2, (cy + y2) / 2, x1, y1)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = bark
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, cy + 12)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // Fruit / flower cluster for larger stages to make the crop read as a real plant.
  if (!withered && clampedStage >= Math.max(1, maxStage - 1)) {
    const berryCount = Math.max(3, Math.min(8, 2 + clampedStage))
    for (let i = 0; i < berryCount; i++) {
      const a = (Math.PI * 2 / berryCount) * i + 0.5
      const r = 10 + stageScale * 6
      const bx = cx + Math.cos(a) * r
      const by = cy + Math.sin(a) * r - 5
      ctx.fillStyle = _hexToCss(fruit.getHex())
      ctx.beginPath()
      ctx.arc(bx, by, 4 + (clampedStage >= maxStage ? 1 : 0), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const tex = _markSharedAsset(new THREE.CanvasTexture(canvas))
  tex.needsUpdate = true
  tex.transparent = true
  cropSpriteTextureCache.set(cacheKey, tex)
  return tex
}

function _getCropSpriteMaterial (cropType, stage, withered = false) {
  const def = CROP_DEFINITIONS[cropType]
  const maxStage = def ? def.stages - 1 : 0
  const clampedStage = Math.max(0, Math.min(stage, maxStage))
  const cacheKey = cropType + ':' + clampedStage + ':' + (withered ? 'w' : 'n')
  let material = cropSpriteMaterialCache.get(cacheKey)
  if (!material) {
    material = _markSharedAsset(new THREE.SpriteMaterial({
      map: _makeCropSpriteTexture(cropType, clampedStage, withered),
      transparent: true,
      depthWrite: false,
      alphaTest: 0.1
    }))
    cropSpriteMaterialCache.set(cacheKey, material)
  }
  return material
}

function _makeCropSprite (cropType, stage, withered = false) {
  const sprite = new THREE.Sprite(_getCropSpriteMaterial(cropType, stage, withered))
  const def = CROP_DEFINITIONS[cropType]
  const maxStage = def ? def.stages - 1 : 0
  const clampedStage = Math.max(0, Math.min(stage, maxStage))
  const baseSize = withered ? 0.82 : 0.86
  const size = baseSize + clampedStage * 0.09
  sprite.scale.set(size, size, 1)
  sprite.position.y = withered ? 0.16 : 0.22 + clampedStage * 0.02
  sprite.userData.isCropSprite = true
  return sprite
}

/**
 * Create a 3D growth-stage mesh for a crop (works well from top-down orthographic view).
 * @param {string} cropType - key in CROP_DEFINITIONS
 * @param {number} stage - growth stage index (0 = seed, last = mature)
 * @returns {THREE.Group}
 */
export function createCropMesh (cropType, stage) {
  const def = CROP_DEFINITIONS[cropType]
  if (!def) return new THREE.Group()

  const clampedStage = Math.min(stage, def.stages - 1)
  const color = def.colors[clampedStage]
  const maxStage = def.stages - 1
  const isReady = clampedStage >= maxStage
  const group = new THREE.Group()
  group.userData.stemMeshes = []
  group.userData.glowRingMeshes = []

  const geomIdx = Math.min(clampedStage, 4)
  const [cylR, cylH, sphR] = STAGE_GEOM[geomIdx]

  // Stem cylinder provides the 3D read and still sways in the wind animation.
  const stemColor = clampedStage <= 2 ? 0x228b22 : new THREE.Color(color).lerp(new THREE.Color(0x228b22), 0.3).getHex()
  const stemGeo = _getCropStemGeometry(cylR * 0.5, cylR * 0.7, Math.max(0.12, cylH), 7)
  const stemMat = _getCropStemMaterial(stemColor, 0.85)
  const stem = new THREE.Mesh(stemGeo, stemMat)
  stem.position.y = Math.max(0.08, cylH / 2 + 0.02)
  stem.castShadow = true
  stem.userData.isStem = true
  stem.userData.stemHeight = cylH
  group.add(stem)
  group.userData.stemMeshes.push(stem)

  // Sprite-backed canopy/plant silhouette so crops read like planted assets instead of circles.
  const sprite = _makeCropSprite(cropType, clampedStage, false)
  sprite.position.y = cylH + 0.12
  group.add(sprite)

  // Seed stage gets a tiny extra sprout so it doesn't read as a debug dot.
  if (clampedStage === 0) {
    const sprout = new THREE.Mesh(sproutGeometry, sproutMaterial)
    sprout.position.y = 0.08
    sprout.rotation.z = 0.25
    sprout.castShadow = true
    group.add(sprout)
  }

  // Glow ring for ready/mature crops (pulsing handled in app.js animate loop via userData)
  if (isReady) {
    const ring = new THREE.Mesh(GLOW_RING_GEOMETRY, GLOW_RING_MATERIAL_NORMAL)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.04
    ring.userData.isGlowRing = true
    group.add(ring)
    group.userData.glowRingMeshes.push(ring)
  }

  // Progress arc for growing (non-seed, non-mature) crops
  if (clampedStage > 0 && !isReady) {
    const arcGeo = _getProgressArcGeometry(clampedStage, maxStage)
    if (arcGeo) {
      const arc = new THREE.Mesh(arcGeo, PROGRESS_ARC_MATERIAL)
      arc.rotation.x = -Math.PI / 2
      arc.position.y = 0.04
      arc.userData.isProgressArc = true
      group.add(arc)
    }
  }

  group.userData.cropType = cropType
  group.userData.stage = clampedStage
  group.userData.isReady = isReady
  return group
}

/**
 * Create a withered version of a crop mesh (gray circle)
 */
export function createWitheredMesh (cropType) {
  const def = CROP_DEFINITIONS[cropType]
  if (!def) return new THREE.Group()

  const group = new THREE.Group()

  const stem = new THREE.Mesh(witheredStemGeometry, witheredStemMaterial)
  stem.position.y = 0.12
  stem.rotation.z = -0.1
  stem.castShadow = true
  group.add(stem)

  const sprite = _makeCropSprite(cropType, Math.max(0, def.stages - 1), true)
  sprite.position.y = 0.18
  sprite.scale.multiplyScalar(0.95)
  group.add(sprite)

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

/**
 * Animate a harvest pop: scale 1.0 → 1.4 → 0 over 400ms with brief upward Y translation.
 * Calls onComplete() when done so the caller can remove the mesh from the scene.
 * @param {THREE.Object3D} mesh
 * @param {THREE.Scene} scene
 * @param {function} onComplete
 */
export function animateHarvestPop (mesh, scene, onComplete) {
  const startTime = performance.now()
  const duration = 400
  const baseY = mesh.position.y

  function animate () {
    const elapsed = performance.now() - startTime
    const t = Math.min(elapsed / duration, 1)

    let scale, yOffset
    if (t < 0.4) {
      // Scale up phase: 1.0 → 1.4, Y 0 → 0.3
      const p = t / 0.4
      scale = 1.0 + 0.4 * p
      yOffset = 0.3 * p
    } else {
      // Scale down phase: 1.4 → 0
      const p = (t - 0.4) / 0.6
      scale = 1.4 * (1 - p)
      yOffset = 0.3
    }

    mesh.scale.set(scale, scale, scale)
    mesh.position.y = baseY + yOffset

    if (t < 1) {
      requestAnimationFrame(animate)
    } else {
      onComplete()
    }
  }

  requestAnimationFrame(animate)
}

/**
 * Swap a ready crop's glow-ring material between the shared normal/warn
 * references. No per-mesh color mutation — both materials are shared, so
 * changing `ring.material` is a pointer swap rather than a color write.
 * @param {THREE.Group} group - crop mesh returned by createCropMesh
 * @param {boolean} warn - true to show orange wither warning, false for normal yellow
 */
export function setCropWitherWarn (group, warn) {
  if (!group || !group.userData) return
  let rings = group.userData.glowRingMeshes
  if (!Array.isArray(rings) || rings.length === 0) {
    // Defensive fallback: any crop constructed before the glowRingMeshes
    // cache (e.g. stale persisted state) is still warned correctly.
    rings = []
    group.traverse(child => {
      if (child && child.userData && child.userData.isGlowRing) rings.push(child)
    })
    if (rings.length === 0) return
  }
  const target = warn ? GLOW_RING_MATERIAL_WARN : GLOW_RING_MATERIAL_NORMAL
  for (const ring of rings) {
    if (ring) ring.material = target
  }
}

/**
 * Set the shared glow-ring opacity for every ready crop in one call.
 * The two shared materials (normal/warn) are mutated once each per frame
 * instead of once per ring — O(1) instead of O(ready crop count).
 * @param {number} opacity - 0..1
 */
export function setReadyGlowOpacity (opacity) {
  const value = opacity < 0 ? 0 : opacity > 1 ? 1 : opacity
  GLOW_RING_MATERIAL_NORMAL.opacity = value
  GLOW_RING_MATERIAL_WARN.opacity = value
}

window.CropSystem = { CROP_DEFINITIONS, createCropMesh, createWitheredMesh, updateCropGrowth, animateHarvestPop, setCropWitherWarn, setReadyGlowOpacity }
