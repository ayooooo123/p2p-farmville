module.exports = {
  FARM_WIDTH: 80,
  FARM_DEPTH: 80,
  PLOT_SIZE: 2,
  GRID_COLS: 20,
  GRID_ROWS: 20,
  STARTING_COINS: 500,
  STARTING_ENERGY: 30,
  MAX_ENERGY: 30,
  ENERGY_REGEN_TIME: 300000, // 5 minutes per energy point
  STARTING_XP: 0,
  XP_PER_LEVEL: 100,
  WORLD_TOPIC: 'p2p-farmville-world-v1',
  PLAYER_SPEED: 15,
  CAMERA_OFFSET: { x: 0, y: 20, z: 25 },
  CAMERA_LOOK_AHEAD: 5,

  // Phase 2: Farm economy
  PLOW_COST: 15,
  PLOW_XP: 1,
  ENERGY_COST_PLOW: 1,
  ENERGY_COST_PLANT: 1,
  ENERGY_COST_WATER: 1,
  ENERGY_COST_HARVEST: 1,
  ENERGY_COST_REMOVE: 1,
  WATER_MULTIPLIER: 2,
  WITHER_MULTIPLIER: 2, // crops wither after 2x growTime past maturity

  // Level thresholds: XP needed to reach each level
  // Level N requires LEVEL_THRESHOLDS[N] total XP
  LEVEL_THRESHOLDS: [
    0,      // Level 0 (unused)
    0,      // Level 1 (start)
    100,    // Level 2
    250,    // Level 3
    500,    // Level 4
    850,    // Level 5
    1300,   // Level 6
    1850,   // Level 7
    2500,   // Level 8
    3300,   // Level 9
    4200,   // Level 10
    5200,   // Level 11
    6400,   // Level 12
    7800,   // Level 13
    9400,   // Level 14
    11200,  // Level 15
    13200,  // Level 16
    15500,  // Level 17
    18000,  // Level 18
    20800,  // Level 19
    23900,  // Level 20
    27300,  // Level 21
    31000,  // Level 22
    35000,  // Level 23
    39500,  // Level 24
    44500,  // Level 25
    50000,  // Level 26
    56000,  // Level 27
    62500,  // Level 28
    69500,  // Level 29
    77000,  // Level 30
    85000,  // Level 31
    93500,  // Level 32
    102500, // Level 33
    112000, // Level 34
    122000, // Level 35
    132500, // Level 36
    143500, // Level 37
    155000, // Level 38
    167000, // Level 39
    180000, // Level 40
    194000, // Level 41
    209000, // Level 42
    225000, // Level 43
    242000, // Level 44
    260000, // Level 45
    279000, // Level 46
    299000, // Level 47
    320000, // Level 48
    342000, // Level 49
    365000  // Level 50
  ]
}
