// App initialization, game loop, and screen transitions

let farmState = null
let gameCanvas = null
let gameCtx = null
let gameLoopId = null
let tickIntervalId = null

function startGame (playerName) {
  farmState = new FarmState(playerName)

  // Switch screens
  document.getElementById('setup').style.display = 'none'
  document.getElementById('game').style.display = 'flex'

  // Set up canvas
  gameCanvas = document.getElementById('farm-canvas')
  gameCtx = gameCanvas.getContext('2d')
  resizeCanvas()

  // Display player info
  document.getElementById('player-name-display').textContent = playerName
  updateCoinDisplay(farmState)

  // Init farm interaction (click handlers, seed selector)
  initFarmInteraction(gameCanvas, gameCtx, farmState)

  // Start game loop
  gameLoopId = requestAnimationFrame(gameLoop)

  // Start tick interval (update crop growth every second)
  tickIntervalId = setInterval(() => {
    if (farmState) farmState.tick()
  }, 1000)
}

function gameLoop () {
  if (!farmState || !gameCtx) return
  renderFarm(gameCtx, farmState, hoverTile, selectedTool)
  gameLoopId = requestAnimationFrame(gameLoop)
}

function resizeCanvas () {
  if (!gameCanvas) return
  gameCanvas.width = gameCanvas.clientWidth
  gameCanvas.height = gameCanvas.clientHeight
}

// Setup screen handlers
document.getElementById('create-farm').addEventListener('click', () => {
  const name = document.getElementById('farm-name').value.trim() || 'My Farm'
  startGame(name)
})

document.getElementById('join-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const name = document.getElementById('farm-name').value.trim() || 'Visitor'
  const topic = document.getElementById('join-topic').value.trim()
  if (!topic) return
  // For now, just start in local mode - networking will be added in M3
  startGame(name)
})

// Handle window resize
window.addEventListener('resize', resizeCanvas)

// Pear hot reload support
if (typeof Pear !== 'undefined') {
  Pear.updates(() => Pear.reload())
}
