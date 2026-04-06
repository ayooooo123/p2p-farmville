/**
 * P2P FarmVille - Electrobun P2P Networking Module
 *
 * Adapted from workers/main.js (Bare worker) to run directly in Bun main process.
 * All P2P logic: Corestore, Hyperswarm, Protomux, social features.
 *
 * Uses callback-based IPC instead of Bare.IPC.
 */

import Corestore from "corestore";
import Hyperswarm from "hyperswarm";
import Protomux from "protomux";
import b4a from "b4a";
import crypto from "hypercore-crypto";
import { join } from "path";
import { homedir, platform } from "os";

const WORLD_TOPIC = "p2p-farmville-world-v1";
const ANNOUNCE_INTERVAL = 30000;
const NEIGHBOR_BROADCAST_INTERVAL = 5000;
const HELP_REQUEST_EXPIRY = 30 * 60 * 1000;
const DAILY_GIFT_LIMIT = 5;

// ── State ─────────────────────────────────────────────────────────────────
let storagePath = "";
let store: any = null;
let swarm: any = null;
let playerName = "";
let playerKey = ""; // hex of our public key
let initialized = false;

// Named Hypercores
let farmStateCore: any = null;
let worldRegistryCore: any = null;
let chatLogCore: any = null;

// Discovered neighbors
const neighbors = new Map();

// Connected peers
const peers = new Map();

let peerCount = 0;

// Social state
const pendingTrades = new Map();
let tradeIdCounter = 0;

let giftsSentToday = 0;
let giftDayKey = new Date().toDateString();

const coopMissions = new Map();
let coopIdCounter = 0;

const helpRequests = new Map();
let helpIdCounter = 0;

// ── Callback-based IPC (replaces Bare.IPC) ────────────────────────────────
type MessageHandler = (msg: any) => void;
let onMessage: MessageHandler | null = null;

function send(msg: any) {
  try {
    onMessage?.(msg);
  } catch (e: any) {
    console.error("[p2p] IPC send error:", e.message);
  }
}

function sendError(error: string) {
  send({ type: "error", error: String(error) });
}

// ── Protomux encoding ────────────────────────────────────────────────────
const rawEncoding = {
  preencode(state: any, m: any) {
    state.end += m.byteLength;
  },
  encode(state: any, m: any) {
    state.buffer.set(m, state.start);
    state.start += m.byteLength;
  },
  decode(state: any) {
    return state.buffer.subarray(state.start, state.end);
  },
};

// ── Storage path ─────────────────────────────────────────────────────────
function getStoragePath(appStorage?: string): string {
  if (appStorage) return appStorage;
  const base =
    process.env.APPDATA ||
    (platform() === "darwin"
      ? join(homedir(), "Library", "Application Support")
      : join(homedir(), ".local", "share"));
  return join(base, "p2p-farmville");
}

// ── Initialize Corestore + Hypercores ─────────────────────────────────────
async function initStore(): Promise<boolean> {
  try {
    store = new Corestore(storagePath);
    await store.ready();

    farmStateCore = store.get({ name: "farm-state" });
    await farmStateCore.ready();

    worldRegistryCore = store.get({ name: "world-registry" });
    await worldRegistryCore.ready();

    chatLogCore = store.get({ name: "chat-log" });
    await chatLogCore.ready();

    playerKey = b4a.toString(farmStateCore.key, "hex");

    console.log("[p2p] Corestore ready at:", storagePath);
    console.log("[p2p] Farm core key:", playerKey);

    return true;
  } catch (e: any) {
    console.error("[p2p] Corestore init error:", e.message);
    sendError("Failed to initialize storage: " + e.message);
    return false;
  }
}

// ── Initialize Hyperswarm ────────────────────────────────────────────────
async function initSwarm(): Promise<boolean> {
  try {
    swarm = new Hyperswarm();

    const topicBuffer = b4a.from(WORLD_TOPIC);
    const topicKey = crypto.discoveryKey(topicBuffer);

    swarm.on("connection", handleConnection);

    const discovery = swarm.join(topicKey, { server: true, client: true });
    await discovery.flushed();

    console.log("[p2p] Joined swarm on topic:", WORLD_TOPIC);

    return true;
  } catch (e: any) {
    console.error("[p2p] Swarm init error:", e.message);
    sendError("Failed to join swarm: " + e.message);
    return false;
  }
}

// ── Handle new peer connection ───────────────────────────────────────────
function handleConnection(stream: any) {
  try {
    const remoteKey = b4a.toString(stream.remotePublicKey, "hex");
    console.log("[p2p] Peer connected:", remoteKey.slice(0, 12) + "...");

    store.replicate(stream);

    const mux = Protomux.from(stream);

    // Farm sync channel
    const farmChannel = mux.createChannel({
      protocol: "farm-sync",
      id: b4a.from(playerKey, "hex"),
      onopen() {
        farmChannel.messages[0].send(
          b4a.from(
            JSON.stringify({
              type: "farm-key",
              key: playerKey,
              name: playerName,
              worldKey: b4a.toString(worldRegistryCore.key, "hex"),
              chatKey: b4a.toString(chatLogCore.key, "hex"),
            })
          )
        );
      },
    });

    farmChannel.addMessage({
      encoding: rawEncoding,
      onmessage(buf: any) {
        handleFarmMessage(remoteKey, buf);
      },
    });
    farmChannel.open();

    // World announce channel
    const worldChannel = mux.createChannel({
      protocol: "world-announce",
      id: b4a.from(WORLD_TOPIC),
      onopen() {
        broadcastAnnouncement(worldChannel);
      },
    });

    worldChannel.addMessage({
      encoding: rawEncoding,
      onmessage(buf: any) {
        handleWorldMessage(remoteKey, buf);
      },
    });
    worldChannel.open();

    // Chat channel
    const chatChannel = mux.createChannel({
      protocol: "chat",
      id: b4a.from("p2p-farmville-chat"),
      onopen() {
        const joinMsg = JSON.stringify({
          type: "system",
          message: playerName + " is online",
          fromKey: playerKey,
          playerName: playerName,
          timestamp: Date.now(),
        });
        chatChannel.messages[0].send(b4a.from(joinMsg));
      },
    });

    chatChannel.addMessage({
      encoding: rawEncoding,
      onmessage(buf: any) {
        handleChatMessage(remoteKey, buf);
      },
    });
    chatChannel.open();

    // Trade channel
    const tradeChannel = mux.createChannel({
      protocol: "trade",
      id: b4a.from("p2p-farmville-trade"),
    });

    tradeChannel.addMessage({
      encoding: rawEncoding,
      onmessage(buf: any) {
        handleTradeMessage(remoteKey, buf);
      },
    });
    tradeChannel.open();

    // Gift channel
    const giftChannel = mux.createChannel({
      protocol: "gift",
      id: b4a.from("p2p-farmville-gift"),
    });

    giftChannel.addMessage({
      encoding: rawEncoding,
      onmessage(buf: any) {
        handleGiftMessage(remoteKey, buf);
      },
    });
    giftChannel.open();

    // Co-op channel
    const coopChannel = mux.createChannel({
      protocol: "coop",
      id: b4a.from("p2p-farmville-coop"),
      onopen() {
        broadcastCoopList(coopChannel);
      },
    });

    coopChannel.addMessage({
      encoding: rawEncoding,
      onmessage(buf: any) {
        handleCoopMessage(remoteKey, buf);
      },
    });
    coopChannel.open();

    // Help channel
    const helpChannel = mux.createChannel({
      protocol: "help",
      id: b4a.from("p2p-farmville-help"),
    });

    helpChannel.addMessage({
      encoding: rawEncoding,
      onmessage(buf: any) {
        handleHelpMessage(remoteKey, buf);
      },
    });
    helpChannel.open();

    peers.set(remoteKey, {
      stream,
      mux,
      farmChannel,
      worldChannel,
      chatChannel,
      tradeChannel,
      giftChannel,
      coopChannel,
      helpChannel,
    });

    peerCount = peers.size;
    send({ type: "connected", count: peerCount });

    stream.on("close", () => {
      const neighbor = neighbors.get(remoteKey);
      const disconnectedName = neighbor ? neighbor.name : "Unknown";

      peers.delete(remoteKey);
      peerCount = peers.size;
      send({ type: "connected", count: peerCount });
      send({
        type: "player-left",
        playerName: disconnectedName,
        playerKey: remoteKey,
      });
      send({
        type: "chat-message",
        from: "System",
        fromKey: "system",
        message: disconnectedName + " went offline",
        timestamp: Date.now(),
        channel: "system",
      });
    });

    stream.on("error", (err: any) => {
      console.error(
        "[p2p] Stream error with",
        remoteKey.slice(0, 12),
        ":",
        err.message
      );
    });
  } catch (e: any) {
    console.error("[p2p] Connection handler error:", e.message);
  }
}

// ── Farm message handler ─────────────────────────────────────────────────
function handleFarmMessage(remoteKey: string, buf: any) {
  try {
    const msg = JSON.parse(b4a.toString(buf));

    if (msg.type === "farm-key") {
      const existing = neighbors.get(remoteKey) || {};
      neighbors.set(remoteKey, {
        ...existing,
        name: msg.name || "Unknown",
        key: msg.key,
        worldKey: msg.worldKey,
        chatKey: msg.chatKey,
        lastSeen: Date.now(),
      });

      if (msg.key) {
        try {
          const peerFarmCore = store.get(b4a.from(msg.key, "hex"));
          peerFarmCore.ready().then(() => {
            readPeerFarmState(remoteKey, peerFarmCore);
          }).catch((e: any) => console.error("[p2p] Peer farm core error:", e.message));
        } catch (e: any) {
          console.error("[p2p] Error getting peer farm core:", e.message);
        }
      }

      send({
        type: "player-joined",
        playerName: msg.name,
        playerKey: remoteKey,
      });
      send({
        type: "chat-message",
        from: "System",
        fromKey: "system",
        message: msg.name + " came online",
        timestamp: Date.now(),
        channel: "system",
      });

      broadcastNeighborList();
    } else if (msg.type === "farm-state") {
      const neighbor = neighbors.get(remoteKey);
      if (neighbor) {
        neighbor.farmState = msg.state;
        neighbor.lastSeen = Date.now();
        neighbors.set(remoteKey, neighbor);

        send({
          type: "farm-update",
          playerKey: remoteKey,
          farmState: msg.state,
        });

        broadcastNeighborList();
      }
    }
  } catch (e: any) {
    console.error("[p2p] Farm message parse error:", e.message);
  }
}

// ── World message handler ────────────────────────────────────────────────
function handleWorldMessage(remoteKey: string, buf: any) {
  try {
    const msg = JSON.parse(b4a.toString(buf));

    if (msg.type === "announce") {
      const existing = neighbors.get(remoteKey) || {};
      neighbors.set(remoteKey, {
        ...existing,
        name: msg.playerName || existing.name || "Unknown",
        key: msg.playerKey || remoteKey,
        position: msg.position || existing.position || { x: 0, z: 0 },
        farmCoreKey: msg.farmCoreKey,
        lastSeen: Date.now(),
      });
      broadcastNeighborList();
    }
  } catch (e: any) {
    console.error("[p2p] World message parse error:", e.message);
  }
}

// ── Chat message handler ─────────────────────────────────────────────────
function handleChatMessage(remoteKey: string, buf: any) {
  try {
    const msg = JSON.parse(b4a.toString(buf));

    if (
      msg.type === "chat" ||
      msg.type === "private" ||
      msg.type === "emote" ||
      msg.type === "system"
    ) {
      if (msg.type === "private" && msg.to !== playerKey) return;

      appendChatLog(msg.from || msg.playerName, msg.message, msg.timestamp);

      send({
        type: "chat-message",
        from: msg.from || msg.playerName || "Unknown",
        fromKey: msg.fromKey || remoteKey,
        message: msg.message,
        timestamp: msg.timestamp,
        channel:
          msg.type === "private"
            ? "private"
            : msg.type === "emote"
              ? "global"
              : msg.type === "system"
                ? "system"
                : "global",
      });
    }
  } catch (e: any) {
    console.error("[p2p] Chat message parse error:", e.message);
  }
}

// ── Trade message handler ────────────────────────────────────────────────
function handleTradeMessage(remoteKey: string, buf: any) {
  try {
    const msg = JSON.parse(b4a.toString(buf));

    switch (msg.type) {
      case "trade-offer": {
        if (msg.toKey !== playerKey) return;
        pendingTrades.set(msg.id, {
          id: msg.id,
          from: msg.from,
          fromKey: msg.fromKey,
          to: playerName,
          toKey: playerKey,
          items: msg.items,
          wants: msg.wants,
          status: "pending",
          timestamp: msg.timestamp,
        });
        send({ type: "trade-offer", trade: pendingTrades.get(msg.id) });
        break;
      }
      case "trade-accept": {
        const trade = pendingTrades.get(msg.tradeId);
        if (trade) {
          trade.status = "accepted";
          send({
            type: "trade-result",
            tradeId: msg.tradeId,
            accepted: true,
          });
          pendingTrades.delete(msg.tradeId);
        }
        break;
      }
      case "trade-reject": {
        const trade = pendingTrades.get(msg.tradeId);
        if (trade) {
          trade.status = "rejected";
          send({
            type: "trade-result",
            tradeId: msg.tradeId,
            accepted: false,
          });
          pendingTrades.delete(msg.tradeId);
        }
        break;
      }
      case "trade-cancel": {
        const trade = pendingTrades.get(msg.tradeId);
        if (trade) {
          send({
            type: "trade-cancelled",
            tradeId: msg.tradeId,
          });
          pendingTrades.delete(msg.tradeId);
        }
        break;
      }
    }
  } catch (e: any) {
    console.error("[p2p] Trade message parse error:", e.message);
  }
}

// ── Gift message handler ─────────────────────────────────────────────────
function handleGiftMessage(remoteKey: string, buf: any) {
  try {
    const msg = JSON.parse(b4a.toString(buf));

    if (msg.type === "gift-send" && msg.toKey === playerKey) {
      send({
        type: "gift-received",
        from: msg.from,
        fromKey: msg.fromKey,
        items: msg.items,
        message: msg.message,
      });
    } else if (msg.type === "gift-ack" && msg.toKey === playerKey) {
      send({
        type: "gift-sent",
        remaining: DAILY_GIFT_LIMIT - giftsSentToday,
      });
    }
  } catch (e: any) {
    console.error("[p2p] Gift message parse error:", e.message);
  }
}

// ── Co-op message handler ────────────────────────────────────────────────
function handleCoopMessage(remoteKey: string, buf: any) {
  try {
    const msg = JSON.parse(b4a.toString(buf));

    if (msg.type === "coop-create") {
      coopMissions.set(msg.missionId, {
        missionId: msg.missionId,
        cropType: msg.cropType,
        targetQty: msg.targetQty,
        currentQty: 0,
        contributors: [],
        reward: msg.reward,
        creatorKey: msg.creatorKey,
        creatorName: msg.creatorName,
        status: "active",
      });
      broadcastNeighborList();
    } else if (msg.type === "coop-contribute") {
      const mission = coopMissions.get(msg.missionId);
      if (mission && mission.status === "active") {
        mission.currentQty += msg.amount;
        if (!mission.contributors.includes(msg.contributorKey)) {
          mission.contributors.push(msg.contributorKey);
        }
        if (mission.currentQty >= mission.targetQty) {
          mission.status = "completed";
          mission.completedAt = Date.now();
        }
      }
      broadcastNeighborList();
    } else if (msg.type === "coop-list") {
      // Incoming mission list from another peer - merge
      for (const m of msg.missions || []) {
        if (!coopMissions.has(m.missionId)) {
          coopMissions.set(m.missionId, m);
        }
      }
    }
  } catch (e: any) {
    console.error("[p2p] Co-op message parse error:", e.message);
  }
}

// ── Help message handler ─────────────────────────────────────────────────
function handleHelpMessage(remoteKey: string, buf: any) {
  try {
    const msg = JSON.parse(b4a.toString(buf));

    if (msg.type === "help-request") {
      helpRequests.set(msg.requestId, {
        requestId: msg.requestId,
        playerKey: msg.playerKey,
        playerName: msg.playerName,
        helpType: msg.helpType,
        plotId: msg.plotId,
        timestamp: msg.timestamp,
        responded: false,
      });
      send({ type: "help-request", request: helpRequests.get(msg.requestId) });
    } else if (msg.type === "help-response") {
      const req = helpRequests.get(msg.requestId);
      if (req) {
        req.responded = true;
        send({
          type: "help-response",
          requestId: msg.requestId,
          responderKey: msg.responderKey,
          responderName: msg.responderName,
        });
      }
    }
  } catch (e: any) {
    console.error("[p2p] Help message parse error:", e.message);
  }
}

// ── Broadcast functions ──────────────────────────────────────────────────
function broadcastNeighborList() {
  const neighborArr = Array.from(neighbors.entries()).map(([key, n]) => ({
    key,
    name: n.name || "Unknown",
    position: n.position || { x: 0, z: 0 },
    farmState: n.farmState || null,
    lastSeen: n.lastSeen,
  }));
  send({ type: "neighbors", neighbors: neighborArr });
}

function broadcastAnnouncement(channel: any) {
  const announcement = JSON.stringify({
    type: "announce",
    playerKey: playerKey,
    playerName: playerName,
    farmCoreKey: playerKey,
    position: getMyPosition(),
    timestamp: Date.now(),
  });
  try {
    channel.messages[0].send(b4a.from(announcement));
  } catch (e: any) {
    console.error("[p2p] Announcement error:", e.message);
  }
}

function broadcastFarmState(farmState: any) {
  for (const [key, peer] of peers) {
    try {
      if (peer.farmChannel && peer.farmChannel.opened) {
        peer.farmChannel.messages[0].send(
          b4a.from(
            JSON.stringify({ type: "farm-state", state: farmState })
          )
        );
      }
    } catch (e: any) {
      console.error("[p2p] Farm broadcast error to", key.slice(0, 12), ":", e.message);
    }
  }
}

function broadcastChatMessage(
  message: string,
  type: string,
  targetKey?: string
) {
  const chatMsg = JSON.stringify({
    type: type,
    from: playerName,
    fromKey: playerKey,
    message: message,
    to: targetKey || null,
    timestamp: Date.now(),
  });

  for (const [key, peer] of peers) {
    try {
      if (peer.chatChannel && peer.chatChannel.opened) {
        peer.chatChannel.messages[0].send(b4a.from(chatMsg));
      }
    } catch (e: any) {
      console.error("[p2p] Chat broadcast error to", key.slice(0, 12), ":", e.message);
    }
  }
}

function broadcastCoopList(channel: any) {
  const missions = Array.from(coopMissions.values()).filter(
    (m) => m.status === "active"
  );
  try {
    channel.messages[0].send(
      b4a.from(JSON.stringify({ type: "coop-list", missions }))
    );
  } catch (e: any) {
    console.error("[p2p] Co-op list broadcast error:", e.message);
  }
}

// ── Trade helpers ────────────────────────────────────────────────────────
function sendTradeOffer(
  targetKey: string,
  items: any[],
  wants: any[]
) {
  const peer = peers.get(targetKey);
  if (!peer || !peer.tradeChannel || !peer.tradeChannel.opened) {
    sendError("Target player not connected for trade");
    return;
  }

  const id = ++tradeIdCounter;
  pendingTrades.set(id, {
    id,
    from: playerName,
    fromKey: playerKey,
    to: (neighbors.get(targetKey) || {}).name || "Unknown",
    toKey: targetKey,
    items,
    wants,
    status: "pending",
    timestamp: Date.now(),
  });

  peer.tradeChannel.messages[0].send(
    b4a.from(
      JSON.stringify({
        type: "trade-offer",
        id,
        from: playerName,
        fromKey: playerKey,
        toKey: targetKey,
        items,
        wants,
        timestamp: Date.now(),
      })
    )
  );

  send({ type: "trade-offer", trade: pendingTrades.get(id) });
}

function respondToTrade(tradeId: number, accept: boolean) {
  const trade = pendingTrades.get(tradeId);
  if (!trade) return;

  const peer = peers.get(trade.fromKey || trade.toKey);
  if (!peer || !peer.tradeChannel || !peer.tradeChannel.opened) return;

  peer.tradeChannel.messages[0].send(
    b4a.from(
      JSON.stringify({
        type: accept ? "trade-accept" : "trade-reject",
        tradeId,
      })
    )
  );

  trade.status = accept ? "accepted" : "rejected";
  send({
    type: "trade-result",
    tradeId,
    accepted: accept,
  });
  pendingTrades.delete(tradeId);
}

function cancelTrade(tradeId: number) {
  const trade = pendingTrades.get(tradeId);
  if (!trade) return;

  const peer = peers.get(trade.fromKey || trade.toKey);
  if (peer && peer.tradeChannel && peer.tradeChannel.opened) {
    peer.tradeChannel.messages[0].send(
      b4a.from(
        JSON.stringify({ type: "trade-cancel", tradeId })
      )
    );
  }

  send({ type: "trade-cancelled", tradeId });
  pendingTrades.delete(tradeId);
}

// ── Gift helpers ─────────────────────────────────────────────────────────
function doSendGift(
  targetKey: string,
  items: any[],
  message: string
) {
  // Check daily limit
  const today = new Date().toDateString();
  if (giftDayKey !== today) {
    giftsSentToday = 0;
    giftDayKey = today;
  }
  if (giftsSentToday >= DAILY_GIFT_LIMIT) {
    sendError("Daily gift limit reached (" + DAILY_GIFT_LIMIT + ")");
    return;
  }

  const peer = peers.get(targetKey);
  if (!peer || !peer.giftChannel || !peer.giftChannel.opened) {
    sendError("Target player not connected for gifting");
    return;
  }

  peer.giftChannel.messages[0].send(
    b4a.from(
      JSON.stringify({
        type: "gift-send",
        from: playerName,
        fromKey: playerKey,
        toKey: targetKey,
        items,
        message,
        timestamp: Date.now(),
      })
    )
  );

  giftsSentToday++;
  send({
    type: "gift-sent",
    remaining: DAILY_GIFT_LIMIT - giftsSentToday,
  });
}

// ── Co-op helpers ────────────────────────────────────────────────────────
function createCoopMission(
  cropType: string,
  targetQty: number,
  reward: number
) {
  const missionId = ++coopIdCounter;
  const mission = {
    missionId,
    cropType,
    targetQty,
    currentQty: 0,
    contributors: [],
    reward,
    creatorKey: playerKey,
    creatorName: playerName,
    status: "active" as string,
  };
  coopMissions.set(missionId, mission);

  // Broadcast to all peers
  for (const [, peer] of peers) {
    if (peer.coopChannel && peer.coopChannel.opened) {
      peer.coopChannel.messages[0].send(
        b4a.from(
          JSON.stringify({
            type: "coop-create",
            ...mission,
          })
        )
      );
    }
  }
}

function contributeToCoopMission(missionId: number, amount: number) {
  const mission = coopMissions.get(missionId);
  if (!mission || mission.status !== "active") return;

  mission.currentQty += amount;
  if (!mission.contributors.includes(playerKey)) {
    mission.contributors.push(playerKey);
  }
  if (mission.currentQty >= mission.targetQty) {
    mission.status = "completed";
    (mission as any).completedAt = Date.now();
  }

  for (const [, peer] of peers) {
    if (peer.coopChannel && peer.coopChannel.opened) {
      peer.coopChannel.messages[0].send(
        b4a.from(
          JSON.stringify({
            type: "coop-contribute",
            missionId,
            amount,
            contributorKey: playerKey,
            contributorName: playerName,
          })
        )
      );
    }
  }

  broadcastNeighborList();
}

// ── Help helpers ─────────────────────────────────────────────────────────
function requestHelp(helpType: string, plotId: string) {
  const requestId = ++helpIdCounter;
  const req = {
    requestId,
    playerKey,
    playerName,
    helpType,
    plotId,
    timestamp: Date.now(),
    responded: false,
  };
  helpRequests.set(requestId, req);

  for (const [, peer] of peers) {
    if (peer.helpChannel && peer.helpChannel.opened) {
      peer.helpChannel.messages[0].send(
        b4a.from(
          JSON.stringify({ type: "help-request", ...req })
        )
      );
    }
  }
}

function respondToHelp(requestId: number) {
  const req = helpRequests.get(requestId);
  if (!req || req.responded) return;

  const peer = peers.get(req.playerKey);
  if (!peer || !peer.helpChannel || !peer.helpChannel.opened) return;

  peer.helpChannel.messages[0].send(
    b4a.from(
      JSON.stringify({
        type: "help-response",
        requestId,
        responderKey: playerKey,
        responderName: playerName,
      })
    )
  );

  req.responded = true;
}

// ── Persistence ──────────────────────────────────────────────────────────
async function persistFarmState(farmState: any) {
  if (!farmStateCore) return;
  try {
    await farmStateCore.append(b4a.from(JSON.stringify(farmState)));
  } catch (e: any) {
    console.error("[p2p] Farm persist error:", e.message);
  }
}

async function appendChatLog(
  from: string,
  message: string,
  timestamp?: number
) {
  if (!chatLogCore) return;
  try {
    await chatLogCore.append(
      b4a.from(
        JSON.stringify({
          from,
          message,
          timestamp: timestamp || Date.now(),
        })
      )
    );
  } catch (e: any) {
    console.error("[p2p] Chat log error:", e.message);
  }
}

function readPeerFarmState(remoteKey: string, core: any) {
  try {
    core
      .createReadStream({ live: true })
      .on("data", (data: any) => {
        try {
          const state = JSON.parse(b4a.toString(data));
          const neighbor = neighbors.get(remoteKey);
          if (neighbor) {
            neighbor.farmState = state;
            neighbor.lastSeen = Date.now();
            neighbors.set(remoteKey, neighbor);
            send({
              type: "farm-update",
              playerKey: remoteKey,
              farmState: state,
            });
          }
        } catch (e: any) {
          console.error("[p2p] Peer farm parse error:", e.message);
        }
      });
  } catch (e: any) {
    console.error("[p2p] Read peer farm error:", e.message);
  }
}

function getMyPosition() {
  // Derive a deterministic position from player key
  const hash = playerKey.slice(0, 8);
  const x = (parseInt(hash.slice(0, 4), 16) % 100) - 50;
  const z = (parseInt(hash.slice(4, 8), 16) % 100) - 50;
  return { x, z };
}

// ── Periodic tasks ───────────────────────────────────────────────────────
function startPeriodicTasks() {
  // Re-announce every 30s
  setInterval(() => {
    if (initialized) {
      for (const [, peer] of peers) {
        if (peer.worldChannel && peer.worldChannel.opened) {
          broadcastAnnouncement(peer.worldChannel);
        }
      }
    }
  }, ANNOUNCE_INTERVAL);

  // Send neighbor list every 5s
  setInterval(() => {
    if (initialized) {
      broadcastNeighborList();
    }
  }, NEIGHBOR_BROADCAST_INTERVAL);

  // Clean up stale data
  setInterval(() => {
    const now = Date.now();
    for (const [key, neighbor] of neighbors) {
      if (now - (neighbor as any).lastSeen > 120000) {
        neighbors.delete(key);
      }
    }
    for (const [id, req] of helpRequests) {
      if (now - (req as any).timestamp > HELP_REQUEST_EXPIRY) {
        helpRequests.delete(id);
      }
    }
    for (const [id, m] of coopMissions) {
      if (
        (m as any).status === "completed" &&
        now - ((m as any).completedAt || 0) > 300000
      ) {
        coopMissions.delete(id);
      }
    }
    if (initialized) broadcastNeighborList();
  }, 60000);
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Handle an incoming message from the renderer.
 * Maps to the old Bare.IPC.on('data', ...) handler.
 */
export async function handleMessage(data: any) {
  try {
    switch (data.type) {
      case "init":
      case "farm:init": {
        playerName = data.playerName || data.farmName || "Farmer";
        console.log("[p2p] Player initialized:", playerName);

        if (!initialized) {
          const storeOk = await initStore();
          if (!storeOk) return;

          const swarmOk = await initSwarm();
          if (!swarmOk) return;

          initialized = true;
          startPeriodicTasks();

          send({
            type: "initialized",
            playerKey: playerKey,
            playerName: playerName,
          });

          console.log("[p2p] P2P engine fully initialized");
        }

        if (worldRegistryCore) {
          const announcement = JSON.stringify({
            type: "announce",
            playerKey: playerKey,
            playerName: playerName,
            farmCoreKey: playerKey,
            position: getMyPosition(),
            timestamp: Date.now(),
          });
          await worldRegistryCore.append(b4a.from(announcement));
        }
        break;
      }

      case "update-farm": {
        if (!initialized) return;
        if (!data.farmState) return;
        await persistFarmState(data.farmState);
        broadcastFarmState(data.farmState);
        break;
      }

      case "chat": {
        if (!initialized) return;
        if (!data.message) return;
        await appendChatLog(playerName, data.message);
        broadcastChatMessage(data.message, "chat");
        send({
          type: "chat-message",
          from: playerName,
          fromKey: playerKey,
          message: data.message,
          timestamp: Date.now(),
          channel: "global",
        });
        break;
      }

      case "chat-private": {
        if (!initialized) return;
        if (!data.targetKey || !data.message) return;
        const neighbor = neighbors.get(data.targetKey);
        broadcastChatMessage(data.message, "private", data.targetKey);
        send({
          type: "chat-message",
          from: playerName,
          fromKey: playerKey,
          message: data.message,
          timestamp: Date.now(),
          channel: "private",
          to: neighbor ? (neighbor as any).name : "Unknown",
        });
        break;
      }

      case "chat-emote": {
        if (!initialized) return;
        if (!data.emote) return;
        const emoteMsg = playerName + " " + data.emote;
        broadcastChatMessage(emoteMsg, "emote");
        send({
          type: "chat-message",
          from: playerName,
          fromKey: playerKey,
          message: emoteMsg,
          timestamp: Date.now(),
          channel: "global",
        });
        break;
      }

      case "trade-offer": {
        if (!initialized) return;
        sendTradeOffer(data.targetKey, data.items, data.wants);
        break;
      }

      case "trade-respond": {
        if (!initialized) return;
        respondToTrade(data.tradeId, data.accept);
        break;
      }

      case "trade-cancel": {
        if (!initialized) return;
        cancelTrade(data.tradeId);
        break;
      }

      case "send-gift": {
        if (!initialized) return;
        doSendGift(data.targetKey, data.items, data.message);
        break;
      }

      case "create-coop": {
        if (!initialized) return;
        createCoopMission(data.cropType, data.targetQty, data.reward);
        break;
      }

      case "contribute-coop": {
        if (!initialized) return;
        contributeToCoopMission(data.missionId, data.amount);
        break;
      }

      case "request-help": {
        if (!initialized) return;
        requestHelp(data.helpType, data.plotId);
        break;
      }

      case "respond-help": {
        if (!initialized) return;
        respondToHelp(data.requestId);
        break;
      }

      default:
        console.log("[p2p] Unknown message type:", data.type);
    }
  } catch (e: any) {
    console.error("[p2p] Handler error:", e.message);
    sendError("Worker error: " + e.message);
  }
}

/**
 * Initialize the P2P module and set up the callback for sending messages to the renderer.
 */
export function init(
  storageDir?: string,
  messageCallback?: MessageHandler
) {
  storagePath = getStoragePath(storageDir);
  onMessage = messageCallback || null;
  console.log("[p2p] Module initialized, storage:", storagePath);
}

/**
 * Gracefully shut down the P2P module.
 */
export async function shutdown() {
  if (swarm) {
    try {
      await swarm.destroy();
    } catch (e: any) {
      console.error("[p2p] Swarm shutdown error:", e.message);
    }
  }
  if (store) {
    try {
      await store.close();
    } catch (e: any) {
      console.error("[p2p] Store shutdown error:", e.message);
    }
  }
  initialized = false;
  console.log("[p2p] Shutdown complete");
}

export function getPlayerKey(): string {
  return playerKey;
}

export function isInitialized(): boolean {
  return initialized;
}
