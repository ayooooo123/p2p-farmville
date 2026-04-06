# P2P FarmVille

Peer-to-peer farming game with 3D graphics. No servers. Walk to your neighbors' farms and help out.

Built with Electron, Three.js, and Hyperswarm. P2P updates via Pear Runtime.

## Prerequisites

- **Node.js** >= 18 (tested on 22.x)
- **npm** >= 9
- **Git**

## Install

```
git clone https://github.com/ayooooo123/p2p-farmville.git
cd p2p-farmville
npm install
```

## Run

```
npm start
```

This launches Electron Forge in dev mode. DevTools open automatically. The `--no-updates` flag prevents Pear from checking for updates during development.

### First launch

You'll see a setup screen asking for a farm name. Pick anything -- this is how other players identify you on the P2P network.

After that you get 500 coins, 30 energy, and a 20x20 plot of land.

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look / select plot |
| 1 | Plow tool |
| 2 | Plant tool |
| 3 | Water tool |
| 4 | Harvest tool |
| 5 | Remove tool |
| I | Inventory |
| M | Mastery |
| J | Collections |
| K | Achievements |
| X | Expansion |
| N | Neighbors |
| C | Co-op missions |
| F3 | FPS counter |
| ESC | Cancel / return home from visit |

Click toolbar buttons at the bottom of the screen for the same actions.

## How P2P Works

When you start the game, a background worker (Bare worker via Pear Runtime) joins the Hyperswarm DHT on topic `p2p-farmville-world-v1`. Any other player running the app discovers you automatically. No signup, no lobby server.

Each player runs their own farm in 3D. Farms are placed in the world grid based on player public keys. When farms are adjacent, you can walk across the boundary to visit.

**While visiting a neighbor's farm:**
- Fertilize their crops
- Water their plots
- Feed their animals
- Chat in real-time
- Trade items
- Send gifts

All data flows peer-to-peer through Protomux channels. Farm state syncs every 10 seconds to connected neighbors.

### Playing solo

P2P is optional. If no one else is online, the game works fine as a single-player farm sim. All farming, crafting, collections, and progression systems work offline.

## Game Systems

**Farming** -- Plow, plant, water, harvest. 55 crop types with different grow times, sell prices, and XP rewards. Crops wither if left unharvested too long.

**Trees** -- Plant fruit trees. They grow through stages and produce harvestable fruit on a cycle.

**Animals** -- Buy and place animals (chickens, cows, goats, etc.). Feed them and collect products (eggs, milk, etc.).

**Buildings** -- Barn, chicken coop, nursery, crafting workshop, general store. Buildings provide passive bonuses and enable crafting.

**Crafting** -- Combine harvested items into higher-value goods. Requires a crafting workshop building.

**Market** -- Buy seeds, saplings, animals, buildings, decorations, and vehicles with coins.

**Inventory** -- 50 slots default. Expandable through buildings. Sell items directly from inventory.

**Vehicles** -- Tractor, seeder, harvester. Speed up farming tasks.

**Decorations** -- Fences, paths, flowers, hay bales, scarecrows, ponds, etc.

**Mastery** -- Harvest the same crop repeatedly to earn mastery stars (I, II, III). Each star increases yield.

**Collections** -- Rare drops from harvesting. Complete a set for permanent bonuses.

**Achievements / Ribbons** -- Unlock achievements for farming milestones, social actions, and progression.

**Expansion** -- Buy larger plots. Start at 20x20, expand up to 40x40.

**Day/Night Cycle** -- In-game time with dynamic lighting.

**Weather** -- Clear, cloudy, rain. Visual effects via Three.js particle system.

## Project Structure

```
electron/
  main.js          Electron main process (Pear Runtime, window, worker management)
  preload.js       contextBridge -- secure IPC between renderer and main
renderer/
  index.html       Three.js canvas + UI overlay panels
  app.js           Main game loop, state management, input handling
  css/style.css    HUD, panels, menus
  js/
    scene.js       Three.js scene, camera, lights, skybox
    terrain.js     Ground mesh, plot grid
    player.js      Third-person character, WASD movement
    crops.js       55 crop definitions, 3D meshes, growth stages
    trees.js       Tree definitions, growth, harvest cycle
    animals.js     Animal definitions, feeding, product collection
    buildings.js   Building definitions, crafting queue
    decorations.js Fence/path/flower/pond definitions
    vehicles.js    Tractor/seeder/harvester speed boosts
    inventory.js   Item storage, buy/sell
    market.js      Market UI for purchases
    neighbor-renderer.js  Render other players' farms in 3D
    neighbor-panel.js    Neighbor list sidebar
    chat.js        P2P chat (global, private, emotes)
    trade.js       Item trading UI
    gift.js        Gift sending/receiving (5/day limit)
    coop.js        Co-op farming missions
    collections.js Collectible sets + bonuses
    mastery.js     Crop mastery stars
    achievements.js Ribbons and badges
    expansion.js   Farm grid expansion tiers
    daynight.js    Day/night lighting cycle
    weather.js     Weather effects (particles)
    particles.js   Particle system
    audio.js       Procedural sound via Web Audio API
    performance.js FPS counter, quality settings
    ipc-bridge.js  Renderer <-> worker IPC layer
shared/
  constants.js     Game constants (grid size, costs, XP thresholds)
workers/
  main.js          Bare worker -- all P2P networking (1286 lines)
                    Corestore, Hyperswarm, Protomux, b4a
```

## Build Distributable

```
npm run package
```

Outputs a packaged app:
- **Linux** -- `.deb` (Debian/Ubuntu)
- **macOS** -- `.zip`

Windows not configured yet. Add `@electron-forge/maker-squirrel` to `devDependencies` and `forge.config.js` to enable it.

## Development Tips

**DevTools** -- Open automatically in dev mode. Press Ctrl+Shift+I if they don't.

**P2P worker logs** -- Worker stdout/stderr pipe to the renderer console. Look for `[ipc-bridge]` prefixed messages.

**Reset save data** -- Delete the storage directory:
```
# Linux
rm -rf ~/.local/share/p2p-farmville/

# macOS
rm -rf ~/Library/Application\ Support/p2p-farmville/

# Windows
rmdir /s "%APPDATA%\p2p-farmville"
```

**Test multiplayer locally** -- Run two instances of `npm start`. Each gets its own farm. They'll auto-discover each other on the P2P network.

**Disable P2P** -- The game functions fully offline. No toggle needed -- if there are no peers, it just runs solo.

## Architecture Notes

The renderer never imports Hyperswarm or any P2P library. All networking lives in `workers/main.js`, a Bare worker managed by Pear Runtime inside the Electron main process. Communication between renderer and worker goes through a preload bridge (`preload.js` -> `ipc-bridge.js`) using Electron's IPC.

The Three.js module is bundled locally at `renderer/js/three.module.min.js` -- no CDN calls at runtime.

## Tech Stack

- Electron 40 + Pear Runtime 0.5
- Three.js 0.183 (bundled, no runtime CDN)
- Hyperswarm 4 (P2P peer discovery)
- Corestore 7 (persistent hypercore storage)
- Protomux 3 (multiplexed streams per connection)
- hypercore-crypto + b4a (key generation, binary encoding)
- Electron Forge 7 (build tooling)

## License

MIT
