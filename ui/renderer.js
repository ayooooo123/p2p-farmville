// Isometric canvas renderer

const GRID_OFFSET_X = 512
const GRID_OFFSET_Y = 60

function toIso (col, row) {
  const x = (col - row) * (TILE_WIDTH / 2) + GRID_OFFSET_X
  const y = (col + row) * (TILE_HEIGHT / 2) + GRID_OFFSET_Y
  return { x, y }
}

function fromIso (screenX, screenY) {
  const sx = screenX - GRID_OFFSET_X
  const sy = screenY - GRID_OFFSET_Y
  const col = Math.floor((sx / (TILE_WIDTH / 2) + sy / (TILE_HEIGHT / 2)) / 2)
  const row = Math.floor((sy / (TILE_HEIGHT / 2) - sx / (TILE_WIDTH / 2)) / 2)
  return { col, row }
}

function drawTile (ctx, col, row, plot, isHover, selectedTool) {
  const { x, y } = toIso(col, row)
  const hw = TILE_WIDTH / 2
  const hh = TILE_HEIGHT / 2

  // Draw diamond tile
  ctx.beginPath()
  ctx.moveTo(x, y - hh)
  ctx.lineTo(x + hw, y)
  ctx.lineTo(x, y + hh)
  ctx.lineTo(x - hw, y)
  ctx.closePath()

  // Tile fill
  if (plot.crop && plot.watered) {
    ctx.fillStyle = '#3a7a4a'
  } else if (plot.crop) {
    ctx.fillStyle = '#4a8b3a'
  } else {
    ctx.fillStyle = '#5a9b4a'
  }
  ctx.fill()

  // Tile border
  ctx.strokeStyle = isHover ? '#FFD700' : '#3a6b2a'
  ctx.lineWidth = isHover ? 2 : 1
  ctx.stroke()

  // Draw watered overlay
  if (plot.watered && plot.crop) {
    ctx.fillStyle = 'rgba(100, 149, 237, 0.15)'
    ctx.beginPath()
    ctx.moveTo(x, y - hh)
    ctx.lineTo(x + hw, y)
    ctx.lineTo(x, y + hh)
    ctx.lineTo(x - hw, y)
    ctx.closePath()
    ctx.fill()
  }

  // Draw crop if present
  if (plot.crop) {
    drawCrop(ctx, x, y, plot.crop, plot.stage)
  }
}

function drawCrop (ctx, x, y, cropType, stage) {
  const crop = CROPS[cropType]
  if (!crop) return

  const color = crop.colors[stage] || crop.colors[crop.colors.length - 1]

  ctx.fillStyle = color

  if (stage === 0) {
    // Seed - small dot
    ctx.beginPath()
    ctx.arc(x, y - 2, 3, 0, Math.PI * 2)
    ctx.fill()
  } else if (stage === 1) {
    // Sprout - small triangle
    ctx.beginPath()
    ctx.moveTo(x, y - 10)
    ctx.lineTo(x - 4, y)
    ctx.lineTo(x + 4, y)
    ctx.closePath()
    ctx.fill()
    // Stem
    ctx.strokeStyle = '#228B22'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - 6)
    ctx.stroke()
  } else if (stage === 2) {
    // Medium plant
    ctx.beginPath()
    ctx.moveTo(x, y - 14)
    ctx.lineTo(x - 6, y - 2)
    ctx.lineTo(x + 6, y - 2)
    ctx.closePath()
    ctx.fill()
    // Stem
    ctx.strokeStyle = '#228B22'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - 8)
    ctx.stroke()
  } else {
    // Full crop - large shape with crop color
    const size = stage >= 4 ? 10 : 8
    ctx.beginPath()
    ctx.arc(x, y - size - 2, size, 0, Math.PI * 2)
    ctx.fill()
    // Stem
    ctx.strokeStyle = '#228B22'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - 4)
    ctx.stroke()
    // Leaf
    ctx.fillStyle = '#228B22'
    ctx.beginPath()
    ctx.ellipse(x + 5, y - 6, 4, 2, 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function renderFarm (ctx, farmState, hoverTile, selectedTool) {
  const canvas = ctx.canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw grid
  for (let r = 0; r < farmState.gridRows; r++) {
    for (let c = 0; c < farmState.gridCols; c++) {
      const plot = farmState.plots[r][c]
      const isHover = hoverTile && hoverTile.row === r && hoverTile.col === c
      drawTile(ctx, c, r, plot, isHover, selectedTool)
    }
  }

  // Draw hover tooltip
  if (hoverTile && hoverTile.row >= 0 && hoverTile.row < farmState.gridRows &&
      hoverTile.col >= 0 && hoverTile.col < farmState.gridCols) {
    const plot = farmState.plots[hoverTile.row][hoverTile.col]
    if (plot.crop) {
      const crop = CROPS[plot.crop]
      const { x, y } = toIso(hoverTile.col, hoverTile.row)
      const label = `${crop.name} (stage ${plot.stage + 1}/${crop.stages})${plot.watered ? ' [watered]' : ''}`
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(x - 60, y - 35, 120, 18)
      ctx.fillStyle = '#fff'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, x, y - 22)
    }
  }
}
