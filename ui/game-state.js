class FarmState {
  constructor (playerName, gridSize = { cols: GRID_COLS, rows: GRID_ROWS }) {
    this.playerName = playerName
    this.createdAt = Date.now()
    this.coins = STARTING_COINS
    this.gridCols = gridSize.cols
    this.gridRows = gridSize.rows
    this.plots = []
    for (let r = 0; r < gridSize.rows; r++) {
      this.plots[r] = []
      for (let c = 0; c < gridSize.cols; c++) {
        this.plots[r][c] = { crop: null, stage: 0, watered: false, plantedAt: null }
      }
    }
    this.inventory = {}
  }

  plant (row, col, cropType) {
    const crop = CROPS[cropType]
    if (!crop) return { ok: false, error: 'Unknown crop type' }
    if (this.coins < crop.seedCost) return { ok: false, error: 'Not enough coins' }
    if (this.plots[row][col].crop) return { ok: false, error: 'Plot already occupied' }

    this.coins -= crop.seedCost
    this.plots[row][col] = {
      crop: cropType,
      stage: 0,
      watered: false,
      plantedAt: Date.now()
    }
    return { ok: true, coins: this.coins }
  }

  water (row, col) {
    const plot = this.plots[row][col]
    if (!plot.crop) return { ok: false, error: 'Nothing planted here' }
    if (plot.watered) return { ok: false, error: 'Already watered' }

    plot.watered = true
    return { ok: true }
  }

  harvest (row, col) {
    const plot = this.plots[row][col]
    if (!plot.crop) return { ok: false, error: 'Nothing planted here' }
    const crop = CROPS[plot.crop]
    if (plot.stage < crop.stages - 1) return { ok: false, error: 'Not ready yet' }

    const value = crop.sellPrice
    this.coins += value
    this.inventory[plot.crop] = (this.inventory[plot.crop] || 0) + 1
    this.plots[row][col] = { crop: null, stage: 0, watered: false, plantedAt: null }
    return { ok: true, coins: this.coins, item: plot.crop }
  }

  remove (row, col) {
    const plot = this.plots[row][col]
    if (!plot.crop) return { ok: false, error: 'Nothing to remove' }
    this.plots[row][col] = { crop: null, stage: 0, watered: false, plantedAt: null }
    return { ok: true }
  }

  tick () {
    const now = Date.now()
    let changed = false
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const plot = this.plots[r][c]
        if (!plot.crop) continue
        const crop = CROPS[plot.crop]
        if (!crop) continue

        const elapsed = now - plot.plantedAt
        const waterMultiplier = plot.watered ? 1 : 0.5
        const effectiveElapsed = elapsed * waterMultiplier
        const stageDuration = crop.growTime / crop.stages
        const newStage = Math.min(crop.stages - 1, Math.floor(effectiveElapsed / stageDuration))

        if (newStage !== plot.stage) {
          plot.stage = newStage
          changed = true
        }
      }
    }
    return changed
  }

  serialize () {
    return JSON.stringify({
      playerName: this.playerName,
      createdAt: this.createdAt,
      coins: this.coins,
      gridCols: this.gridCols,
      gridRows: this.gridRows,
      plots: this.plots,
      inventory: this.inventory
    })
  }

  static deserialize (json) {
    const data = JSON.parse(json)
    const farm = new FarmState(data.playerName, { cols: data.gridCols, rows: data.gridRows })
    farm.createdAt = data.createdAt
    farm.coins = data.coins
    farm.plots = data.plots
    farm.inventory = data.inventory || {}
    return farm
  }
}
