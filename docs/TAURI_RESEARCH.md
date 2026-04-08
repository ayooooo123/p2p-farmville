# Tauri v2 Migration Research

> Research date: April 2026
> Status: Investigation complete, ready for implementation decision

---

## 1. Holepunch Ecosystem — Current Package Versions

All packages verified on npm as of April 2026.

| Package            | Version  | Status       | Notes                                        |
|--------------------|----------|--------------|----------------------------------------------|
| hypercore          | 11.28.1  | Very active  | Published 6 days ago                         |
| hyperswarm         | 4.17.0   | Active       | Published ~1 month ago                       |
| corestore          | 7.9.2    | Active       | Stable                                       |
| protomux           | 3.10.1   | Active       | Stable                                       |
| b4a                | 1.8.0    | Active       | Published 25 days ago                        |
| hypercore-crypto   | 3.6.1    | Stable       | Published 9 months ago                       |
| pear-runtime       | 2.0.0    | Active       | Published 3 months ago, replaces 0.x series  |
| pear (CLI)         | 2.0.1    | Active       | Published 2 months ago                       |
| bare               | 1.24.2   | Active       | Published 2 months ago                       |
| pear-electron      | —        | Unmaintained | 3 years old, do not use                      |
| hyperswarm-web     | —        | Stale        | 4 years old, no official browser Hyperswarm  |

### Key findings

- **pear-runtime 2.0.0** now recommends `pear-run` instead of the old launcher.
  Our codebase uses 0.5.0 — significantly outdated.
- **pear-desktop IS Electron** under the hood. It wraps `pear-electron` internally.
  Switching to Tauri eliminates this hidden Electron dependency entirely.
- **bare-rust** exists (`holepunchto/bare-rust`) and provides Rust bindings for the
  Bare runtime. `bare-addon-rust` is a template for native Bare addons in Rust.
- **There is NO pure-Rust P2P stack.** The Rust bindings only wrap the Bare runtime
  API — they do not reimplement hyperswarm/corestore/protomux in Rust.
- **hyperswarm-dht-relay** can relay DHT operations over WebSocket, which could
  enable browser/webview P2P without a full Node.js process — but requires relay
  infrastructure and is not truly peer-to-peer.

---

## 2. Architecture Options Comparison

| Criteria                 | A: Tauri + Node Sidecar   | B: Tauri + WS Relay       | C: Tauri + bare-rust       |
|--------------------------|---------------------------|----------------------------|----------------------------|
| Binary size              | ~45 MB (5 Tauri + 40 Node)| ~5 MB                      | ~15–25 MB (estimated)      |
| vs Electron (~200 MB)    | **78% smaller**           | **97% smaller**            | **88% smaller**            |
| P2P stack changes        | None — runs as-is         | Major rewrite              | Moderate                   |
| Game renderer changes    | None                      | None                       | None                       |
| IPC bridge changes       | Moderate (WebSocket)      | Major (relay protocol)     | Moderate                   |
| Relay infrastructure     | Not needed                | Required (self-hosted/3rd) | Not needed                 |
| Truly peer-to-peer       | Yes                       | No (relay-mediated)        | Yes                        |
| Tauri docs/support       | Official sidecar docs     | No precedent               | No precedent               |
| Maturity                 | Production-ready          | Experimental               | Very experimental           |
| Node.js dependency       | Yes (bundled)             | No                         | No (uses Bare)             |
| Offline/LAN support      | Full                      | Needs relay reachable      | Full                       |
| Complexity               | Low                       | Medium                     | High                       |

**Recommendation: Option A (Tauri + Node.js sidecar)** is the most practical path.

---

## 3. Architecture Diagram — Option A

```
┌──────────────────────────────────────────────────────────┐
│                     TAURI v2 SHELL                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              System WebView (webview2/wkwebview)    │  │
│  │                                                    │  │
│  │   ┌──────────────┐    ┌─────────────────────────┐  │  │
│  │   │  Three.js     │    │  ipc-bridge.js          │  │  │
│  │   │  Game         │◄──►│  (WebSocket client)     │  │  │
│  │   │  Renderer     │    │                         │  │  │
│  │   └──────────────┘    └────────────┬────────────┘  │  │
│  │                                    │               │  │
│  └────────────────────────────────────┼───────────────┘  │
│                                       │                  │
│  ┌────────────────────────────────────┼───────────────┐  │
│  │  Tauri Rust Backend                │               │  │
│  │                                    │               │  │
│  │  • Window management               │               │  │
│  │  • Sidecar lifecycle               │               │  │
│  │  • System tray / menus             │               │  │
│  │  • Auto-updater                    │               │  │
│  └────────────────────────────────────┼───────────────┘  │
│                                       │                  │
└───────────────────────────────────────┼──────────────────┘
                                        │
                        WebSocket (ws://127.0.0.1:<port>)
                                        │
┌───────────────────────────────────────┼──────────────────┐
│                NODE.JS SIDECAR        │                  │
│                                       │                  │
│  ┌────────────────────────────────────▼───────────────┐  │
│  │  ws-server.js (WebSocket server on localhost)      │  │
│  │  • Accepts connections from webview                │  │
│  │  • JSON message routing (same protocol as IPC)     │  │
│  └────────────────────────────────────┬───────────────┘  │
│                                       │                  │
│  ┌────────────────────────────────────▼───────────────┐  │
│  │  p2p-engine.js (extracted from workers/main.js)    │  │
│  │                                                    │  │
│  │  ┌──────────────┐  ┌───────────┐  ┌────────────┐  │  │
│  │  │ Hyperswarm   │  │ Corestore │  │ Protomux   │  │  │
│  │  │ 4.17.0       │  │ 7.9.2     │  │ 3.10.1     │  │  │
│  │  └──────┬───────┘  └─────┬─────┘  └─────┬──────┘  │  │
│  │         │                │               │         │  │
│  │         └────────────────┼───────────────┘         │  │
│  │                          │                         │  │
│  │                   DHT / TCP / UTP                   │  │
│  │                   (peer-to-peer)                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Step-by-Step Migration Plan

### Phase 1: Project Scaffolding

1. Install Tauri CLI v2: `cargo install tauri-cli --version ^2`
2. Run `cargo tauri init` in the project root
3. Configure `tauri.conf.json`:
   - Set `build.devUrl` to point at the existing renderer
   - Set `build.frontendDist` to `renderer/`
   - Register the Node.js sidecar in `bundle.externalBin`
4. Copy `renderer/` as the webview frontend (no changes to Three.js code)

### Phase 2: Build the Node.js Sidecar

5. Create `sidecar/` directory with its own `package.json`
6. Extract P2P logic from `workers/main.js` into `sidecar/p2p-engine.js`
   - Replace `Bare.IPC.write()` calls with WebSocket sends
   - Replace `Bare.IPC` listener with WebSocket message handler
   - Replace `Bare.argv` storage path with a CLI argument or env var
   - All other P2P code (hyperswarm, corestore, protomux) stays identical
7. Create `sidecar/ws-server.js` — a lightweight WebSocket server on localhost
8. Create `sidecar/index.js` — entry point that starts ws-server + p2p-engine
9. Bundle with `pkg` or `nexe` to produce a standalone Node binary, or use
   Tauri's sidecar support to bundle the raw Node.js binary + script

### Phase 3: Adapt the IPC Bridge

10. Rewrite `renderer/js/ipc-bridge.js` to use WebSocket instead of `window.bridge`
    (see Section 6 below for the exact changes)
11. Remove Pear/Bare-specific preload and bridge code
12. All high-level methods (`initP2P`, `sendFarmUpdate`, etc.) keep their signatures
    — only the transport layer changes

### Phase 4: Tauri Rust Integration

13. Add Rust commands for sidecar lifecycle management:
    - `start_sidecar()` — spawn the Node process, pass the WS port
    - `stop_sidecar()` — graceful shutdown on app quit
    - `get_sidecar_port()` — return the port for the webview to connect
14. Use Tauri's `tauri::api::process::Command` for sidecar management
15. Add `window.close` event handler to ensure clean sidecar shutdown

### Phase 5: Packaging & Distribution

16. Configure `tauri.conf.json` `bundle` section for each platform
17. Bundle the Node sidecar binary in `externalBin`
18. Test on macOS, Windows, Linux
19. Set up auto-updater via Tauri's built-in updater plugin

---

## 5. Sidecar Communication Pattern

### Protocol

The WebSocket protocol reuses the **exact same JSON message format** already
defined in `workers/main.js`. No new protocol design needed.

```
Renderer (WebView)                         Node.js Sidecar
      │                                          │
      │──── ws://127.0.0.1:<port> ──────────────►│
      │     { type: 'init', playerName: '...' }  │
      │                                          │
      │◄─────────────────────────────────────────│
      │  { type: 'initialized', playerKey, ... } │
      │                                          │
      │──── { type: 'update-farm', farmState } ─►│
      │                                          │
      │◄── { type: 'neighbors', neighbors } ─────│
      │◄── { type: 'chat-message', from, ... } ──│
      │◄── { type: 'connected', count } ──────── │
      │                                          │
```

### Port Selection

The sidecar picks a random available port on startup and writes it to stdout.
The Tauri Rust backend reads stdout, extracts the port, and exposes it to
the webview via a Tauri command:

```rust
#[tauri::command]
fn get_sidecar_port(state: State<SidecarState>) -> u16 {
    state.port.load(Ordering::SeqCst)
}
```

### Reconnection

The ipc-bridge should implement exponential backoff reconnection:
- Initial delay: 100ms
- Max delay: 5s
- Max attempts: 20
- On reconnect, re-send `{ type: 'init', playerName }` to restore state

---

## 6. ipc-bridge.js Changes

The current bridge talks to `window.bridge` (Pear's Bare IPC). The Tauri
version replaces this with a WebSocket connection. The public API stays
identical — game code never touches the transport.

### Current pattern (Pear/Bare):

```js
// Sends via Bare IPC
sendToWorker(msg) {
  const data = typeof msg === 'string' ? msg : JSON.stringify(msg)
  window.bridge.writeWorkerIPC(WORKER_PATH, data)
}

// Receives via Bare IPC
onWorkerMessage(cb) {
  window.bridge.onWorkerIPC(WORKER_PATH, (data) => {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data)
    const msg = JSON.parse(str)
    cb(msg)
    this._routeMessage(msg)
  })
}
```

### New pattern (Tauri + WebSocket):

```js
const IPCBridge = {
  _ws: null,
  _messageCallbacks: [],
  _listeners: { /* same as current */ },

  async connect() {
    // Get port from Tauri backend
    const port = await window.__TAURI__.core.invoke('get_sidecar_port')
    return new Promise((resolve, reject) => {
      this._ws = new WebSocket(`ws://127.0.0.1:${port}`)
      this._ws.onopen = () => {
        this.available = true
        resolve({ ok: true })
      }
      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          this._messageCallbacks.forEach(cb => cb(msg))
          this._routeMessage(msg)
        } catch (e) {
          console.warn('[ipc-bridge] Parse error:', e)
        }
      }
      this._ws.onclose = () => {
        this.available = false
        this._scheduleReconnect()
      }
      this._ws.onerror = (err) => reject(err)
    })
  },

  sendToWorker(msg) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg))
  },

  onWorkerMessage(cb) {
    this._messageCallbacks.push(cb)
  },

  // startWorker() is no longer needed — Tauri Rust backend manages sidecar
  // onWorkerStdout/Stderr/Exit are no longer needed — Rust backend handles these

  // ALL high-level methods remain UNCHANGED:
  // initP2P(), sendFarmUpdate(), sendChatMessage(), sendTradeOffer(), etc.
  // ALL event listener registrations remain UNCHANGED:
  // onNeighbors(), onChatMessage(), onTradeOffer(), etc.
  // _routeMessage() remains UNCHANGED.
}
```

### What stays the same

- All 14 high-level methods (`initP2P`, `sendFarmUpdate`, `sendChatMessage`,
  `sendPrivateMessage`, `sendEmote`, `sendTradeOffer`, `respondToTrade`,
  `cancelTrade`, `sendGift`, `createCoopMission`, `contributeToCoopMission`,
  `requestHelp`, `respondToHelp`)
- All 16 event listener registrations
- The entire `_routeMessage()` switch block
- The `_listeners` map structure

### What changes

| Component              | Before (Pear)                        | After (Tauri)                          |
|------------------------|--------------------------------------|----------------------------------------|
| Transport              | `window.bridge` (Bare IPC)           | WebSocket on localhost                 |
| Connection init        | `startWorker(path)`                  | `connect()` via Tauri invoke           |
| Send                   | `bridge.writeWorkerIPC(path, data)`  | `ws.send(data)`                        |
| Receive                | `bridge.onWorkerIPC(path, cb)`       | `ws.onmessage`                         |
| Worker lifecycle       | Managed by Pear runtime              | Managed by Tauri Rust backend          |
| Stdout/Stderr/Exit     | `bridge.onWorkerStdout/Stderr/Exit`  | Handled by Rust (not exposed to JS)    |
| Reconnection           | Not needed (same process)            | Required (separate process)            |

---

## 7. Sidecar index.js Structure

```js
// sidecar/index.js
const { WebSocketServer } = require('ws')
const { createServer } = require('net')
const P2PEngine = require('./p2p-engine')

// Find a free port
function getFreePort() {
  return new Promise((resolve) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port
      srv.close(() => resolve(port))
    })
  })
}

async function main() {
  const port = await getFreePort()
  const storagePath = process.argv[2] || './p2p-farmville-storage'

  const wss = new WebSocketServer({ host: '127.0.0.1', port })
  const engine = new P2PEngine(storagePath)

  // Print port for Tauri to read from stdout
  console.log(`SIDECAR_PORT:${port}`)

  wss.on('connection', (ws) => {
    // Forward messages from webview to P2P engine
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        engine.handleMessage(msg)
      } catch (e) {
        console.error('[sidecar] Bad message:', e)
      }
    })

    // Forward messages from P2P engine to webview
    engine.onSend((msg) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(msg))
      }
    })

    ws.on('close', () => {
      console.log('[sidecar] WebView disconnected')
    })
  })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[sidecar] Shutting down...')
    await engine.destroy()
    wss.close()
    process.exit(0)
  })

  console.log(`[sidecar] Ready on ws://127.0.0.1:${port}`)
}

main().catch((err) => {
  console.error('[sidecar] Fatal:', err)
  process.exit(1)
})
```

### p2p-engine.js changes from workers/main.js

The refactor is mechanical — the P2P logic is identical:

| workers/main.js (Bare)             | sidecar/p2p-engine.js (Node.js)        |
|------------------------------------|----------------------------------------|
| `Bare.IPC.write(JSON.stringify(m))`| `this._sendCallback(m)`               |
| `Bare.IPC.on('data', handler)`     | `handleMessage(msg)` method           |
| `Bare.argv[2]`                     | Constructor argument `storagePath`     |
| `require('hyperswarm')` etc.       | Same — these packages work in Node.js |
| Top-level state variables          | Instance properties on `P2PEngine`    |

The P2P packages (`hyperswarm`, `corestore`, `protomux`, `b4a`,
`hypercore-crypto`) are all Node.js-native and need zero changes.

---

## 8. Gotchas and Risks

### Must address

- **Sidecar process lifecycle.** If the sidecar crashes, the app looks frozen.
  The Tauri backend must monitor the child process and restart it automatically.
  Implement a health-check ping/pong over the WebSocket.

- **Port collision.** Using port 0 (OS-assigned) avoids conflicts, but the
  webview must wait for the port number before connecting. The Tauri backend
  should gate the webview load until the sidecar reports its port.

- **Security: localhost binding only.** The WebSocket server MUST bind to
  `127.0.0.1`, never `0.0.0.0`. Otherwise any process on the LAN could connect
  to the sidecar and inject messages. Consider adding a shared secret token
  generated at launch and passed to both the sidecar and webview.

- **Binary size of Node.js.** A bundled Node.js binary is ~40 MB. Using `pkg`
  or `nexe` to produce a single executable may add more. Alternative: ship
  the raw `.js` files and require Node.js as a system dependency (smaller
  bundle, but worse UX). Or use `bun` as the runtime — single binary at ~50 MB
  but faster startup and no node_modules needed at runtime with `bun build
  --compile`.

- **Storage path.** Currently `Bare.argv[2]` determines storage. In Tauri, use
  Tauri's `app_data_dir()` (Rust) and pass it as a CLI arg to the sidecar.
  This gives proper OS-specific paths (`~/Library/Application Support/`,
  `%APPDATA%/`, `~/.local/share/`).

### Good to know

- **WebSocket adds latency vs IPC.** Bare IPC is in-process; WebSocket goes
  through the kernel's TCP stack. For our use case (JSON messages at most every
  100ms) this is negligible — under 1ms on localhost.

- **No hot-reload of sidecar.** During development, changing P2P code requires
  restarting the sidecar. Consider a `--watch` flag using `nodemon` for dev mode.

- **CSP headers.** Tauri's default Content Security Policy blocks `ws://`
  connections. Add `ws://127.0.0.1:*` to the CSP in `tauri.conf.json`:
  ```json
  "security": {
    "csp": "default-src 'self'; connect-src 'self' ws://127.0.0.1:*"
  }
  ```

- **macOS code signing.** The sidecar binary must be signed alongside the
  main Tauri binary. Tauri handles this if the sidecar is registered in
  `externalBin`, but it requires an Apple Developer certificate for
  distribution outside the Mac App Store.

- **Tauri v2 is stable.** Tauri v2 reached stable release in October 2024 and
  has active maintenance. The sidecar API, plugin system, and IPC are all
  production-ready as of 2026.

- **Future option: bare-rust.** If `bare-rust` matures, we could later
  eliminate the Node.js sidecar entirely by embedding the Bare runtime in
  the Tauri Rust backend. This would be Option C — worth revisiting in 6–12
  months but not practical today (54 commits, limited docs).

- **Pear runtime 2.0 is not relevant to Tauri.** The pear-runtime upgrade
  only matters if staying in the Pear ecosystem. For the Tauri migration,
  we skip Pear entirely and run the P2P stack directly on Node.js.
