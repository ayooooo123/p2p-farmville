# Pear Runtime Migration Plan

Migration guide for converting P2P FarmVille from Electron + pear-runtime embedding
to a native Pear/Bare desktop application.

**Current architecture:** Electron main process (`electron/main.js`) wraps `pear-runtime`
as a library, creates a `BrowserWindow`, and acts as a thin IPC bridge between the Chromium
renderer and a Bare worker (`workers/main.js`) that does all P2P networking via `Bare.IPC`.

**Target architecture:** Pear desktop app where `index.js` (Bare process) runs P2P directly,
the system webview loads `ui/index.html`, and communication uses Pear's built-in IPC pipe.
No Electron, no Chromium, no preload scripts.

---

## Table of Contents

1. [Why Migrate](#1-why-migrate)
2. [Architecture Comparison](#2-architecture-comparison)
3. [package.json Changes](#3-packagejson-changes)
4. [Main Process: workers/main.js becomes index.js](#4-main-process-workersmainjs-becomes-indexjs)
5. [Replacing the IPC Bridge](#5-replacing-the-ipc-bridge)
6. [Renderer to UI Directory](#6-renderer-to-ui-directory)
7. [Files to Delete](#7-files-to-delete)
8. [Storage Path Changes](#8-storage-path-changes)
9. [Bare-Specific Import Changes](#9-bare-specific-import-changes)
10. [Running the App](#10-running-the-app)
11. [Hot Reload and Updates](#11-hot-reload-and-updates)
12. [Step-by-Step Migration Checklist](#12-step-by-step-migration-checklist)
13. [Gotchas and Limitations](#13-gotchas-and-limitations)

---

## 1. Why Migrate

| Concern | Electron (current) | Pear (target) |
|---------|-------------------|---------------|
| Binary size | ~200MB (ships Chromium) | ~5MB (system webview) |
| P2P networking | Requires pear-runtime shim + Bare worker subprocess | Native - Bare IS the runtime |
| IPC complexity | 3-layer bridge: `ipcMain` -> `contextBridge` -> `window.bridge` -> worker | Direct duplex pipe between Bare process and webview |
| Updates | Electron Forge packaging + manual distribution | Built-in OTA via `Pear.updates()` |
| Storage | Custom platform-specific path detection | `Pear.config.storage` (automatic) |
| Startup time | Slow (Chromium cold start) | Fast (native webview) |

The current codebase is already 80% of the way there. The Bare worker (`workers/main.js`)
already uses `Bare.IPC`, Hyperswarm, Corestore, and Protomux - all native Pear/Bare stack.
The Electron layer is just a bridge.

---

## 2. Architecture Comparison

### Current (Electron)

```
┌─────────────────────────────────────────────────────┐
│  Electron Main Process (electron/main.js)           │
│  - require('electron') { app, BrowserWindow, ... }  │
│  - require('pear-runtime') as library               │
│  - ipcMain.handle() for renderer <-> worker bridge  │
│  - pear.run() to spawn Bare worker                  │
└──────────────────┬──────────────────────────────────┘
                   │ ipcMain/ipcRenderer
┌──────────────────▼──────────────────────────────────┐
│  Chromium Renderer (BrowserWindow)                  │
│  - electron/preload.js (contextBridge)              │
│  - window.bridge.* exposed methods                  │
│  - renderer/js/ipc-bridge.js wraps window.bridge    │
│  - renderer/app.js (Three.js game)                  │
└──────────────────┬──────────────────────────────────┘
                   │ Bare.IPC (piped through Electron)
┌──────────────────▼──────────────────────────────────┐
│  Bare Worker (workers/main.js)                      │
│  - Corestore, Hyperswarm, Protomux                  │
│  - All P2P logic                                    │
│  - Bare.IPC.write() / Bare.IPC.on('data')           │
└─────────────────────────────────────────────────────┘
```

### Target (Pear)

```
┌─────────────────────────────────────────────────────┐
│  Bare Main Process (index.js)                       │
│  - P2P logic (was workers/main.js)                  │
│  - Corestore, Hyperswarm, Protomux                  │
│  - Pear.config.storage for paths                    │
│  - Bare.IPC.write() / Bare.IPC.on('data')           │
│    (same API, now the main process)                 │
└──────────────────┬──────────────────────────────────┘
                   │ Pear IPC pipe (duplex stream)
┌──────────────────▼──────────────────────────────────┐
│  System Webview (ui/index.html)                     │
│  - const pipe = Pear.worker.pipe()                  │
│  - ui/js/ipc-bridge.js wraps pipe                   │
│  - ui/app.js (Three.js game, unchanged)             │
└─────────────────────────────────────────────────────┘
```

The three-process architecture (Electron main -> renderer -> Bare worker) collapses into
two processes (Bare main <-> system webview), eliminating the entire Electron bridge layer.

---

## 3. package.json Changes

### Remove

```json
// DELETE these devDependencies:
"@electron-forge/cli": "^7.11.1",
"@electron-forge/maker-deb": "^7.11.1",
"@electron-forge/maker-dmg": "^7.11.1",
"@electron-forge/maker-zip": "^7.11.1",
"electron": "^40.2.1",

// DELETE these dependencies:
"pear-runtime": "^0.5.0",       // no longer a library - Pear IS the runtime
"which-runtime": "^1.3.2",      // only one runtime now
```

### Change

```json
// CHANGE main entry:
"main": "index.js",             // was: "electron/main.js"

// CHANGE type (Bare uses CJS by default, keep as-is):
"type": "commonjs",             // no change needed

// CHANGE scripts:
"scripts": {
  "dev": "pear run --dev .",
  "release": "pear release",
  "stage": "pear stage",
  "seed": "pear seed ."
}
// was: "start": "electron-forge start -- --no-updates"
```

### Add

```json
// ADD pear configuration block:
"pear": {
  "name": "P2P FarmVille",
  "type": "desktop",
  "gui": {
    "backgroundColor": "#1a1a2e",
    "height": 800,
    "width": 1280
  }
}
```

### Keep

```json
// These dependencies stay as-is (all Bare-native):
"b4a": "^1.6.7",
"corestore": "^7.9.2",
"hypercore-crypto": "^3.6.1",
"hyperswarm": "^4.17.0",
"paparam": "^1.10.0",
"protomux": "^3.10.1"
```

### Final package.json

```json
{
  "name": "p2p-farmville",
  "productName": "P2P FarmVille",
  "version": "1.0.0",
  "description": "Peer-to-peer FarmVille with Three.js graphics",
  "license": "MIT",
  "type": "commonjs",
  "main": "index.js",
  "private": true,
  "scripts": {
    "dev": "pear run --dev .",
    "release": "pear release",
    "stage": "pear stage",
    "seed": "pear seed ."
  },
  "pear": {
    "name": "P2P FarmVille",
    "type": "desktop",
    "gui": {
      "backgroundColor": "#1a1a2e",
      "height": 800,
      "width": 1280
    }
  },
  "dependencies": {
    "b4a": "^1.6.7",
    "corestore": "^7.9.2",
    "hypercore-crypto": "^3.6.1",
    "hyperswarm": "^4.17.0",
    "paparam": "^1.10.0",
    "protomux": "^3.10.1"
  },
  "devDependencies": {
    "prettier": "^3.8.1",
    "prettier-config-holepunch": "^2.0.0"
  }
}
```

Note: `three` moves out of devDependencies since it's a vendored file
(`renderer/js/three.module.min.js`) loaded directly by the browser, not a Node/Bare module.

---

## 4. Main Process: workers/main.js becomes index.js

This is the core of the migration. The current `workers/main.js` already runs in Bare
and communicates via `Bare.IPC` - it is essentially already a Pear main process.

### What stays the same

Almost everything in `workers/main.js` transfers directly to `index.js`:

- All `require()` calls: Corestore, Hyperswarm, Protomux, b4a, hypercore-crypto
- `Bare.IPC.on('data', ...)` handler (line 1137) - same API in Pear main process
- `Bare.IPC.write()` via the `send()` helper (line 94) - same API
- All P2P logic: swarm, protomux channels, broadcast functions
- All social features: trade, gift, coop, help handlers

### What changes

#### 1. Storage path (line 56)

```javascript
// BEFORE (workers/main.js:56):
const storagePath = Bare.argv[2] || Bare.argv[0] || './storage'

// AFTER (index.js):
const Pear = require('pear')
const storagePath = Pear.config.storage
```

`Pear.config.storage` provides a persistent, app-scoped directory automatically.
No need for the platform-detection function in `electron/main.js:11-17`.

#### 2. Add Pear teardown hook

```javascript
// ADD to index.js (near top, after Pear require):
Pear.teardown(async () => {
  if (swarm) await swarm.destroy()
  if (store) await store.close()
})
```

This ensures clean shutdown when the app window is closed.
Currently, `electron/main.js:68-75` handles this via `mainWindow.on('closed')` which
kills workers - in Pear, the main process IS the worker, so it tears itself down.

#### 3. Remove worker:ready startup message

```javascript
// BEFORE (workers/main.js:1284):
send({ type: 'worker:ready', storagePath })

// AFTER: Replace with Pear-aware ready signal or keep as-is.
// The UI will connect its pipe and send 'init' just like before.
// This message still works fine - just rename for clarity if desired.
send({ type: 'ready', storagePath })
```

#### 4. No changes needed for IPC data handler

The `Bare.IPC.on('data', ...)` handler at line 1137 works identically in the Pear
main process. When the UI calls `Pear.worker.pipe()`, the other end is `Bare.IPC`.

### Concrete steps

1. Copy `workers/main.js` to `index.js` in the project root
2. Apply the storage path change (line 56)
3. Add `const Pear = require('pear')` at the top
4. Add `Pear.teardown()` hook
5. The rest of the ~1287 lines remain unchanged

---

## 5. Replacing the IPC Bridge

This is where the Electron-specific plumbing gets removed entirely.

### Current flow (3 layers)

```
renderer/app.js
  -> window.IPCBridge.sendToWorker(msg)
    -> window.bridge.writeWorkerIPC(path, data)     [ipc-bridge.js:40]
      -> ipcRenderer.invoke('pear:worker:writeIPC')  [preload.js:42]
        -> ipcMain.handle(...)                        [main.js:126]
          -> worker.send(data)                        [main.js:129]
            -> Bare.IPC receives in worker
```

### Target flow (1 layer)

```
ui/app.js
  -> window.IPCBridge.sendToWorker(msg)
    -> pipe.write(JSON.stringify(msg))               [ipc-bridge.js, rewritten]
      -> Bare.IPC receives in main process
```

### New ipc-bridge.js

The entire `window.bridge` dependency is replaced by a Pear pipe. The `IPCBridge`
object keeps its public API so `app.js` and all game modules need zero changes.

```javascript
/* global Pear */

// IPC Bridge - Pear pipe to main Bare process
const NDJSON_DELIM = '\n'

const IPCBridge = {
  available: typeof Pear !== 'undefined',
  _pipe: null,
  _buffer: '',

  _listeners: {
    neighbors: [],
    chatMessage: [],
    farmUpdate: [],
    peerCount: [],
    initialized: [],
    error: [],
    tradeOffer: [],
    tradeResult: [],
    tradeCancelled: [],
    giftReceived: [],
    giftSent: [],
    coopUpdate: [],
    helpRequest: [],
    helpResponse: [],
    playerJoined: [],
    playerLeft: []
  },

  startWorker () {
    // In Pear, the "worker" is the main process - already running.
    // We just open the pipe to it.
    if (!this.available) {
      console.warn('[ipc-bridge] Pear not available')
      return Promise.resolve({ ok: false })
    }

    this._pipe = Pear.worker.pipe()
    this._setupPipe()
    return Promise.resolve({ ok: true })
  },

  _setupPipe () {
    // The pipe is a duplex stream. Messages arrive as newline-delimited JSON.
    this._pipe.on('data', (chunk) => {
      this._buffer += chunk.toString()
      const lines = this._buffer.split(NDJSON_DELIM)
      this._buffer = lines.pop() // keep incomplete last line in buffer

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg = JSON.parse(line)
          this._routeMessage(msg)
        } catch (e) {
          console.warn('[ipc-bridge] Failed to parse message:', e)
        }
      }
    })

    this._pipe.on('error', (err) => {
      console.error('[ipc-bridge] Pipe error:', err)
    })
  },

  sendToWorker (msg) {
    if (!this._pipe) return
    const data = typeof msg === 'string' ? msg : JSON.stringify(msg)
    this._pipe.write(data + NDJSON_DELIM)
  },

  // --- All public methods below are UNCHANGED from current ipc-bridge.js ---
  // initP2P, sendFarmUpdate, sendChatMessage, sendTradeOffer, etc.
  // onNeighbors, onChatMessage, onPeerCount, etc.
  // _routeMessage switch statement - identical
  ...
}

window.IPCBridge = IPCBridge
```

### Main process (index.js) send() change

The main process `send()` function must also use newline-delimited JSON to match:

```javascript
// BEFORE (workers/main.js:94-99):
function send (msg) {
  try {
    Bare.IPC.write(JSON.stringify(msg))
  } catch (e) {
    console.error('[worker] IPC write error:', e.message)
  }
}

// AFTER (index.js):
const NDJSON_DELIM = '\n'

function send (msg) {
  try {
    Bare.IPC.write(JSON.stringify(msg) + NDJSON_DELIM)
  } catch (e) {
    console.error('[main] IPC write error:', e.message)
  }
}
```

Similarly, the `Bare.IPC.on('data', ...)` handler should handle newline-delimited
framing rather than assuming each `data` event is a complete message:

```javascript
let ipcBuffer = ''

Bare.IPC.on('data', (chunk) => {
  ipcBuffer += chunk.toString()
  const lines = ipcBuffer.split(NDJSON_DELIM)
  ipcBuffer = lines.pop()

  for (const line of lines) {
    if (!line.trim()) continue
    handleIPCMessage(line)
  }
})

async function handleIPCMessage (str) {
  // ... existing switch(data.type) logic from line 1149-1276
}
```

This is important because `Bare.IPC` is a stream - data chunks may arrive split
across multiple events. The current code (line 1143: `JSON.parse(str)`) works in
Electron because `worker.send()` sends discrete messages, but over a raw pipe
messages can be fragmented or concatenated.

### What files are deleted

- `electron/preload.js` - entire file (contextBridge, ipcRenderer)
- `electron/main.js` - entire file (BrowserWindow, ipcMain, app lifecycle)

### What remains unchanged

- `renderer/app.js` - calls `window.IPCBridge.*` methods, no change needed
- `renderer/js/chat.js` - uses `window.IPCBridge`, no change
- `renderer/js/trade.js` - uses `window.IPCBridge`, no change
- `renderer/js/gift.js` - uses `window.IPCBridge`, no change
- `renderer/js/coop.js` - uses `window.IPCBridge`, no change
- `renderer/js/neighbor-panel.js` - uses `window.IPCBridge`, no change
- All other renderer modules (scene, crops, terrain, etc.) - no IPC, no change

The key insight: `IPCBridge` was designed as an abstraction layer. Only its internals
change (pipe instead of window.bridge); its public API is identical.

---

## 6. Renderer to UI Directory

Pear expects the UI at `ui/index.html` by default.

### File moves

```
renderer/index.html      -> ui/index.html
renderer/app.js           -> ui/app.js
renderer/css/style.css    -> ui/css/style.css
renderer/js/*.js          -> ui/js/*.js
```

### HTML changes in ui/index.html

#### 1. Add Pear script tag

```html
<head>
  <meta charset="UTF-8">
  <title>P2P FarmVille</title>
  <!-- ADD: Pear API for the webview -->
  <script src="/pear/pear.js"></script>
  <link rel="stylesheet" href="css/style.css">
</head>
```

The `/pear/pear.js` script is served automatically by the Pear runtime and exposes
the global `Pear` object in the webview.

#### 2. Remove Electron + Pear Runtime credit

```html
<!-- BEFORE (line 243): -->
<p>Electron + Pear Runtime</p>

<!-- AFTER: -->
<p>Pear Runtime</p>
```

#### 3. Script paths stay the same (relative)

All `<script src="js/...">` and `<script src="app.js">` paths remain unchanged
since the directory structure under `ui/` mirrors `renderer/`.

---

## 7. Files to Delete

| File | Reason |
|------|--------|
| `electron/main.js` | Electron main process - replaced by `index.js` |
| `electron/preload.js` | contextBridge/ipcRenderer - replaced by Pear pipe |
| `electron/` directory | Empty after above deletions |
| `forge.config.js` | Electron Forge build config - Pear uses `pear release` |
| `workers/main.js` | Moved to `index.js` (can keep for reference) |
| `workers/` directory | Empty after move |

### Optional deletions

| File | Note |
|------|------|
| `shared/constants.js` | Currently uses `module.exports` (CJS). Only imported by the worker. If the main process (index.js) needs it, keep it. The renderer duplicates these constants inline in `app.js:18-29`. Consider whether to consolidate. |

---

## 8. Storage Path Changes

### Before (electron/main.js:11-17 + workers/main.js:56)

Two-step process: Electron main detects platform paths, passes to worker via argv.

```javascript
// electron/main.js
function getStoragePath () {
  const base = process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.local', 'share'))
  return path.join(base, 'p2p-farmville')
}

// workers/main.js
const storagePath = Bare.argv[2] || Bare.argv[0] || './storage'
```

### After (index.js)

One line:

```javascript
const Pear = require('pear')
const storagePath = Pear.config.storage
```

`Pear.config.storage` returns an absolute path to a persistent, app-scoped directory
managed by the Pear runtime. It handles platform differences automatically.

### Data migration note

Existing users will have data at the old Electron paths:
- Linux: `~/.local/share/p2p-farmville/`
- macOS: `~/Library/Application Support/p2p-farmville/`
- Windows: `%APPDATA%\p2p-farmville\`

The Pear storage path will be different. Options:
1. **Ignore** - users start fresh (simplest, game data is not critical)
2. **One-time migration** - check if old path exists and copy Corestore data to new path
3. **Symlink** - point Pear storage at the old location (fragile, not recommended)

Recommendation: option 1 for initial migration, option 2 as a follow-up if users request it.

---

## 9. Bare-Specific Import Changes

The worker (`workers/main.js`) already runs in Bare, so most imports are fine.
But the main process currently also uses some Node-isms that need attention.

### In index.js (was workers/main.js)

**No changes needed for:**
- `require('corestore')` - Bare-native
- `require('hyperswarm')` - Bare-native
- `require('protomux')` - Bare-native
- `require('b4a')` - Bare-native
- `require('hypercore-crypto')` - Bare-native
- `Bare.IPC` - Bare global, same API
- `Bare.argv` - no longer used (replaced by `Pear.config.storage`)
- `console.log/error` - available in Bare
- `JSON.parse/stringify` - available in Bare
- `Date`, `Map`, `Set`, `setTimeout`, `setInterval` - available in Bare

**Add:**
- `require('pear')` - for `Pear.config.storage` and `Pear.teardown()`

### If you ever need filesystem or path operations in index.js

```javascript
// Node (NOT available in Bare):
const fs = require('fs')
const path = require('path')
const os = require('os')
const process = require('process')

// Bare equivalents:
const fs = require('bare-fs')
const path = require('bare-path')
const os = require('bare-os')
// process -> use global Bare object (Bare.pid, Bare.argv, etc.)
```

Currently `workers/main.js` does NOT use `fs`, `path`, or `os`, so no changes
are needed. But if future code requires file operations, use the `bare-*` modules.

### In the UI (webview)

The webview runs standard browser JavaScript. No Node or Bare modules are available.
The renderer code (`app.js`, all `js/*.js` files) already runs as pure browser JS:
- Three.js loaded via `<script>` tag (vendored `three.module.min.js`)
- ES6 modules with relative imports
- DOM APIs, Canvas, Web Audio API
- No `require()` calls anywhere in renderer code

The only new global is `Pear` (from `/pear/pear.js`), used only in `ipc-bridge.js`.

---

## 10. Running the App

### Before (Electron)

```bash
npm start
# which runs: electron-forge start -- --no-updates
```

### After (Pear)

```bash
# Development (with hot reload):
pear run --dev .

# Production (after staging):
pear stage
pear seed .
# Users install via: pear install pear://<key>
```

### Prerequisites

Install the Pear CLI:

```bash
npm i -g pear
```

Or via Holepunch's installer (see https://docs.pear.holepunch.to).

### DevTools in Pear

```bash
# Open with devtools (replaces electron/main.js:64-66):
pear run --dev .
# DevTools are available via right-click -> Inspect in the webview,
# or by pressing F12 (platform-dependent)
```

---

## 11. Hot Reload and Updates

### Development hot reload

In `--dev` mode, Pear watches for file changes and reloads the UI automatically.

To handle updates programmatically in the UI (e.g., show a notification):

```javascript
// In ui/app.js or a dedicated module:
const update = Pear.updates()

update.on('update', () => {
  // New version available - could show a toast notification
  console.log('[app] Update available')
})

// To apply the update:
// await Pear.reload()
```

### Production OTA updates

When the app is released via `pear release`, connected peers receive updates
automatically via the Hyperswarm network. The UI can listen for and apply them:

```javascript
const update = Pear.updates()

update.on('update', (version) => {
  // Show "Update available" banner in the game HUD
  showUpdateNotification(version)
})

// When user clicks "Update":
async function applyUpdate () {
  await Pear.reload()
}
```

This replaces the current flow in `electron/main.js:42-46` where Pear update events
are forwarded via `mainWindow.webContents.send('pear:event', ...)` through the
Electron IPC bridge. In native Pear, the UI accesses `Pear.updates()` directly.

---

## 12. Step-by-Step Migration Checklist

### Phase 1: Scaffold and restructure

- [ ] Run `pear init --type desktop` in a temp directory to see the scaffold structure
- [ ] Create `index.js` by copying `workers/main.js`
- [ ] Create `ui/` directory
- [ ] Move `renderer/index.html` -> `ui/index.html`
- [ ] Move `renderer/app.js` -> `ui/app.js`
- [ ] Move `renderer/css/` -> `ui/css/`
- [ ] Move `renderer/js/` -> `ui/js/`

### Phase 2: Modify index.js (main process)

- [ ] Add `const Pear = require('pear')` at top
- [ ] Replace `const storagePath = Bare.argv[2] || ...` with `const storagePath = Pear.config.storage`
- [ ] Add `Pear.teardown()` hook for clean shutdown of swarm and corestore
- [ ] Add newline-delimited JSON framing to `send()` function
- [ ] Add newline-delimited JSON parsing to `Bare.IPC.on('data')` handler
- [ ] Remove the `worker:ready` message or rename to `ready`

### Phase 3: Rewrite ipc-bridge.js

- [ ] Replace `window.bridge.*` calls with `Pear.worker.pipe()` duplex stream
- [ ] Remove `startWorker()` worker-path logic (main process is the worker)
- [ ] Remove `onWorkerStdout/Stderr/Exit` methods (no subprocess to monitor)
- [ ] Add newline-delimited JSON framing for reads and writes
- [ ] Keep all public API methods identical (`initP2P`, `sendFarmUpdate`, `sendChatMessage`, etc.)
- [ ] Keep all event listener registrations identical (`onNeighbors`, `onChatMessage`, etc.)
- [ ] Keep `_routeMessage` switch statement identical

### Phase 4: Update ui/index.html

- [ ] Add `<script src="/pear/pear.js"></script>` in `<head>`
- [ ] Update credits text (remove "Electron" reference)
- [ ] Verify all `<script src="...">` paths work from `ui/` directory

### Phase 5: Update package.json

- [ ] Change `"main"` to `"index.js"`
- [ ] Add `"pear"` config block with name, type, gui settings
- [ ] Remove `electron`, `@electron-forge/*` from devDependencies
- [ ] Remove `pear-runtime`, `which-runtime` from dependencies
- [ ] Replace scripts with `pear run --dev .`, `pear release`, etc.

### Phase 6: Delete Electron files

- [ ] Delete `electron/main.js`
- [ ] Delete `electron/preload.js`
- [ ] Delete `electron/` directory
- [ ] Delete `forge.config.js`
- [ ] Delete `workers/main.js` (now `index.js`)
- [ ] Delete `workers/` directory
- [ ] Remove `renderer/` directory (now `ui/`)

### Phase 7: Test

- [ ] `pear run --dev .` - app window opens
- [ ] Setup screen renders, farm name input works
- [ ] Three.js scene initializes (canvas renders)
- [ ] P2P initializes (worker:ready / initialized messages in console)
- [ ] Chat works between two instances
- [ ] Neighbor discovery works
- [ ] Trade, gift, coop features work
- [ ] Farm state persists across restarts (Corestore at Pear.config.storage)
- [ ] Hot reload works (edit a CSS file, see change)
- [ ] Clean shutdown (close window, no orphan processes)

### Phase 8: Release

- [ ] `pear stage` - creates a staged release
- [ ] `pear seed .` - makes the app available on the network
- [ ] Test OTA update flow

---

## 13. Gotchas and Limitations

### 1. System webview rendering differences

Pear uses the OS system webview (WebKit on macOS/Linux, WebView2/Edge on Windows)
instead of Chromium. Potential issues:

- **CSS compatibility**: Test flexbox, grid, and custom properties across platforms.
  The current CSS (`style.css`) uses standard properties that should work everywhere.
- **ES module support**: The `<script type="module">` for `app.js` requires a modern
  webview. All supported Pear platforms have this.
- **WebGL/Three.js**: Three.js relies on WebGL, which is available in all modern
  system webviews. However, performance characteristics may differ from Chromium.
  Test the Three.js rendering on all target platforms.
- **Web Audio API**: Used by `audio.js` for procedural sound. Should work in all
  modern webviews, but test for API availability and fallback gracefully.

### 2. No Node.js in the webview

The current renderer code is already clean browser JS with no `require()` calls.
However, `shared/constants.js` uses `module.exports` (CJS). If you want to share
constants between `index.js` and the UI, you'll need to either:
- Duplicate them (current approach - `app.js` already copies constants inline)
- Serve a browser-compatible version from `ui/shared/constants.js` using a global

### 3. Bare.IPC message framing

In Electron, `worker.send()` / `worker.on('message')` delivers discrete JSON objects.
In Pear, `Bare.IPC` is a raw byte stream. Messages can arrive split across multiple
`data` events or concatenated into one. **You must implement message framing.**

The newline-delimited JSON approach (described in section 5) is the standard solution.
This is the most critical change to get right - without it, IPC will randomly break
under load (many chat messages, fast farm updates, etc.).

### 4. No single-instance lock

`electron/main.js:22-33` uses `app.requestSingleInstanceLock()` to prevent multiple
instances. Pear does not have a built-in equivalent. Options:
- Use a lockfile in `Pear.config.storage` (check/create on startup)
- Accept that multiple instances can run (may cause Hyperswarm port conflicts)
- Pear itself may manage this at the platform level (check Pear docs)

### 5. Window title and icon

`electron/main.js:50` sets `title: 'P2P FarmVille'`. In Pear, the window title
comes from `<title>` in `ui/index.html` (already set) and the `pear.name` field
in `package.json`. App icon is set via `pear.gui.icon` in `package.json`:

```json
"pear": {
  "gui": {
    "icon": "assets/icon.png"
  }
}
```

### 6. DevTools access

In Electron, DevTools open automatically in dev mode (`main.js:64-66`).
In Pear, `pear run --dev .` enables DevTools access. The exact method to open them
depends on the platform and webview implementation.

### 7. three.module.min.js vendoring

The Three.js library is vendored at `renderer/js/three.module.min.js` (~700KB).
This moves to `ui/js/three.module.min.js`. It loads as a browser ES module, which
works fine in system webviews. No bundler needed.

### 8. macOS "activate" event

`electron/main.js:139-141` handles the macOS dock-click-to-reopen pattern:
```javascript
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```
Pear handles window lifecycle natively. This code is not needed.

### 9. window-all-closed behavior

`electron/main.js:135-137` quits the app when all windows close (except on macOS).
Pear handles this automatically based on the platform conventions.

### 10. package.json reading

`electron/main.js:80` exposes `package.json` to the renderer via IPC:
```javascript
ipcMain.handle('pkg', () => require('../package.json'))
```
This is used in `preload.js:5` via `bridge.pkg()`. Check if any renderer code actually
calls `bridge.pkg()`. If so, the version info can be passed via Pear:
```javascript
// In the webview:
const version = Pear.config.version
```

### 11. Hyperswarm port binding

When running multiple Pear apps on the same machine, Hyperswarm may compete for
DHT ports. The current code uses default settings (`new Hyperswarm()`), which should
handle port selection automatically. But test with multiple instances.

### 12. Content Security Policy

Electron's `sandbox: true` + `contextIsolation: true` provided security boundaries.
In Pear's webview, consider adding a CSP meta tag to `ui/index.html`:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' /pear/; style-src 'self' 'unsafe-inline';">
```

---

## Summary

The migration is mechanically straightforward because the current architecture
already isolates P2P logic in a Bare worker. The steps are:

1. **Promote the worker**: `workers/main.js` -> `index.js` (add Pear config, teardown)
2. **Move the UI**: `renderer/` -> `ui/` (add pear.js script tag)
3. **Simplify IPC**: Replace 3-layer Electron bridge with 1-layer Pear pipe
4. **Delete Electron**: Remove `electron/`, `forge.config.js`, Electron deps
5. **Add framing**: Newline-delimited JSON on Bare.IPC (the one non-obvious change)

The game code (Three.js scene, crops, animals, buildings, inventory, mastery,
achievements, collections, expansion, day/night, weather, particles, audio,
performance) requires **zero changes**. All 25+ renderer modules interact only
through `window.IPCBridge` and DOM APIs, both of which remain identical.

Estimated scope: ~200 lines of new/modified code, ~250 lines deleted.
