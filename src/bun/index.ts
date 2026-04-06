// P2P FarmVille - Electrobun Main Process
// Creates BrowserWindow, initializes P2P module directly (no worker spawn),
// and bridges P2P callbacks to the renderer via typed RPC.

import Electrobun, { BrowserWindow, BrowserView } from "electrobun/bun";
import type { FarmvilleRPC } from "../shared/rpc-types";
import {
  init as initP2P,
  handleMessage,
  shutdown as shutdownP2P,
} from "./p2p";

const APP_NAME = "P2P FarmVille";
let mainWindow: any = null;
let rendererReady = false;

// ── RPC definition: bun-side handlers (called by browser) ───────────────────
const gameRPC = BrowserView.defineRPC<FarmvilleRPC>({
  maxRequestTime: 10000,
  handlers: {
    requests: {
      viewReady: async () => {
        rendererReady = true;
        console.log("[main] Renderer is ready");
        return { ok: true };
      },
    },
    messages: {
      p2pMessage: ({ type, ...rest }) => {
        if (!rendererReady) {
          console.warn("[main] Renderer not ready, dropping p2p message");
          return;
        }
        handleMessage({ type, ...rest });
      },
    },
  },
});

// ── Helper: send message from bun to renderer ──────────────────────────────
function sendToRenderer(msg: any) {
  if (!mainWindow) return;
  const view = mainWindow.webview;
  if (view?.rpc?.send) {
    view.rpc.send.onWorkerMessage(msg);
  }
}

// ── Create window ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    url: "views://game/index.html",
    frame: {
      width: 1280,
      height: 800,
    },
    rpc: gameRPC,
  });

  mainWindow.on("close", () => {
    shutdownP2P().catch((e) => console.error("[main] Shutdown error:", e));
    mainWindow = null;
    rendererReady = false;
    if (process.platform !== "darwin") {
      process.exit(0);
    }
  });
}

// ── App lifecycle ───────────────────────────────────────────────────────────
// Electrobun has no "ready" event — the main process runs immediately.
// Initialize P2P and create the window at top level.

initP2P(undefined, (msg) => {
  sendToRenderer(msg);
  if (msg.type === "error") {
    const view = mainWindow?.webview;
    if (view?.rpc?.send) {
      view.rpc.send.onWorkerStderr({ data: String(msg.error) });
    }
  }
});

createWindow();

// Re-create window when app is reactivated (macOS dock click)
Electrobun.events.on("reopen", () => {
  if (!mainWindow) {
    createWindow();
  }
});
