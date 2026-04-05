// Isometric canvas renderer with visual polish

const GRID_OFFSET_X = 512
const GRID_OFFSET_Y = 80

// Particle system for harvest effects
const particles = []

function spawnHarvestParticles (x, y, coinValue) {
  const count = Math.min(6, Math.max(3, Math.floor(coinValue / 15)))
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(1.5 + Math.random() * 2),
      life: 60 + Math.floor(Math.random() * 20),
      text: '+$',
      color: '#FFD700'
    })
  }
}

function updateParticles () {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.02
    p.life--
    if (p.life <= 0) particles.splice(i, 1)
  }
}

function drawParticles (ctx) {
  for (const p of particles) {
    const alpha = Math.min(1, p.life / 30)
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(p.text, p.x, p.y)

    // Small coin circle
    ctx.beginPath()
    ctx.arc(p.x + 12, p.y - 4, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#FFC107'
    ctx.fill()
    ctx.strokeStyle = '#B8860B'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#B8860B'
    ctx.font = 'bold 7px sans-serif'
    ctx.fillText('$', p.x + 12, p.y - 1.5)
  }
  ctx.globalAlpha = 1
}

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

function getTileDepthShade (col, row, maxCols, maxRows) {
  // Darker at edges, lighter in center
  const edgeDist = Math.min(col, row, maxCols - 1 - col, maxRows - 1 - row)
  const maxDist = Math.min(Math.floor(maxCols / 2), Math.floor(maxRows / 2))
  const t = Math.min(1, edgeDist / maxDist)
  return Math.floor(t * 20)
}

function drawTile (ctx, col, row, plot, isHover, selectedTool, maxCols, maxRows) {
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

  // Tile fill with depth-based shading
  const shade = getTileDepthShade(col, row, maxCols, maxRows)
  let baseR, baseG, baseB
  if (plot.crop && plot.watered) {
    baseR = 58; baseG = 122; baseB = 74
  } else if (plot.crop) {
    baseR = 74; baseG = 139; baseB = 58
  } else {
    baseR = 90; baseG = 155; baseB = 74
  }
  const r = Math.max(0, baseR - (20 - shade))
  const g = Math.max(0, baseG - (20 - shade))
  const b = Math.max(0, baseB - (10 - Math.floor(shade / 2)))
  ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')'
  ctx.fill()

  // Tile border
  ctx.strokeStyle = isHover ? '#FFD700' : 'rgba(40, 80, 30, 0.6)'
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
    drawProgressBar(ctx, x, y, plot)
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
    ctx.strokeStyle = '#228B22'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - 4)
    ctx.stroke()
    ctx.fillStyle = '#228B22'
    ctx.beginPath()
    ctx.ellipse(x + 5, y - 6, 4, 2, 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawProgressBar (ctx, x, y, plot) {
  const crop = CROPS[plot.crop]
  if (!crop) return

  // Don't show bar if fully grown
  if (plot.stage >= crop.stages - 1) return

  const now = Date.now()
  const elapsed = now - plot.plantedAt
  const waterMultiplier = plot.watered ? 1 : 0.5
  const effectiveElapsed = elapsed * waterMultiplier
  const progress = Math.min(1, effectiveElapsed / crop.growTime)

  const barWidth = 20
  const barHeight = 3
  const bx = x - barWidth / 2
  const by = y + TILE_HEIGHT / 4 + 1

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.fillRect(bx, by, barWidth, barHeight)

  // Fill
  const green = Math.floor(100 + progress * 155)
  ctx.fillStyle = 'rgb(50,' + green + ',50)'
  ctx.fillRect(bx, by, barWidth * progress, barHeight)

  // Border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.lineWidth = 0.5
  ctx.strokeRect(bx, by, barWidth, barHeight)
}

function drawFarmBanner (ctx, farmState, canvasWidth) {
  const name = farmState.playerName + "'s Farm"
  ctx.save()
  ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'

  const textWidth = ctx.measureText(name).width
  const bannerW = textWidth + 40
  const bannerH = 30
  const bx = canvasWidth / 2 - bannerW / 2
  const by = 8

  // Banner background
  ctx.fillStyle = 'rgba(26, 58, 14, 0.85)'
  ctx.beginPath()
  ctx.roundRect(bx, by, bannerW, bannerH, 6)
  ctx.fill()
  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Banner text
  ctx.fillStyle = '#FFD700'
  ctx.fillText(name, canvasWidth / 2, by + 21)
  ctx.restore()
}

function renderFarm (ctx, farmState, hoverTile, selectedTool) {
  const canvas = ctx.canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Farm name banner
  drawFarmBanner(ctx, farmState, canvas.width)

  // Update and draw particles
  updateParticles()

  // Draw grid
  for (let r = 0; r < farmState.gridRows; r++) {
    for (let c = 0; c < farmState.gridCols; c++) {
      const plot = farmState.plots[r][c]
      const isHover = hoverTile && hoverTile.row === r && hoverTile.col === c
      drawTile(ctx, c, r, plot, isHover, selectedTool, farmState.gridCols, farmState.gridRows)
    }
  }

  // Draw particles on top
  drawParticles(ctx)

  // Draw hover tooltip
  if (hoverTile && hoverTile.row >= 0 && hoverTile.row < farmState.gridRows &&
      hoverTile.col >= 0 && hoverTile.col < farmState.gridCols) {
    const plot = farmState.plots[hoverTile.row][hoverTile.col]
    if (plot.crop) {
      const crop = CROPS[plot.crop]
      const { x, y } = toIso(hoverTile.col, hoverTile.row)
      const label = crop.name + ' (stage ' + (plot.stage + 1) + '/' + crop.stages + ')' + (plot.watered ? ' [watered]' : '')
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(x - 60, y - 35, 120, 18)
      ctx.fillStyle = '#fff'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, x, y - 22)
    }
  }
}
