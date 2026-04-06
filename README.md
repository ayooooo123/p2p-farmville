# P2P FarmVille

Peer-to-peer farming game with 3D graphics. No servers. Walk to your neighbors' farms and help out.

Built with Electrobun, Three.js, and Hyperswarm.

## Prerequisites

- **Bun** >= 1.0
- **Git**
- Linux: `libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev`

## Install

```
git clone https://github.com/ayooooo123/p2p-farmville.git
cd p2p-farmville
bun install
```

## Run

```
bun start
```

This builds the Electrobun app and launches it in dev mode.

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

## How P2P Works

When you start the game, the main Bun process joins the Hyperswarm DHT on topic `p2p-farmville-world-v1`. Any other player running the app discovers you automatically. No signup, no lobby server.

Communication between the renderer (Three.js game) and the P2P engine uses Electrobun's typed RPC system (`Electroview` / `BrowserView.defineRPC`).

### Playing solo

P2P is optional. If no one else is online, the game works fine as a single-player farm sim.

## Game Systems

**Farming** -- Plow, plant, water, harvest. 55 crop types.
**Trees** -- Plant fruit trees with growth stages and harvest cycles.
**Animals** -- Buy and place animals. Feed them and collect products.
**Buildings** -- Barn, chicken coop, nursery, crafting workshop.
**Crafting** -- Combine harvested items into higher-value goods.
**Market** -- Buy seeds, saplings, animals, buildings, decorations.
**Vehicles** -- Tractor, seeder, harvester for speed boosts.
**Decorations** -- Fences, paths, flowers, scarecrows, ponds.
**Mastery** -- Harvest the same crop repeatedly to earn mastery stars.
**Collections** -- Rare drops from harvesting. Complete sets for bonuses.
**Achievements** -- Ribbons for farming milestones and social actions.
**Expansion** -- Buy larger plots. Start at 20x20, expand up to 40x40.
**Day/Night** -- In-game time with dynamic lighting.
**Weather** -- Clear, cloudy, rain via Three.js particle system.

## Architecture

```
src/
  bun/
    index.ts          Electrobun main process (BrowserWindow, RPC, app menu)
    p2p.ts            P2P networking (Corestore, Hyperswarm, Protomux)
  game/
    index.ts          View entrypoint (Electroview RPC bridge -> window.IPCBridge)
renderer/
  index.html          Game UI + Three.js canvas
  app.js              Main game loop, state management
  css/style.css       HUD, panels, menus
  js/                 30+ game modules (scene, terrain, crops, etc.)
shared/
  constants.js        Game constants
electrobun.config.ts  Build configuration
```

The renderer never imports Hyperswarm or any P2P library. All networking lives in `src/bun/p2p.ts`, running in the Bun main process. Communication goes through Electrobun's RPC.

## Tech Stack

- Electrobun (Bun-based desktop framework)
- Three.js 0.183 (bundled, no CDN)
- Hyperswarm 4 (P2P peer discovery)
- Corestore 7 (persistent hypercore storage)
- Protomux 3 (multiplexed streams per connection)

## Migration from Electron

This project was migrated from Electron + Pear Runtime to Electrobun.
Key changes:
- `electron/main.js` -> `src/bun/index.ts` (BrowserWindow + RPC)
- `electron/preload.js` -> eliminated (Electroview replaces contextBridge)
- `workers/main.js` -> `src/bun/p2p.ts` (runs directly in Bun, no Bare worker)
- `renderer/js/ipc-bridge.js` -> `src/game/index.ts` (Electroview RPC bridge)
- Electron Forge -> Electrobun CLI
- ~12MB binaries instead of ~150MB Electron bundle

## License

MIT
