/**
 * P2P FarmVille - View Entrypoint (Electroview RPC Bridge)
 *
 * Replaces renderer/js/ipc-bridge.js.
 * Sets up window.IPCBridge with the same interface, backed by Electroview RPC.
 * Loaded via views://game/index.js in the HTML before app.js runs.
 */

import { Electroview } from "electrobun/view";

// ── Message queue for pre-ready messages ─────────────────────────────────
// The P2P module may start sending events before the RPC bridge is fully up.
// We queue them and replay once ready.
const preReadyQueue: any[] = [];

// ── Electroview RPC ──────────────────────────────────────────────────────
// "bun" = functions we CALL on bun (browser -> bun)
// "webview" = functions bun CALLS on us (bun -> browser)
const rpc = Electroview.defineRPC({
  handlers: {
    requests: {
      // Bun can request things from us (unused for now)
    },
    messages: {
      // Bun pushes P2P events to us here
      onWorkerMessage: (msg: any) => {
        if (!ipcReady) {
          preReadyQueue.push(msg);
          return;
        }
        routeMessage(msg);
      },
      onWorkerStdout: (data: string) => {
        console.log("[worker stdout]", data);
      },
      onWorkerStderr: (data: string) => {
        console.error("[worker stderr]", data);
      },
    },
  },
});

const electrobun = new Electroview({ rpc });

// ── IPCBridge Implementation ─────────────────────────────────────────────
// Replicates the exact interface from renderer/js/ipc-bridge.js
// so all existing renderer code works without changes.

const _listeners: Record<string, Function[]> = {
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
  playerLeft: [],
};

let ipcReady = false;

const IPCBridge: any = {
  available: true,

  // ── Core transport ──────────────────────────────────────────────────

  startWorker() {
    // No-op in Electrobun — P2P runs in main process.
    // Signal ready so bun knows to start sending messages.
    electrobun.rpc.request.viewReady({}).catch(() => {});
    ipcReady = true;

    // Replay any queued messages
    for (const msg of preReadyQueue) {
      routeMessage(msg);
    }
    preReadyQueue.length = 0;

    return Promise.resolve({ ok: true });
  },

  sendToWorker(msg: any) {
    electrobun.rpc.send.p2pMessage(msg);
  },

  onWorkerMessage(cb: Function) {
    // Already handled via RPC message handler above, but allow
    // additional raw listeners for backward compat.
  },

  onWorkerStdout(cb: Function) {
    // Logs go to console via RPC handler
  },

  onWorkerStderr(cb: Function) {
    // Errors go to console via RPC handler
  },

  onWorkerExit(cb: Function) {
    // Worker never exits in this architecture
  },

  // ── P2P High-Level Methods ──────────────────────────────────────────

  initP2P(playerName: string) {
    this.sendToWorker({ type: "init", playerName });
  },

  sendFarmUpdate(farmState: any) {
    this.sendToWorker({ type: "update-farm", farmState });
  },

  // ── Chat Methods ────────────────────────────────────────────────────

  sendChatMessage(message: string) {
    this.sendToWorker({ type: "chat", message });
  },

  sendPrivateMessage(targetKey: string, message: string) {
    this.sendToWorker({ type: "chat-private", targetKey, message });
  },

  sendEmote(emote: string) {
    this.sendToWorker({ type: "chat-emote", emote });
  },

  // ── Trade Methods ───────────────────────────────────────────────────

  sendTradeOffer(targetKey: string, items: any[], wants: any[]) {
    this.sendToWorker({ type: "trade-offer", targetKey, items, wants });
  },

  respondToTrade(tradeId: number, accept: boolean) {
    this.sendToWorker({ type: "trade-respond", tradeId, accept });
  },

  cancelTrade(tradeId: number) {
    this.sendToWorker({ type: "trade-cancel", tradeId });
  },

  // ── Gift Methods ────────────────────────────────────────────────────

  sendGift(targetKey: string, items: any[], message: string) {
    this.sendToWorker({ type: "send-gift", targetKey, items, message });
  },

  // ── Co-op Methods ───────────────────────────────────────────────────

  createCoopMission(cropType: string, targetQty: number, reward: number) {
    this.sendToWorker({ type: "create-coop", cropType, targetQty, reward });
  },

  contributeToCoopMission(missionId: number, amount: number) {
    this.sendToWorker({ type: "contribute-coop", missionId, amount });
  },

  // ── Help Methods ────────────────────────────────────────────────────

  requestHelp(helpType: string, plotId: string) {
    this.sendToWorker({ type: "request-help", helpType, plotId });
  },

  respondToHelp(requestId: number) {
    this.sendToWorker({ type: "respond-help", requestId });
  },

  // ── Event Listeners ─────────────────────────────────────────────────

  onNeighbors(cb: Function) { _listeners.neighbors.push(cb) },
  onChatMessage(cb: Function) { _listeners.chatMessage.push(cb) },
  onNeighborFarmUpdate(cb: Function) { _listeners.farmUpdate.push(cb) },
  onPeerCount(cb: Function) { _listeners.peerCount.push(cb) },
  onInitialized(cb: Function) { _listeners.initialized.push(cb) },
  onError(cb: Function) { _listeners.error.push(cb) },
  onTradeOffer(cb: Function) { _listeners.tradeOffer.push(cb) },
  onTradeResult(cb: Function) { _listeners.tradeResult.push(cb) },
  onTradeCancelled(cb: Function) { _listeners.tradeCancelled.push(cb) },
  onGiftReceived(cb: Function) { _listeners.giftReceived.push(cb) },
  onGiftSent(cb: Function) { _listeners.giftSent.push(cb) },
  onCoopUpdate(cb: Function) { _listeners.coopUpdate.push(cb) },
  onHelpRequest(cb: Function) { _listeners.helpRequest.push(cb) },
  onHelpResponse(cb: Function) { _listeners.helpResponse.push(cb) },
  onPlayerJoined(cb: Function) { _listeners.playerJoined.push(cb) },
  onPlayerLeft(cb: Function) { _listeners.playerLeft.push(cb) },
};

// ── Internal message router ──────────────────────────────────────────────
// Same logic as the original ipc-bridge.js _routeMessage()

function fire(key: string, data: any) {
  for (const cb of _listeners[key]) {
    try {
      cb(data);
    } catch (e) {
      console.error("[ipc-bridge]", key, "listener error:", e);
    }
  }
}

function routeMessage(msg: any) {
  switch (msg.type) {
    case "neighbors":
      fire("neighbors", msg.neighbors);
      break;
    case "chat-message":
      fire("chatMessage", {
        from: msg.from,
        fromKey: msg.fromKey,
        message: msg.message,
        timestamp: msg.timestamp,
        channel: msg.channel,
        to: msg.to,
      });
      break;
    case "farm-update":
      fire("farmUpdate", { playerKey: msg.playerKey, farmState: msg.farmState });
      break;
    case "connected":
      fire("peerCount", msg.count);
      break;
    case "initialized":
      fire("initialized", { playerKey: msg.playerKey, playerName: msg.playerName });
      break;
    case "error":
      fire("error", msg.error);
      break;
    case "trade-offer":
      fire("tradeOffer", msg.trade);
      break;
    case "trade-result":
      fire("tradeResult", { tradeId: msg.tradeId, accepted: msg.accepted });
      break;
    case "trade-cancelled":
      fire("tradeCancelled", { tradeId: msg.tradeId });
      break;
    case "gift-received":
      fire("giftReceived", {
        from: msg.from,
        fromKey: msg.fromKey,
        items: msg.items,
        message: msg.message,
      });
      break;
    case "gift-sent":
      fire("giftSent", { remaining: msg.remaining });
      break;
    case "coop-update":
      fire("coopUpdate", msg.missions);
      break;
    case "help-request":
      fire("helpRequest", msg.request);
      break;
    case "help-response":
      fire("helpResponse", {
        requestId: msg.requestId,
        responderKey: msg.responderKey,
        responderName: msg.responderName,
      });
      break;
    case "player-joined":
      fire("playerJoined", { playerName: msg.playerName, playerKey: msg.playerKey });
      break;
    case "player-left":
      fire("playerLeft", { playerName: msg.playerName, playerKey: msg.playerKey });
      break;
  }
}

// ── Expose globally ──────────────────────────────────────────────────────
(window as any).IPCBridge = IPCBridge;
console.log("[bridge] Electroview IPCBridge ready");
