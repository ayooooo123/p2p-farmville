# P2P Farmville - Implementation Plan

> **For Hermes:** Use Claude Code to implement this plan task-by-task. Create GitHub issues for each task/milestone, commit after each task.

**Goal:** Build a peer-to-peer Farmville-style game as a Pear/Bare desktop app. Players grow crops, visit neighbors' farms, trade items, and chat -- all with zero centralized infrastructure.

**Architecture:** Single Pear desktop app using Hyperswarm for peer discovery, Hypercore for persistent farm state, and HTML5 Canvas for isometric farm rendering. Each player runs their own "server" - their farm is a Hypercore that others can replicate when visiting. No central servers, no database, no hosting costs.

**Tech Stack:** Pear Runtime, Bare, Hyperswarm, Hypercore, Corestore, Protomux, b4a, hypercore-crypto, HTML5 Canvas (isometric), vanilla JS (no frameworks)

---

## Project Structure

```
p2p-farmville/
├── package.json
├── index.js                    # Main process (Bare runtime)
├── ui/
│   ├── index.html              # GUI entrypoint
│   ├── app.js                  # Frontend logic + game loop
│   ├── styles.css              # Isometric farm styling
│   ├── farm.js                 # Farm grid + crop logic
│   ├── renderer.js             # Isometric canvas renderer
│   ├── player.js               # Player state management
│   ├── networking.js           # Hyperswarm + Protomux networking
│   ├── chat.js                 # P2P chat UI + logic
│   ├── trading.js              # Item trading system
│   └── assets/
│       └── sprites/            # Crop/building sprites (canvas-drawn or PNGs)
├── lib/
│   ├── core.js                 # Corestore + Hypercore setup
│   ├── protocol.js             # Protomux channel protocol
│   ├── game-state.js           # Farm state serialization/deserialization
│   └── constants.js            # Crop definitions, timing, recipes
└── test/
    └── index.test.js
```

---

## Milestone 1: Project Scaffold + Basic Window

### Task 1: Create GitHub repo and scaffold Pear project

**Objective:** Set up the repo, install Pear, and create the base project structure.

**Files:**
- Create: `package.json`
- Create: `index.js`
- Create: `ui/index.html`
- Create: `ui/app.js`
- Create: `ui/styles.css`
- Create: `.gitignore`

**Step 1: Create repo on GitHub**

```bash
mkdir -p ~/p2p-farmville && cd ~/p2p-farmville
git init
```

Create the GitHub repo:
```bash
gh repo create p2p-farmville --public --description "Peer-to-peer Farmville game built on Pear/Bare" --source . --push
```

**Step 2: Create package.json**

```json
{
  "name": "p2p-farmville",
  "main": "index.html",
  "pear": {
    "gui": {
      "width": 1024,
      "height": 768,
      "resizable": true
    },
    "stage": {
      "ignore": [
        "node_modules",
        ".git",
        "docs",
        "test"
      ]
    }
  }
}
```

**Step 3: Create index.js (main process)**

```javascript
// Main process entry - Bare runtime
// The Pear GUI will load index.html automatically
console.log('P2P Farmville starting...')
```

**Step 4: Create ui/index.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>P2P Farmville</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <div id="setup">
      <h1>P2P Farmville</h1>
      <div id="farm-name-section">
        <input id="farm-name" type="text" placeholder="Farm Name" maxlength="20">
      </div>
      <div id="connection-section">
        <button id="create-farm">Create Farm</button>
        <div class="separator">or</div>
        <form id="join-form">
          <input id="join-topic" type="text" placeholder="Farm Topic Key (hex)" required>
          <button type="submit">Visit Farm</button>
        </form>
      </div>
    </div>
    <div id="game" style="display:none">
      <div id="toolbar">
        <div id="farm-info">
          <span id="player-name-display"></span>
          <span id="coin-display">0 coins</span>
          <span id="topic-display"></span>
        </div>
        <div id="tools">
          <button class="tool-btn active" data-tool="plant">Plant</button>
          <button class="tool-btn" data-tool="water">Water</button>
          <button class="tool-btn" data-tool="harvest">Harvest</button>
          <button class="tool-btn" data-tool="remove">Remove</button>
        </div>
        <div id="seed-selector">
          <!-- Populated by JS -->
        </div>
      </div>
      <canvas id="farm-canvas" width="1024" height="600"></canvas>
      <div id="chat-panel">
        <div id="chat-messages"></div>
        <form id="chat-form">
          <input id="chat-input" type="text" placeholder="Say something...">
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
    <div id="loading" style="display:none">
      <p>Connecting to farm...</p>
    </div>
  </div>
  <script src="constants.js"></script>
  <script src="game-state.js"></script>
  <script src="renderer.js"></script>
  <script src="farm.js"></script>
  <script src="player.js"></script>
  <script src="protocol.js"></script>
  <script src="networking.js"></script>
  <script src="chat.js"></script>
  <script src="trading.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

**Step 5: Create ui/styles.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #2d5a1b;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #fff;
  overflow: hidden;
  user-select: none;
}

#setup {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
  -webkit-app-region: drag;
}

#setup input, #setup button, #setup form {
  -webkit-app-region: no-drag;
}

#setup h1 { font-size: 2.5rem; margin-bottom: 8px; }
#setup input { padding: 10px 16px; border-radius: 8px; border: none; font-size: 1rem; width: 280px; }
#setup button { padding: 10px 24px; border-radius: 8px; border: none; background: #4CAF50; color: #fff; font-size: 1rem; cursor: pointer; }
#setup button:hover { background: #45a049; }
.separator { color: #aaa; font-size: 0.9rem; }
#join-form { display: flex; gap: 8px; }
#join-form input { width: 240px; }
#join-form button { padding: 10px 16px; }

#game { display: flex; flex-direction: column; height: 100vh; }

#toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #1a3a0e;
  gap: 12px;
  -webkit-app-region: drag;
}

#farm-info { display: flex; gap: 16px; font-size: 0.85rem; -webkit-app-region: no-drag; }
#tools { display: flex; gap: 4px; -webkit-app-region: no-drag; }
.tool-btn {
  padding: 6px 12px;
  border: 2px solid transparent;
  border-radius: 6px;
  background: #3a6b2a;
  color: #fff;
  cursor: pointer;
  font-size: 0.8rem;
}
.tool-btn.active { border-color: #FFD700; background: #4a8b3a; }
#seed-selector { display: flex; gap: 4px; -webkit-app-region: no-drag; }
.seed-btn {
  padding: 4px 8px;
  border: 1px solid #5a9b4a;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 0.75rem;
}
.seed-btn.active { background: #5a9b4a; }

#farm-canvas {
  flex: 1;
  background: #4a8b3a;
  cursor: pointer;
}

#chat-panel {
  display: flex;
  height: 120px;
  background: #1a3a0e;
}
#chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  font-size: 0.8rem;
}
#chat-form { display: flex; }
#chat-input {
  flex: 1;
  padding: 8px;
  border: none;
  background: #2d5a1b;
  color: #fff;
  font-size: 0.8rem;
}
#chat-form button {
  padding: 8px 16px;
  border: none;
  background: #4CAF50;
  color: #fff;
  cursor: pointer;
}

#loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 1.2rem;
}
```

**Step 6: Create .gitignore**

```
node_modules/
storage/
.git/
```

**Step 7: Install dependencies and test**

```bash
npm install hyperswarm hypercore-crypto b4a corestore protomux
npm install --save-dev pear-interface brittle
```

```bash
pear run --dev .
```

Expected: Window opens with the green setup screen showing "P2P Farmville" title, farm name input, Create Farm and Visit Farm buttons.

**Step 8: Commit and push**

```bash
git add .
git commit -m "feat: scaffold Pear desktop project with setup UI"
git push -u origin main
```

---

## Milestone 2: Isometric Farm Grid + Rendering

### Task 2: Define game constants (crops, grid, timing)

**Objective:** Create the data definitions for all crop types, grid dimensions, and game balance constants.

**Files:**
- Create: `ui/constants.js`

**Step 1: Create ui/constants.js**

```javascript
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
    growTime: 30000,      // 30 seconds
    waterNeed: 1,
    stages: 4,
    colors: ['#8B7355', '#DAA520', '#F4A460', '#FFD700']
  },
  corn: {
    name: 'Corn',
    seedCost: 10,
    sellPrice: 30,
    growTime: 60000,      // 60 seconds
    waterNeed: 2,
    stages: 4,
    colors: ['#2E8B57', '#3CB371', '#66CDAA', '#FFD700']
  },
  tomato: {
    name: 'Tomato',
    seedCost: 15,
    sellPrice: 45,
    growTime: 90000,      // 90 seconds
    waterNeed: 2,
    stages: 4,
    colors: ['#228B22', '#32CD32', '#FF6347', '#FF4500']
  },
  strawberry: {
    name: 'Strawberry',
    seedCost: 25,
    sellPrice: 75,
    growTime: 120000,     // 2 minutes
    waterNeed: 3,
    stages: 4,
    colors: ['#006400', '#228B22', '#FF69B4', '#DC143C']
  },
  pumpkin: {
    name: 'Pumpkin',
    seedCost: 40,
    sellPrice: 120,
    growTime: 180000,     // 3 minutes
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
```

**Step 2: Commit**

```bash
git add ui/constants.js
git commit -m "feat: add game constants - crop definitions, grid config, channels"
```

---

### Task 3: Build farm state management

**Objective:** Create the farm grid state, serialization for Hypercore persistence, and crop lifecycle logic.

**Files:**
- Create: `ui/game-state.js`

**Step 1: Create ui/game-state.js**

Farm state is a plain object that gets serialized to JSON and appended to Hypercore for persistence and replication.

```javascript
class FarmState {
  constructor (playerName, gridSize = { cols: GRID_COLS, rows: GRID_ROWS }) {
    this.playerName = playerName
    this.createdAt = Date.now()
    this.coins = STARTING_COINS
    this.gridCols = gridSize.cols
    this.gridRows = gridSize.rows
    // 2D array of plot objects
    this.plots = []
    for (let r = 0; r < gridSize.rows; r++) {
      this.plots[r] = []
      for (let c = 0; c < gridSize.cols; c++) {
        this.plots[r][c] = { crop: null, stage: 0, watered: false, plantedAt: null }
      }
    }
    this.inventory = {}
  }

  // Plant a crop on a specific plot
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

  // Water a specific plot
  water (row, col) {
    const plot = this.plots[row][col]
    if (!plot.crop) return { ok: false, error: 'Nothing planted here' }
    if (plot.watered) return { ok: false, error: 'Already watered' }

    plot.watered = true
    return { ok: true }
  }

  // Harvest a mature crop
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

  // Remove a crop from a plot (no refund)
  remove (row, col) {
    const plot = this.plots[row][col]
    if (!plot.crop) return { ok: false, error: 'Nothing to remove' }
    this.plots[row][col] = { crop: null, stage: 0, watered: false, plantedAt: null }
    return { ok: true }
  }

  // Update crop growth stages based on time
  tick () {
    const now = Date.now()
    let changed = false
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const plot = this.plots[r][c]
        if (!plot.crop) continue
        const crop = CROPS[plot.crop]
        if (!crop) continue

        // Calculate expected stage
        const elapsed = now - plot.plantedAt
        const waterMultiplier = plot.watered ? 1 : 0.5  // watered grows 2x faster
        const effectiveElapsed = elapsed * waterMultiplier
        const stageDuration = crop.growTime / crop.stages
        const newStage = Math.min(crop.stages - 1, Math.floor(effectiveElapsed / stageDuration))

        if (newStage !== plot.stage) {
          plot.stage = newStage
          changed = true
        }

        // Reset watered flag each stage
        if (plot.watered && newStage < crop.stages - 1) {
          // Watered flag is consumed as growth bonus
        }
      }
    }
    return changed
  }

  // Serialize to JSON for Hypercore storage
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

  // Deserialize from JSON
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
```

**Step 2: Commit**

```bash
git add ui/game-state.js
git commit -m "feat: add FarmState class with plant/water/harvest/tick logic"
```

---

### Task 4: Build isometric canvas renderer

**Objective:** Render the farm grid as an isometric 2D canvas with clickable tiles and crop stage visuals.

**Files:**
- Create: `ui/renderer.js`

**Step 1: Create ui/renderer.js**

The renderer draws an isometric grid, overlays crop sprites at their growth stages, highlights the hovered tile, and translates mouse coordinates back to grid positions.

Key functions:
- `renderFarm(ctx, farmState, hoverTile, selectedTool)` - main render loop call
- `toIso(col, row)` - convert grid coords to screen (isometric)
- `fromIso(screenX, screenY)` - convert screen coords back to grid
- `drawTile(ctx, col, row, plot)` - draw a single tile with crop
- `drawCrop(ctx, col, row, cropType, stage)` - draw crop visual at stage

The isometric projection:
```
screenX = (col - row) * (TILE_WIDTH / 2) + offsetX
screenY = (col + row) * (TILE_HEIGHT / 2) + offsetY
```

Each crop stage is drawn as a colored shape:
- Stage 0: Small dot/seed
- Stage 1: Small sprout
- Stage 2: Medium plant
- Stage 3-4: Full crop with crop-specific color from CROPS definition

Use the `colors` array from each crop definition to color each stage.

Watered plots get a subtle blue tint overlay.

The hover tile gets a golden border highlight. The selected tool changes the cursor behavior on click.

**Step 2: Commit**

```bash
git add ui/renderer.js
git commit -m "feat: add isometric canvas renderer with crop stage visuals"
```

---

### Task 5: Wire up farm interaction (plant/water/harvest on click)

**Objective:** Connect the renderer's click events to FarmState operations and update the display in real-time.

**Files:**
- Create: `ui/farm.js`
- Modify: `ui/app.js`

**farm.js** should:
- Listen for canvas clicks, convert to grid coords
- Call the appropriate FarmState method based on selected tool
- Update coin display
- Trigger re-render
- Track selected seed type for planting
- Populate the seed selector buttons from CROPS

**app.js** should:
- Initialize the game loop (requestAnimationFrame for rendering, setInterval for state ticks)
- Handle setup screen -> game screen transition
- Show/hide UI panels
- Call `Pear.updates(() => Pear.reload())` for dev hot reload

**Step 3: Test locally**

```bash
pear run --dev .
```

Expected: You can see the isometric grid, click tiles to plant wheat (selected by default), watch crops grow through stages, water them, harvest for coins, and see the coin counter update.

**Step 4: Commit**

```bash
git add ui/farm.js ui/app.js
git commit -m "feat: wire up farm interaction - plant, water, harvest on click"
```

---

## Milestone 3: P2P Networking

### Task 6: Set up Corestore + Hypercore for farm persistence

**Objective:** Each player's farm state is stored in a local Hypercore, enabling persistence across restarts and replication to visitors.

**Files:**
- Create: `lib/core.js`

**Implementation:**

Use a single Corestore instance (recommended best practice). Create two named cores:
1. `farm-state` - append-only log of farm state snapshots (latest block = current state)
2. `chat-log` - append-only log of chat messages

```javascript
import path from 'bare-path'
import Corestore from 'corestore'
import b4a from 'b4a'

const store = new Corestore(path.join(Pear.config.storage, 'corestore'))

async function initCores () {
  // Farm state core - only the owner writes
  const farmCore = store.get({ name: 'farm-state' })
  await farmCore.ready()

  // Chat log core - all peers can append (via protomux)
  const chatCore = store.get({ name: 'chat-log' })
  await chatCore.ready()

  return { farmCore, chatCore, store }
}

// Load latest farm state from core
async function loadFarmState (farmCore) {
  if (farmCore.length === 0) return null
  const lastBlock = await farmCore.get(farmCore.length - 1)
  return JSON.parse(b4a.toString(lastBlock))
}

// Save farm state to core (append)
async function saveFarmState (farmCore, farmState) {
  await farmCore.append(b4a.from(farmState.serialize()))
}
```

**Step 2: Commit**

```bash
git add lib/core.js
git commit -m "feat: add Corestore + Hypercore for farm persistence"
```

---

### Task 7: Implement Protomux protocol for multiplayer

**Objective:** Define the Protomux channel protocol that multiplexes farm sync, chat, trading, and visit requests over a single Hyperswarm connection.

**Files:**
- Create: `ui/protocol.js`

**Channel definitions:**

```
CHANNELS.FARM_SYNC - Binary stream of farm state diffs
  Messages: { type: 'full-state', data: serializedFarm }
            { type: 'action', action: 'plant'|'water'|'harvest', row, col, data }

CHANNELS.CHAT - JSON stream of chat messages
  Messages: { sender: playerName, text: 'hello', timestamp: 123456 }

CHANNELS.TRADE - JSON stream for trade negotiation
  Messages: { type: 'offer', item: 'wheat', qty: 5, want: 'corn', wantQty: 2 }
            { type: 'accept', tradeId: '...' }
            { type: 'reject', tradeId: '...' }

CHANNELS.VISIT - JSON stream for farm visit requests
  Messages: { type: 'request-visit' }
            { type: 'visit-granted', farmKey: '...' }
            { type: 'visit-denied' }
```

Protomux setup on each connection:
```javascript
import Protomux from 'protomux'

function setupProtomux (stream, handlers) {
  const mux = Protomux.from(stream)

  // Farm sync channel
  const farmSync = mux.createChannel({
    protocol: CHANNELS.FARM_SYNC,
    onopen () { console.log('Farm sync channel open') },
    onmessage (buf) { handlers.onFarmSync(buf) }
  })

  // Chat channel
  const chat = mux.createChannel({
    protocol: CHANNELS.CHAT,
    onopen () { console.log('Chat channel open') },
    onmessage (buf) { handlers.onChat(buf) }
  })

  // Trade channel
  const trade = mux.createChannel({
    protocol: CHANNELS.TRADE,
    onopen () { console.log('Trade channel open') },
    onmessage (buf) { handlers.onTrade(buf) }
  })

  // Visit channel
  const visit = mux.createChannel({
    protocol: CHANNELS.VISIT,
    onopen () { console.log('Visit channel open') },
    onmessage (buf) { handlers.onVisit(buf) }
  })

  mux.open()

  return { farmSync, chat, trade, visit }
}
```

**Step 2: Commit**

```bash
git add ui/protocol.js
git commit -m "feat: add Protomux protocol with 4 channels (sync, chat, trade, visit)"
```

---

### Task 8: Implement Hyperswarm networking + peer discovery

**Objective:** Connect players via Hyperswarm topic, set up Protomux on each connection, replicate farm cores, and handle join/create flows.

**Files:**
- Create: `ui/networking.js`

**Implementation:**

Single Hyperswarm instance. Players who "Create Farm" generate a random topic, display the hex key. Players who "Visit Farm" paste a topic key to find the farm's peers.

On each connection:
1. Set up Protomux channels
2. Replicate farm core to visitor (read-only for visitors)
3. Send latest farm state over FARM_SYNC channel
4. Open chat channel for messaging

```javascript
import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'

class FarmNetwork {
  constructor (farmCore, store) {
    this.swarm = new Hyperswarm()
    this.farmCore = farmCore
    this.store = store
    this.peers = new Map()  // publicKey -> { name, mux, channels }
    this.topic = null

    // Cleanup on app close
    Pear.teardown(() => this.swarm.destroy())
  }

  async createFarm () {
    this.topic = crypto.randomBytes(32)
    const discovery = this.swarm.join(this.topic, { client: true, server: true })
    await discovery.flushed()
    this._setupPeerHandlers()
    return b4a.toString(this.topic, 'hex')
  }

  async joinFarm (topicHex) {
    this.topic = b4a.from(topicHex, 'hex')
    const discovery = this.swarm.join(this.topic, { client: true, server: true })
    await discovery.flushed()
    this._setupPeerHandlers()
  }

  _setupPeerHandlers () {
    this.swarm.on('connection', (conn) => {
      const peerKey = b4a.toString(conn.remotePublicKey, 'hex')
      console.log('Peer connected:', peerKey)

      // Replicate cores
      this.store.replicate(conn)

      // Set up Protomux
      const { farmSync, chat, trade, visit } = setupProtomux(conn, {
        onFarmSync: (buf) => this._onFarmSync(buf),
        onChat: (buf) => this._onChat(buf),
        onTrade: (buf) => this._onTrade(buf),
        onVisit: (buf) => this._onVisit(buf)
      })

      this.peers.set(peerKey, { conn, mux: null, channels: { farmSync, chat, trade, visit } })
    })

    this.swarm.on('disconnection', (conn) => {
      const peerKey = b4a.toString(conn.remotePublicKey, 'hex')
      this.peers.delete(peerKey)
      console.log('Peer disconnected:', peerKey)
    })
  }

  broadcastFarmState (farmState) {
    for (const [, peer] of this.peers) {
      peer.channels.farmSync.send(JSON.stringify({ type: 'full-state', data: farmState.serialize() }))
    }
  }

  // ... handlers for chat, trade, visit
}
```

**Step 2: Commit**

```bash
git add ui/networking.js
git commit -m "feat: add Hyperswarm networking with peer discovery and core replication"
```

---

## Milestone 4: Multiplayer Features

### Task 9: P2P Chat

**Objective:** Real-time chat between connected farm visitors.

**Files:**
- Create: `ui/chat.js`

Simple chat that sends JSON messages over the CHAT Protomux channel. On receive, prepend to chat panel DOM. Auto-scroll to bottom.

```javascript
class FarmChat {
  constructor (network) {
    this.network = network
    this.messages = []
    this.form = document.getElementById('chat-form')
    this.input = document.getElementById('chat-input')
    this.panel = document.getElementById('chat-messages')

    this.form.addEventListener('submit', (e) => {
      e.preventDefault()
      const text = this.input.value.trim()
      if (!text) return
      this.send(text)
      this.input.value = ''
    })
  }

  send (text) {
    const msg = JSON.stringify({
      sender: window.playerName,
      text,
      timestamp: Date.now()
    })
    for (const [, peer] of this.network.peers) {
      peer.channels.chat.send(msg)
    }
    this.addMessage(window.playerName, text)
  }

  addMessage (sender, text) {
    const div = document.createElement('div')
    div.textContent = `[${sender}] ${text}`
    this.panel.appendChild(div)
    this.panel.scrollTop = this.panel.scrollHeight
  }
}
```

**Step 2: Commit**

```bash
git add ui/chat.js
git commit -m "feat: add P2P chat between connected peers"
```

---

### Task 10: Farm visiting + remote watering

**Objective:** When a player joins another farm's topic, they see the remote farm and can water crops (but not plant/harvest/remove).

**Files:**
- Modify: `ui/networking.js`
- Modify: `ui/app.js`

When joining a farm:
1. Connect via Hyperswarm
2. Receive farm state over FARM_SYNC
3. Render the remote farm in view-only mode
4. Enable only the "water" tool for visitors
5. Water actions are sent back to the farm owner over FARM_SYNC channel
6. Farm owner applies visitor water actions to their local state and rebroadcasts

**Visitor permissions:**
- Can: view farm, water crops, chat, send trade offers
- Cannot: plant, harvest, remove crops, modify farm name

**Step 2: Commit**

```bash
git add ui/networking.js ui/app.js
git commit -m "feat: add farm visiting with remote watering permissions"
```

---

### Task 11: Item trading system

**Objective:** Players can trade harvested crops with each other via the TRADE Protomux channel.

**Files:**
- Create: `ui/trading.js`

Trade flow:
1. Player A selects "Trade" and picks an item + quantity from inventory
2. Player A specifies what they want in return
3. Trade offer sent to Player B via TRADE channel
4. Player B sees a trade dialog with Accept/Reject
5. On accept, both players' inventories update
6. Trades are persisted in local state

**Step 2: Commit**

```bash
git add ui/trading.js
git commit -m "feat: add P2P item trading system"
```

---

## Milestone 5: Polish + Ship

### Task 12: Save/load farm from disk

**Objective:** Farm persists across app restarts using Hypercore's on-disk storage.

**Files:**
- Modify: `ui/app.js`
- Modify: `ui/networking.js`

On startup:
1. Init Corestore
2. Load farm core
3. If core has data, deserialize latest state
4. If empty, create new farm
5. Start game loop

On any farm action:
1. Update local FarmState
2. Append new state snapshot to farm Hypercore
3. Broadcast to connected peers

**Step 2: Commit**

```bash
git add ui/app.js ui/networking.js
git commit -m "feat: add persistent farm save/load via Hypercore"
```

---

### Task 13: Visual polish + game feel

**Objective:** Add visual polish to make it feel like a real game.

**Additions:**
- Particle effects on harvest (coins flying up)
- Water droplet animation when watering
- Growth progress bar on each tile
- Day/night cycle (cosmetic background color shift)
- Sound effects via Web Audio API (optional, nice-to-have)
- Smooth camera panning (drag to move the isometric view)
- Zoom in/out with mouse wheel
- Player avatar on their farm (simple sprite)

**Step 2: Commit**

```bash
git add ui/renderer.js ui/app.js
git commit -m "feat: add visual polish - particles, animations, camera controls"
```

---

### Task 14: Final integration test + cleanup

**Objective:** Run two instances side-by-side, verify all multiplayer features work, clean up code.

**Test checklist:**
- [ ] Instance A creates farm, gets topic key
- [ ] Instance B joins with topic key, sees A's farm
- [ ] A plants crops, B sees them appear
- [ ] B waters A's crops, A sees watered status
- [ ] Both can chat
- [ ] A and B can trade items
- [ ] Restart A, farm state persists
- [ ] B rejoins, gets latest state from A's core
- [ ] Close app, no DHT pollution (teardown works)

**Step 2: Commit**

```bash
git add .
git commit -m "feat: final integration - all multiplayer features working"
git push
```

---

## Development Notes

### Pear-Specific Gotchas
- Bare runtime, NOT Node.js. Use `bare-path` not `path`, `bare-process` not `process`
- `Pear.config.storage` for persistent file storage
- `Pear.teardown()` for cleanup (prevents DHT pollution)
- Never load JS over HTTP/S
- `npm prune --omit=dev` before `pear stage`

### Testing Multiplayer
Run two instances in separate terminals:
```bash
# Terminal 1
pear run --dev .
# Terminal 2 (after copying the topic key)
pear run --dev .
```

### Architecture Decisions
- **Why Protomux over raw TCP?** Multiplexes multiple logical channels over one connection. Farm sync, chat, trades, and visit requests all share one Hyperswarm connection without interfering.
- **Why Hypercore for state?** Append-only log means we get persistence + replication for free. Latest block = current state. Visitors can replicate the full history when they connect.
- **Why not CRDTs?** Farmville has a natural owner per farm. Only the owner writes. Visitors only water. No conflict resolution needed - owner is authoritative.
- **Canvas over DOM?** Isometric grids with many tiles are much more performant as canvas. DOM would lag with 120+ positioned elements.
