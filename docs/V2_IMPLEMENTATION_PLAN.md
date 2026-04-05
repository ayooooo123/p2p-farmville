# P2P FarmVille - V2 Complete Rewrite

> **For Claude Code:** Implement this plan task-by-task. This is a full rewrite from scratch.
> **Architecture:** Pear Electron v2 (hello-pear-electron pattern) + Three.js + Hyperswarm
> **No pear-run.** Uses pear-runtime embedded in Electron with Bare workers.

**Goal:** Build a complete P2P FarmVille clone with Three.js 3D graphics, walking between nearby farms, and all original FarmVille features -- running on the Pear Electron v2 architecture.

**Architecture:**
- Electron main process embeds `pear-runtime` for P2P updates + Bare worker management
- `workers/main.js` is a Bare worker that handles ALL P2P networking (Hyperswarm, Hypercore, Corestore, Protomux)
- Renderer (Electron window) loads Three.js from CDN and communicates with the worker via IPC bridge
- The worker acts as a local P2P backend -- the renderer never touches Hyperswarm directly
- Neighbors are auto-discovered on a shared topic (the "world") -- walk to their farm boundary to visit

**Tech Stack:**
- Electron + pear-runtime v2 (hello-pear-electron pattern)
- Three.js (3D rendering via CDN -- never load remote JS at runtime, bundle it)
- Bare worker: hyperswarm, hypercore, corestore, protomux, b4a, hypercore-crypto
- Renderer: Three.js, vanilla JS

---

## Project Structure

```
p2p-farmville/
├── package.json
├── forge.config.js
├── electron/
│   ├── main.js          # Electron main process (Pear Runtime init, window, workers)
│   └── preload.js       # contextBridge for secure IPC
├── renderer/
│   ├── index.html       # Three.js canvas + UI overlay
│   ├── app.js           # Main renderer entry
│   ├── css/
│   │   └── style.css    # UI overlay styling (HUD, menus, chat)
│   └── js/
│       ├── scene.js             # Three.js scene setup, camera, lighting, terrain
│       ├── terrain.js           # Farm terrain generation (plowed/planted plots as 3D meshes)
│       ├── player.js            # Player character (third-person, WASD movement)
│       ├── crops.js             # 3D crop models + growth stage meshes
│       ├── trees.js             # 3D tree models + harvest cycle
│       ├── animals.js           # 3D animal models + feeding/milking/collecting
│       ├── buildings.js         # 3D building models (barn, coop, nursery, market)
│       ├── decorations.js       # Fences, paths, flowers, hay bales, etc.
│       ├── vehicles.js          # Tractor, seeder, harvester (speed up tasks)
│       ├── inventory.js         # Player inventory management
│       ├── market.js            # Market UI (buy seeds, animals, trees, buildings, decorations)
│       ├── hud.js               # HUD overlay (coins, XP, level, energy, toolbelt)
│       ├── chat.js              # P2P chat UI
│       ├── trade.js             # Item trading with neighbors
│       ├── gift.js              # Send/receive gifts to/from neighbors
│       ├── neighbor-panel.js    # Neighbor list + visit/water/fertilize actions
│       ├── co-op.js             # Co-op farming missions
│       ├── collections.js       # Collectible sets that give bonuses
│       ├── mastery.js           # Crop mastery stars (I, II, III)
│       ├── achievements.js      # Achievement/badge system
│       └── ipc-bridge.js        # Renderer <-> Worker IPC communication layer
├── workers/
│   └── main.js          # Bare worker: ALL P2P logic
├── shared/
│   ├── constants.js     # Crop/item/building definitions, timing, costs
│   └── protocol.js      # Protomux channel definitions + message types
└── build/
    ├── icon.png
    └── (forge build assets)
```

---

## FarmVille Feature Parity

### Core Gameplay
- **Plowing:** Convert grass to plowed soil (15 coins, 1 XP). Required before planting.
- **Planting:** Select seed from Market, click plowed plot. Deducts seed cost.
- **Watering:** Water crops to speed growth 2x. Must re-water after each growth stage.
- **Harvesting:** Click mature crops to harvest. Earns coins + XP + sometimes rare items.
- **Withering:** Crops wither if not harvested within 2x their grow time after maturing.
- **Fertilizing:** Visitors can fertilize crops for bonus XP (1-5 crops per visit).

### Economy
- **Coins:** Primary currency. Earned from harvesting, selling, quests.
- **Farm Cash:** Premium currency. Earned slowly from leveling up, achievements.
- **XP / Levels:** Earned from most actions. Higher levels unlock more items in Market.
- **Market:** Buy seeds, trees, animals, buildings, decorations, vehicles, expansions.
- **Selling:** Sell harvested crops, animal products, tree fruits directly from inventory.

### Flora
- **Crops:** 50+ crop types across tiers (seeds unlocked by level). Each has grow time, cost, sell price, XP yield, mastery track.
- **Trees:** Plant once, harvest repeatedly on timer. Oak, Cherry, Apple, Orange, Lemon, Peach, Acai, etc.
- **Flowers (Decorations):** Roses, Tulips, Sunflowers, Lavender -- cosmetic + some give bonuses.

### Fauna
- **Animals:** Chickens (eggs), Cows (milk), Horses, Sheep (wool), Pigs (truffles), Goats, Ducks, etc.
- **Animal Buildings:** Chicken Coop, Dairy Farm, Horse Stable -- house animals, boost production.
- **Feeding:** Animals consume feed (grown crops) to produce goods.
- **Baby Animals:** Sometimes born, can be shared with neighbors.

### Buildings
- **Storage Buildings:** Barn, Tool Shed -- increase item storage capacity.
- **Crafting Buildings:** Bakery, Winery, Kitchen, Spa -- convert raw goods into crafted items worth more.
- **Special Buildings:** Nursery (grow tree seedlings faster), Greenhouse (grow crops faster), Fuel Station.

### Farm Expansion
- **Land Expansion:** Expand farm boundary with coins/Farm Cash. Each expansion adds a grid section.
- **Terrain Types:** Grass, plowed soil, water features, paths.

### Social / P2P (THE KEY DIFFERENTIATOR)
- **Auto-discovery:** All players on the same world topic are visible. Nearby farms appear at the edge of your view.
- **Walking:** WASD to walk. Camera follows in third-person. Walk to the boundary of a neighbor's farm to visit.
- **Visiting:** When on a neighbor's farm: fertilize crops (up to 5), feed animals, leave a sign.
- **Neighbor Actions:** Water crops, fertilize, feed animals -- all actions sync to owner's farm via P2P.
- **Gifting:** Send gifts (seeds, items, rare finds) to neighbors. Daily gift limit.
- **Trading:** Trade items peer-to-peer with offer/accept/reject flow.
- **Co-op Farming:** Joint missions where multiple farmers contribute crops to a shared goal for rewards.
- **Help Requests:** Post "help needed" -- neighbors who contribute get rewards.

### Progression Systems
- **Crop Mastery:** Plant the same crop many times to earn mastery stars (Bronze/Silver/Gold). Each star gives +1 XP per harvest.
- **Collections:** Rare items drop from harvesting. Complete a collection set for bonus rewards.
- **Achievements/Badges:** Milestones like "Harvest 100 Crops", "Visit 10 Neighbors", "Master 5 Crops".
- **Ribbons:** Yellow, White, Red, Blue ribbons for categories (Architect, Crop Master, Animal Breeder, etc.)

### Visual (Three.js)
- **3D Terrain:** Rolling green terrain with plowed plots as textured ground patches.
- **3D Crops:** Procedural 3D models for each crop at each growth stage (seeds -> sprouts -> full grown).
- **3D Trees:** Procedural trees with seasonal variety. Trunk + canopy meshes.
- **3D Animals:** Simple low-poly animals with idle/walk animations.
- **3D Buildings:** Box-based buildings with roof geometry, doors, windows.
- **Player Character:** Third-person simple character model. WASD movement, camera follows.
- **Day/Night Cycle:** Dynamic lighting that shifts over time.
- **Particle Effects:** Harvest sparkles, coin animations, planting dust, water splashes.
- **Weather:** Optional rain that auto-waters crops.
- **UI Overlay:** HTML/CSS overlay on top of Three.js canvas for HUD, menus, chat.

---

## Pear Electron V2 Architecture

### electron/main.js
- `pear-runtime` initialization with storage dir, version, upgrade link
- BrowserWindow with preload script, sandbox, context isolation
- Worker management via `pear.run(workers/main.js, [pear.storage])`
- IPC bridge: forwards worker stdout/stderr/IPC to renderer, renderer IPC to worker
- Deep linking for `p2p-farmville://` protocol
- Single instance lock
- OTA update events forwarded to renderer

### electron/preload.js
- contextBridge exposes: `bridge.startWorker()`, `bridge.writeWorkerIPC()`, `bridge.onWorkerIPC()`, `bridge.onWorkerStdout()`, `bridge.onPearEvent()`, `bridge.applyUpdate()`

### workers/main.js (Bare worker - ALL P2P logic)
- Single Corestore, single Hyperswarm (best practices)
- Named Hypercores: `farm-state`, `world-registry`, `chat-log`, `trade-log`
- World registry: append-only list of { playerKey, playerName, farmKey, position } entries
- Farm state: append-only snapshots (latest = current)
- Protomux channels: `farm-sync`, `chat`, `trade`, `gift`, `coop`, `world`
- IPC communication with renderer: `Bare.IPC.on('data', ...)` / `Bare.IPC.write(...)`
- The worker is the single source of truth for all P2P state

### Renderer (Three.js + HTML overlay)
- Never touches P2P libraries directly
- All P2P data comes through the IPC bridge from the worker
- Three.js scene renders the farm world
- HTML/CSS overlay for UI elements (HUD, market, chat, etc.)

---

## Neighbor Discovery + Walking

### World Topic
All players share a single "world" topic (hardcoded or configurable). When you join, you announce your farm to the world registry Hypercore.

### World Registry
Each player appends `{ playerKey, playerName, farmCoreKey, position: { x, z } }` to the world registry Hypercore. Positions are assigned sequentially along a "street" -- each farm is placed at `x = farmIndex * farmWidth`.

### Walking Between Farms
- Player walks with WASD. Camera follows in third-person.
- When player crosses their farm boundary to the right, they enter the neighbor's farm.
- Farm boundaries are visible (fence line / terrain change).
- When on a neighbor's farm, your tools change: you can fertilize, water, feed animals.
- The neighbor's farm state is replicated from their Hypercore via the world topic.

### Rendering Neighboring Farms
- When a neighbor's core is available, render their farm terrain to the left/right of yours.
- Only render 1-2 adjacent farms for performance.
- Crops, trees, buildings on neighbor farms are visible but not clickable (except for fertilize/water targets).

---

## Implementation Plan

This is a large project. Break it into phases. Each phase is a Claude Code session.

### Phase 1: Pear Electron V2 Scaffold + Three.js Scene
- Set up Electron + pear-runtime + forge
- Three.js scene with green terrain, sky, lighting
- Third-person camera + WASD player movement
- Basic ground grid visible
- Worker IPC bridge functional (renderer can send/receive to worker)

### Phase 2: Farm Grid + Plowing + Planting
- 3D plowed plot meshes on terrain
- Plowing: click to convert grass to soil
- Planting: select seed, click plowed plot
- Crop growth: visual stage progression (3D meshes)
- Harvesting: click mature crop, get coins + XP
- Basic HUD: coins, XP, level, energy bar

### Phase 3: Complete Farm Economy
- Market UI (buy seeds, trees, animals, buildings, decorations)
- Trees: plant, grow, harvest on timer
- Animals: buy, place, feed, collect goods
- Buildings: buy, place, functional effects
- Decorations: buy, place
- Vehicles: buy, use to speed up tasks
- Inventory system
- Selling from inventory

### Phase 4: P2P Networking + Auto-Discovery
- World topic Hyperswarm join
- World registry Hypercore (announce your farm)
- Farm state Hypercore (persist + replicate)
- Neighbor discovery: list nearby farms
- Auto-render adjacent farms in Three.js scene
- Walking between farms (cross boundary)

### Phase 5: Social Features
- Visitor actions on neighbor farms (fertilize, water, feed)
- Real-time chat (Protomux chat channel)
- Item trading
- Gifting
- Co-op farming missions
- Help requests

### Phase 6: Progression Systems
- Crop mastery (I/II/III stars)
- Collections (rare item drops)
- Achievements/badges/ribbons
- Level progression (unlock more market items)

### Phase 7: Polish
- Day/night cycle (Three.js dynamic lighting)
- Weather system (rain auto-waters)
- Particle effects (harvest sparkles, coin float, planting dust)
- Sound effects (Web Audio)
- Storage building capacity
- Farm expansion
- Crafting buildings

---

## For Claude Code: Phase 1 Instructions

Start with Phase 1 ONLY. The rest will be dispatched in subsequent sessions.

**Phase 1 goal:** Pear Electron v2 scaffold with Three.js scene, WASD movement, and working worker IPC bridge.

### Step 1: Restructure project

Delete all existing `ui/` and `lib/` files. Create the new structure:
```
electron/main.js
electron/preload.js
renderer/index.html
renderer/app.js
renderer/css/style.css
renderer/js/scene.js
renderer/js/player.js
renderer/js/ipc-bridge.js
workers/main.js
shared/constants.js
package.json
forge.config.js
```

### Step 2: package.json

Model after hello-pear-electron:
```json
{
  "name": "p2p-farmville",
  "productName": "P2P FarmVille",
  "version": "1.0.0",
  "description": "Peer-to-peer FarmVille with Three.js graphics",
  "license": "MIT",
  "type": "commonjs",
  "main": "electron/main.js",
  "private": true,
  "scripts": {
    "start": "electron-forge start -- --no-updates",
    "package": "electron-forge package"
  },
  "dependencies": {
    "paparam": "^1.10.0",
    "pear-runtime": "^0.5.0",
    "which-runtime": "^1.3.2"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.11.1",
    "@electron-forge/maker-deb": "^7.11.1",
    "@electron-forge/maker-dmg": "^7.11.1",
    "@electron-forge/maker-zip": "^7.11.1",
    "electron": "^40.2.1",
    "prettier": "^3.8.1",
    "prettier-config-holepunch": "^2.0.0"
  }
}
```

### Step 3: electron/main.js

Copy the pattern from hello-pear-electron. Key changes:
- App name: P2P FarmVille
- Window size: 1280x800
- Preload: `../electron/preload.js`
- Worker: `../workers/main.js`

### Step 4: electron/preload.js

Copy from hello-pear-electron exactly. Exposes `window.bridge` with all IPC methods.

### Step 5: workers/main.js

Bare worker that:
- Logs storage path via `Bare.IPC.write()`
- Sets up a simple echo handler: `Bare.IPC.on('data', msg => Bare.IPC.write('worker received: ' + msg))`
- Imports will be added in Phase 4 (for now just the IPC echo)

### Step 6: renderer/index.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>P2P FarmVille</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <div id="hud">
      <div id="hud-top">
        <div id="coin-display">500 coins</div>
        <div id="xp-display">Level 1 (0/100 XP)</div>
        <div id="energy-display">Energy: 30/30</div>
      </div>
    </div>
    <div id="setup-screen">
      <h1>P2P FarmVille</h1>
      <input id="farm-name" type="text" placeholder="Farm Name" maxlength="20">
      <button id="start-btn">Start Farming</button>
    </div>
    <div id="chat-panel">
      <div id="chat-messages"></div>
      <form id="chat-form">
        <input id="chat-input" type="text" placeholder="Chat...">
        <button type="submit">Send</button>
      </form>
    </div>
  </div>
  <!-- Three.js bundled locally -->
  <script src="js/three.module.min.js" type="module"></script>
  <script src="js/ipc-bridge.js"></script>
  <script src="js/scene.js"></script>
  <script src="js/player.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

### Step 7: renderer/js/scene.js

Three.js scene with:
- Green terrain plane (large flat plane with grass texture/color)
- Simple sky (background color or skybox)
- Directional light (sun) + ambient light
- Grid overlay on terrain (subtle lines showing farm plot boundaries)
- Fog for distance
- Camera: PerspectiveCamera, positioned behind and above player
- Renderer: WebGLRenderer, antialias, shadow maps

### Step 8: renderer/js/player.js

Third-person player controller:
- Simple capsule/box mesh as player character (placeholder geometry)
- WASD movement on XZ plane
- Camera follows player (offset behind + above)
- Click on terrain to move player there (optional, WASD is primary)
- Player stays within farm bounds

### Step 9: renderer/js/ipc-bridge.js

Wrapper around `window.bridge`:
- `sendToWorker(msg)` -> `bridge.writeWorkerIPC('/workers/main.js', msg)`
- `onWorkerMessage(callback)` -> `bridge.onWorkerIPC('/workers/main.js', callback)`
- Simple JSON message protocol: `{ type: string, data: any }`

### Step 10: renderer/app.js

Main renderer entry:
- Check if `window.bridge` is available
- Start the worker: `bridge.startWorker('/workers/main.js')`
- Initialize Three.js scene
- Initialize player
- Setup screen: enter name, click Start -> hides setup, shows game
- Game loop: animate, render
- HUD updates

### Step 11: Download Three.js

Download `three.module.min.js` to `renderer/js/three.module.min.js`:
```bash
curl -L https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js -o renderer/js/three.module.min.js
```

Or better: use npm to install three.js and copy the build:
```bash
npm install three --save-dev
cp node_modules/three/build/three.module.min.js renderer/js/
```

### Step 12: forge.config.js

Minimal Electron Forge config for dev:
```javascript
module.exports = {
  packagerConfig: {
    icon: 'build/icon'
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb', platforms: ['linux'] }
  ]
}
```

### Step 13: shared/constants.js

Initial constants:
```javascript
module.exports = {
  FARM_WIDTH: 80,
  FARM_DEPTH: 80,
  PLOT_SIZE: 2,
  GRID_COLS: 20,
  GRID_ROWS: 20,
  STARTING_COINS: 500,
  STARTING_ENERGY: 30,
  MAX_ENERGY: 30,
  ENERGY_REGEN_TIME: 300000, // 5 minutes
  STARTING_XP: 0,
  XP_PER_LEVEL: 100,
  WORLD_TOPIC: 'p2p-farmville-world-v1'
}
```

### Step 14: Verify

```bash
npm install
npm start
```

Expected: Electron window opens with green 3D terrain, player capsule visible, WASD moves the character, camera follows. Setup screen overlay with farm name input. Worker IPC echo working (check console).

### Step 15: Commit

```bash
git add -A
git commit -m "feat: Phase 1 - Pear Electron v2 scaffold + Three.js scene + WASD player"
git push origin main
```
