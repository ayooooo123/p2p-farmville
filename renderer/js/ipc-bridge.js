const DEFAULT_IPC_URL = 'ws://localhost:50002';
const BUNDLE_BASE_URL = new URL('../', import.meta.url);

function resolveRendererAssetUrl(relativePath) {
  const normalizedPath = String(relativePath ?? '').replace(/^\/+/, '');
  return new URL(normalizedPath, BUNDLE_BASE_URL).href;
}

function dispatchToTarget(target, eventName, detail) {
  if (!target || typeof target.dispatchEvent !== 'function') return;
  try {
    target.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch {}
}

function dispatchWorkerEvent(message) {
  const type = message?.type;
  const action = message?.action;
  const targets = [globalThis];

  if (typeof window !== 'undefined') targets.push(window);
  if (typeof document !== 'undefined') targets.push(document);

  const eventNames = new Set();

  if (type) {
    eventNames.add('p2p-farmville:ipc-message');
    eventNames.add(`p2p-farmville:${type}`);
  }

  if (type === 'farm-update') {
    eventNames.add('p2p-farmville:farm-update');
  }

  if (type === 'worker:ready') {
    eventNames.add('p2p-farmville:worker-ready');
  }

  if (type === 'visitor-farm-action') {
    eventNames.add('p2p-farmville:action-request');
    eventNames.add('p2p-farmville:farm-action-request');
    if (action) {
      eventNames.add(`p2p-farmville:action-request:${action}`);
      eventNames.add(`p2p-farmville:farm-action-request:${action}`);
    }
  }

  if (type === 'farm-action-result') {
    eventNames.add('p2p-farmville:action-confirmation');
    eventNames.add('p2p-farmville:farm-action-result');
    eventNames.add('p2p-farmville:farm-action-confirmation');
    if (action) {
      eventNames.add(`p2p-farmville:action-confirmation:${action}`);
      eventNames.add(`p2p-farmville:farm-action-result:${action}`);
      eventNames.add(`p2p-farmville:farm-action-confirmation:${action}`);
    }
  }

  for (const eventName of eventNames) {
    for (const target of targets) {
      dispatchToTarget(target, eventName, message);
    }
  }
}

function decodeMessageData(data) {
  if (typeof data === 'string') {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }

  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  }

  return '';
}

function createWebSocketBridge(url = DEFAULT_IPC_URL) {
  const listeners = new Set();
  const pendingOutbound = [];
  let socket = null;
  let ready = false;
  let closed = false;

  const notify = (message) => {
    for (const listener of listeners) {
      try {
        listener(message);
      } catch {}
    }

    dispatchWorkerEvent(message);
  };

  const sendSerialized = (serialized) => {
    if (!socket || !ready || socket.readyState !== WebSocket.OPEN) {
      pendingOutbound.push(serialized);
      return;
    }

    try {
      socket.send(serialized);
    } catch (error) {
      console.error('[ipc-bridge] send failed', error);
    }
  };

  const connect = () => {
    if (closed) return;

    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';

    socket.addEventListener('open', () => {
      ready = true;
      while (pendingOutbound.length > 0 && socket && socket.readyState === WebSocket.OPEN) {
        const chunk = pendingOutbound.shift();
        if (typeof chunk === 'string') {
          socket.send(chunk);
        }
      }
      dispatchWorkerEvent({ type: 'worker:ready', url });
    });

    socket.addEventListener('message', (event) => {
      const raw = decodeMessageData(event.data);
      if (!raw) return;

      let message = raw;
      try {
        message = JSON.parse(raw);
      } catch {}

      notify(message);
    });

    socket.addEventListener('error', (event) => {
      console.error('[ipc-bridge] websocket error', event?.error ?? event);
      dispatchWorkerEvent({ type: 'ipc:error', error: String(event?.error ?? 'WebSocket error') });
    });

    socket.addEventListener('close', () => {
      ready = false;
      if (!closed) {
        dispatchWorkerEvent({ type: 'ipc:closed' });
      }
    });
  };

  connect();

  const bridge = {
    url,
    send(payload) {
      const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
      sendSerialized(serialized);
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      closed = true;
      ready = false;
      try {
        socket?.close();
      } catch {}
    },
    get ready() {
      return ready;
    },
  };

  try {
    globalThis.__P2P_FARMVILLE_IPC__ = bridge;
    globalThis.__P2P_FARMVILLE_RESOLVE_ASSET__ = resolveRendererAssetUrl;
    if (typeof window !== 'undefined') {
      window.__P2P_FARMVILLE_IPC__ = bridge;
      window.__P2P_FARMVILLE_RESOLVE_ASSET__ = resolveRendererAssetUrl;
    }
  } catch {}

  return bridge;
}

const defaultBridge = typeof WebSocket !== 'undefined' ? createWebSocketBridge() : {
  url: DEFAULT_IPC_URL,
  send() {},
  onMessage() { return () => {}; },
  close() {},
  ready: false,
};

export default defaultBridge;
export const sendToWorker = (payload) => defaultBridge.send(payload);
export const onWorkerMessage = (listener) => defaultBridge.onMessage(listener);
export { resolveRendererAssetUrl };
