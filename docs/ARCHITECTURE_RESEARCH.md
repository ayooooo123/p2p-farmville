# Architecture Research: Pear Desktop App Patterns

**Date:** 2026-04-06
**Context:** The project migrated from Electron to native `pear run` and hit module resolution issues in Bare. This document researches the correct approach.

## Three Approaches to Pear Desktop Apps

### Approach 1: Native `pear run` (Current - BROKEN)

**How it works:**
- Project has `package.json` with `pear.type: "desktop"` config
- Run with `pear run --dev .` during development
- Deploy with `pear stage` / `pear release` / `pear seed`
- Users run with `pear run pear://<key>`
- The Pear runtime (which IS Electron internally via `pear-desktop`) provides the window

**Pros:**
- Simplest setup, minimal config
- Built-in P2P OTA updates
- Standard approach in Pear docs and workshops

**Cons:**
- Users must install the Pear runtime globally (`npm i -g pear`)
- No standalone distribution (no .dmg, .AppImage, .exe) - docs explicitly note this is NOT yet supported
- Module resolution issues in Bare for complex apps
- `Pear.worker` API is DEPRECATED in favor of `pear-run` + `pear-pipe` modules
- Bare runtime cannot resolve Node.js built-in modules (`process`, `fs`, etc.)

**Why it broke for us:**
- Bare cannot resolve modules like `process` that some transitive dependencies expect
- NDJSON framing over Bare.IPC is fragile
- The `pear` npm module only works inside the Pear runtime, not standalone

### Approach 2: Electron + pear-runtime (Original - RECOMMENDED)

**How it works:**
- Standard Electron app with `electron/main.js`, `electron/preload.js`, `renderer/`
- `pear-runtime` npm package embedded as a library
- `pear.run(workerPath)` spawns Bare workers for P2P networking
- Workers communicate via `Bare.IPC` ↔ `worker.on('message')` ↔ Electron IPC ↔ renderer
- Build platform-specific distributables with Electron Forge

**This is the pattern used by:**
- **Keet** - the flagship Pear/Holepunch app (production, millions of users)
- **hello-pear-electron** - official boilerplate at github.com/holepunchto/hello-pear-electron
- Any Pear app that needs standalone desktop distribution

**Pros:**
- Standalone distribution (.dmg, .AppImage, .exe)
- Users don't need Pear runtime installed
- Full Electron capabilities (native menus, system tray, DevTools)
- P2P OTA updates via pear-runtime
- Bare workers handle P2P networking natively (Holepunch modules work perfectly in Bare)
- Electron handles the complex GUI (Three.js, DOM, CSS) without issues
- Well-tested architecture (Keet uses this in production)

**Cons:**
- Larger binary (~200MB vs ~5MB for native Pear)
- More IPC hops (renderer → preload → ipcMain → worker → Bare.IPC)
- Requires Electron binary download during npm install

**Why it broke for us previously:**
- Electron binary download failed (network/environment issue, NOT architectural)
- This is a transient install problem, not a fundamental issue

### Approach 3: Native Applings (Emerging - NOT READY)

Small native C binaries that bootstrap the Pear platform and launch apps. Used by `keet-appling-next`. Still in development, not recommended for new projects.

## Key Facts

1. **The Pear runtime IS Electron** - `pear-desktop` uses Electron internally via `pear-electron` and `electron-runtime`. When you run `pear run`, you're running Electron under the hood.

2. **`Pear.worker` is DEPRECATED** - The current ipc-bridge.js uses `Pear.worker.pipe()` which is deprecated in favor of `pear-run` + `pear-pipe` modules.

3. **Bare ≠ Node.js** - Bare is a minimal JS runtime. It does NOT have `process`, `fs`, `path`, `os`, or other Node.js built-ins. Only Holepunch ecosystem modules (corestore, hyperswarm, protomux, b4a) are designed for Bare.

4. **`pear run` has no standalone distribution** - The Pear docs explicitly state that distribution packages (.dmg, .msi, .appimage) are NOT supported for native Pear apps.

5. **Electron + pear-runtime is the production path** - The hello-pear-electron repo provides "end-to-end boilerplate for embedding pear-runtime into Electron apps" with full deployment pipeline.

## RECOMMENDATION: Revert to Electron + pear-runtime

**The original architecture was correct.** The migration to native `pear run` was a wrong turn.

### Why:
1. The Electron binary download failure was a transient issue, not architectural
2. Electron + pear-runtime is the pattern Keet (the flagship Pear app) uses in production
3. Our game has 25+ renderer modules with Three.js, DOM manipulation, CSS - this is exactly what Electron excels at
4. The Bare worker (workers/main.js) handles P2P networking perfectly - Holepunch modules are Bare-native
5. All the original Electron code still exists in the repo (electron/, workers/, renderer/)
6. Standalone distribution (.dmg, .AppImage) is only possible with Electron

### What to restore:
- `package.json` → Electron deps, `"main": "electron/main.js"`, forge scripts
- Use `electron/main.js` (already exists, correct)
- Use `electron/preload.js` (already exists, correct)
- Use `workers/main.js` (already exists, correct)
- Use `renderer/` directory with Electron ipc-bridge.js (already exists, correct)
- `npm install` to get Electron + pear-runtime + all deps

### Architecture Diagram:

```
┌──────────────────────────────────────────────────────┐
│                    Electron Main                      │
│                  (electron/main.js)                   │
│                                                       │
│  ┌─────────────┐     ┌──────────────────────────┐    │
│  │ pear-runtime │────▸│ Bare Worker               │    │
│  │  (library)   │     │ (workers/main.js)         │    │
│  └─────────────┘     │                            │    │
│                       │ • Corestore (persistence) │    │
│                       │ • Hyperswarm (discovery)  │    │
│                       │ • Protomux (7 channels)   │    │
│                       │ • Trade/Gift/Co-op/Help   │    │
│                       └────────────┬─────────────┘    │
│                            Bare.IPC│                   │
│                                    │                   │
│  ┌───────────────┐     ┌──────────┴──────────────┐   │
│  │ Preload Bridge │◀───▸│ ipcMain / ipcRenderer    │   │
│  │ (preload.js)   │     └──────────┬──────────────┘   │
│  └───────┬───────┘                 │                   │
│          │ contextBridge           │                   │
│  ┌───────┴──────────────────────────────────────┐    │
│  │              Renderer (Chromium)               │    │
│  │                                                │    │
│  │  renderer/index.html                           │    │
│  │  renderer/app.js (game loop, Three.js)        │    │
│  │  renderer/js/ipc-bridge.js (wraps preload)    │    │
│  │  renderer/js/*.js (25+ game modules)          │    │
│  │  renderer/css/style.css                       │    │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### IPC Flow:
```
Renderer (IPCBridge.sendToWorker)
  → window.bridge.writeWorkerIPC(path, JSON)
  → preload: ipcRenderer.invoke('pear:worker:writeIPC', path, JSON)
  → main: ipcMain.handle → worker.send(JSON)
  → worker: Bare.IPC.on('data') → parse → handle

Worker (send(msg))
  → Bare.IPC.write(JSON.stringify(msg))
  → main: worker.on('message') → webContents.send()
  → preload: ipcRenderer.on() → callback
  → renderer: IPCBridge._routeMessage → listeners
```
