// Farm interaction - canvas click handling, seed selector, tool switching

let selectedTool = 'plant'
let selectedSeed = 'wheat'
let hoverTile = null

function initFarmInteraction (canvas, ctx, farmState) {
  // Populate seed selector
  populateSeedSelector()

  // Tool buttons
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedTool = btn.dataset.tool
    })
  })

  // Canvas mouse move - track hover tile
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const screenX = (e.clientX - rect.left) * scaleX
    const screenY = (e.clientY - rect.top) * scaleY
    const { col, row } = fromIso(screenX, screenY)

    if (row >= 0 && row < farmState.gridRows && col >= 0 && col < farmState.gridCols) {
      hoverTile = { row, col }
    } else {
      hoverTile = null
    }
  })

  canvas.addEventListener('mouseleave', () => {
    hoverTile = null
  })

  // Canvas click - perform action
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const screenX = (e.clientX - rect.left) * scaleX
    const screenY = (e.clientY - rect.top) * scaleY
    const { col, row } = fromIso(screenX, screenY)

    if (row < 0 || row >= farmState.gridRows || col < 0 || col >= farmState.gridCols) return

    // Visitors can only water, and do so via the network
    if (isVisitor) {
      if (selectedTool === 'water' && network) {
        network.sendFarmAction('water', row, col)
      }
      return
    }

    let result
    switch (selectedTool) {
      case 'plant':
        result = farmState.plant(row, col, selectedSeed)
        break
      case 'water':
        result = farmState.water(row, col)
        break
      case 'harvest': {
        const plot = farmState.plots[row][col]
        const cropDef = plot.crop ? CROPS[plot.crop] : null
        result = farmState.harvest(row, col)
        if (result && result.ok && cropDef) {
          const pos = toIso(col, row)
          spawnHarvestParticles(pos.x, pos.y, cropDef.sellPrice)
        }
        break
      }
      case 'remove':
        result = farmState.remove(row, col)
        break
    }

    if (result && !result.ok) return

    updateCoinDisplay(farmState)
    saveFarm()
  })
}

function populateSeedSelector () {
  const container = document.getElementById('seed-selector')
  container.innerHTML = ''
  for (const [key, crop] of Object.entries(CROPS)) {
    const btn = document.createElement('button')
    btn.className = 'seed-btn' + (key === selectedSeed ? ' active' : '')
    btn.textContent = `${crop.name} ($${crop.seedCost})`
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seed-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedSeed = key
    })
    container.appendChild(btn)
  }
}

function updateCoinDisplay (farmState) {
  document.getElementById('coin-display').textContent = farmState.coins + ' coins'
}
