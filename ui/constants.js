// Grid configuration
const GRID_COLS = 12
const GRID_ROWS = 10
const TILE_WIDTH = 64
const TILE_HEIGHT = 32

// Isometric projection
const ISO_TILE_W = TILE_WIDTH
const ISO_TILE_H = TILE_HEIGHT / 2

// Crop definitions
const CROPS = {
  wheat: {
    name: 'Wheat',
    seedCost: 5,
    sellPrice: 15,
    growTime: 30000,
    waterNeed: 1,
    stages: 4,
    colors: ['#8B7355', '#DAA520', '#F4A460', '#FFD700']
  },
  corn: {
    name: 'Corn',
    seedCost: 10,
    sellPrice: 30,
    growTime: 60000,
    waterNeed: 2,
    stages: 4,
    colors: ['#2E8B57', '#3CB371', '#66CDAA', '#FFD700']
  },
  tomato: {
    name: 'Tomato',
    seedCost: 15,
    sellPrice: 45,
    growTime: 90000,
    waterNeed: 2,
    stages: 4,
    colors: ['#228B22', '#32CD32', '#FF6347', '#FF4500']
  },
  strawberry: {
    name: 'Strawberry',
    seedCost: 25,
    sellPrice: 75,
    growTime: 120000,
    waterNeed: 3,
    stages: 4,
    colors: ['#006400', '#228B22', '#FF69B4', '#DC143C']
  },
  pumpkin: {
    name: 'Pumpkin',
    seedCost: 40,
    sellPrice: 120,
    growTime: 180000,
    waterNeed: 3,
    stages: 5,
    colors: ['#006400', '#228B22', '#32CD32', '#FF8C00', '#FF6600']
  }
}

// Starting coins
const STARTING_COINS = 100

// Protomux channel names
const CHANNELS = {
  FARM_SYNC: 'farm-sync',
  CHAT: 'chat',
  TRADE: 'trade',
  VISIT: 'visit'
}
