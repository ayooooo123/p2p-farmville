const electrobunTransport = globalThis.window?.__electrobunBunBridge || globalThis.window?.__rpc || null;
const rpcMessageListeners = new Set();

console.log('[ipc-bridge] script loaded', { hasElectrobunTransport: !!electrobunTransport, hasElectronBridge: !!window.ElectronIPCBridge })

function postToBun(packet) {
  if (typeof electrobunTransport?.postMessage === 'function') {
    electrobunTransport.postMessage(packet);
    return true;
  }
  if (typeof electrobunTransport?.send === 'function') {
    electrobunTransport.send(packet);
    return true;
  }
  return false;
}

if (electrobunTransport && !window.ElectronIPCBridge) {
  const previousReceive = window.__electrobun?.receiveMessageFromBun;
  window.__electrobun = window.__electrobun || {};
  window.__electrobun.receiveMessageFromBun = (msg) => {
    try {
      previousReceive?.(msg);
    } finally {
      for (const listener of rpcMessageListeners) {
        try {
          listener(msg);
        } catch (error) {
          console.error('[ipc-bridge] listener error:', error);
        }
      }
    }
  };

  window.ElectronIPCBridge = {
    send(msg) {
      console.log('[ipc-bridge] ElectronIPCBridge.send', msg?.type || msg);
      postToBun(JSON.stringify({ type: 'message', id: 'to-worker', payload: msg }));
    },
    onMessage(cb) {
      rpcMessageListeners.add(cb);
      return cb;
    }
  };
}

const listeners = {
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
  visitorFarmAction: [],
  farmActionResult: []
};

function emit(key, data) {
  for (const callback of listeners[key]) {
    try {
      callback(data);
    } catch (error) {
      console.error('[ipc-bridge]', key, 'listener error:', error);
    }
  }
}

const IPCBridge = {
  available: typeof window !== 'undefined' && (!!window.ElectronIPCBridge || !!electrobunTransport),

  _listeners: listeners,

  _emitWorkerStdout(data) {
    console.log('[ipc-bridge] worker stdout:', String(data).trimEnd());
  },

  _emitWorkerStderr(data) {
    console.warn('[ipc-bridge] worker stderr:', String(data).trimEnd());
  },

  _emitWorkerExit(code) {
    console.log('[ipc-bridge] worker exited with code:', code);
  },

  _emitWorkerMessage(data) {
    try {
      const msg = typeof data === 'string' ? JSON.parse(data) : data;
      this._routeMessage(msg);
    } catch (error) {
      console.warn('[ipc-bridge] failed to parse worker message:', error);
    }
  },

  startWorker() {
    if (window.ElectronIPCBridge) {
      window.ElectronIPCBridge.onMessage((msg) => this._routeMessage(msg));
      return Promise.resolve({ ok: true });
    }
    if (!electrobunTransport) {
      console.warn('[ipc-bridge] no IPC transport available');
      return Promise.resolve({ ok: false });
    }
    return Promise.resolve({ ok: true });
  },

  sendToWorker(msg) {
    console.log('[ipc-bridge] sendToWorker', msg?.type || msg);
    if (window.ElectronIPCBridge) {
      console.log('[ipc-bridge] sendToWorker via ElectronIPCBridge');
      window.ElectronIPCBridge.send(msg);
      return;
    }
    if (!electrobunTransport) {
      console.warn('[ipc-bridge] sendToWorker aborted - no transport available');
      return;
    }
    const data = typeof msg === 'string' ? msg : JSON.stringify(msg);
    console.log('[ipc-bridge] sendToWorker via Electrobun transport', data);
    postToBun(JSON.stringify({ type: 'message', id: 'to-worker', payload: JSON.parse(data) }));
  },

  onWorkerMessage() {},
  onWorkerStdout() {},
  onWorkerStderr() {},
  onWorkerExit() {},

  initP2P(playerName) {
    console.log('[ipc-bridge] initP2P', playerName);
    const startPayload = { type: 'start-farming', playerName };
    this.sendToWorker(startPayload);
    this.sendToWorker({ type: 'init', playerName });
    console.log('[ipc-bridge] initP2P dispatched');
  },

  sendFarmUpdate(farmState) {
    this.sendToWorker({ type: 'update-farm', farmState });
  },

  sendChatMessage(message) {
    this.sendToWorker({ type: 'chat', message });
  },

  sendPrivateMessage(targetKey, message) {
    this.sendToWorker({ type: 'chat-private', targetKey, message });
  },

  sendEmote(emote) {
    this.sendToWorker({ type: 'chat-emote', emote });
  },

  sendTradeOffer(targetKey, items, wants) {
    this.sendToWorker({ type: 'trade-offer', targetKey, items, wants });
  },

  respondToTrade(tradeId, accept) {
    this.sendToWorker({ type: 'trade-respond', tradeId, accept });
  },

  cancelTrade(tradeId) {
    this.sendToWorker({ type: 'trade-cancel', tradeId });
  },

  sendGift(targetKey, items, message) {
    this.sendToWorker({ type: 'send-gift', targetKey, items, message });
  },

  createCoopMission(cropType, targetQty, reward) {
    this.sendToWorker({ type: 'create-coop', cropType, targetQty, reward });
  },

  contributeToCoopMission(missionId, amount) {
    this.sendToWorker({ type: 'contribute-coop', missionId, amount });
  },

  requestHelp(helpType, plotId) {
    this.sendToWorker({ type: 'request-help', helpType, plotId });
  },

  respondToHelp(requestId) {
    this.sendToWorker({ type: 'respond-help', requestId });
  },

  onNeighbors(callback) { listeners.neighbors.push(callback); },
  onChatMessage(callback) { listeners.chatMessage.push(callback); },
  onNeighborFarmUpdate(callback) { listeners.farmUpdate.push(callback); },
  onPeerCount(callback) { listeners.peerCount.push(callback); },
  onInitialized(callback) { listeners.initialized.push(callback); },
  onError(callback) { listeners.error.push(callback); },
  onTradeOffer(callback) { listeners.tradeOffer.push(callback); },
  onTradeResult(callback) { listeners.tradeResult.push(callback); },
  onTradeCancelled(callback) { listeners.tradeCancelled.push(callback); },
  onGiftReceived(callback) { listeners.giftReceived.push(callback); },
  onGiftSent(callback) { listeners.giftSent.push(callback); },
  onCoopUpdate(callback) { listeners.coopUpdate.push(callback); },
  onHelpRequest(callback) { listeners.helpRequest.push(callback); },
  onHelpResponse(callback) { listeners.helpResponse.push(callback); },
  onPlayerJoined(callback) { listeners.playerJoined.push(callback); },
  onPlayerLeft(callback) { listeners.playerLeft.push(callback); },
  onVisitorFarmAction(callback) { listeners.visitorFarmAction.push(callback); },
  onFarmActionResult(callback) { listeners.farmActionResult.push(callback); },

  _routeMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'neighbors':
        emit('neighbors', msg.neighbors);
        break;
      case 'chat-message':
        emit('chatMessage', {
          from: msg.from,
          fromKey: msg.fromKey,
          message: msg.message,
          timestamp: msg.timestamp,
          channel: msg.channel,
          to: msg.to
        });
        break;
      case 'farm-update':
        emit('farmUpdate', { playerKey: msg.playerKey, farmState: msg.farmState });
        break;
      case 'connected':
        emit('peerCount', msg.count);
        break;
      case 'initialized':
        emit('initialized', { playerKey: msg.playerKey, playerName: msg.playerName });
        break;
      case 'error':
        emit('error', msg.error);
        break;
      case 'trade-offer':
        emit('tradeOffer', msg.trade);
        break;
      case 'trade-result':
        emit('tradeResult', { tradeId: msg.tradeId, accepted: msg.accepted });
        break;
      case 'trade-cancelled':
        emit('tradeCancelled', { tradeId: msg.tradeId });
        break;
      case 'gift-received':
        emit('giftReceived', { from: msg.from, fromKey: msg.fromKey, items: msg.items, message: msg.message });
        break;
      case 'gift-sent':
        emit('giftSent', { remaining: msg.remaining });
        break;
      case 'coop-update':
        emit('coopUpdate', msg.missions);
        break;
      case 'help-request':
        emit('helpRequest', msg.request);
        break;
      case 'help-response':
        emit('helpResponse', { requestId: msg.requestId, responderKey: msg.responderKey, responderName: msg.responderName });
        break;
      case 'player-joined':
        emit('playerJoined', { playerName: msg.playerName, playerKey: msg.playerKey });
        break;
      case 'player-left':
        emit('playerLeft', { playerName: msg.playerName, playerKey: msg.playerKey });
        break;
      case 'visitor-farm-action':
        emit('visitorFarmAction', { action: msg.action, targetId: msg.targetId, visitorKey: msg.visitorKey, visitorName: msg.visitorName, timestamp: msg.timestamp });
        break;
      case 'farm-action-result':
        emit('farmActionResult', { action: msg.action, targetId: msg.targetId, success: msg.success, reason: msg.reason, reward: msg.reward });
        break;
    }
  }
};

window.IPCBridge = IPCBridge;
