import Protomux from 'protomux';
import cenc from 'compact-encoding';

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

  try {
    globalThis.dispatchEvent?.(new CustomEvent('p2p-farmville:ipc-message', { detail: message }));
  } catch {}
}

function createWebSocketTransport(socket) {
  const listeners = new Map();
  const pendingWrites = [];
  let destroyed = false;
  let opened = false;

  const emit = (event, ...args) => {
    const set = listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(...args);
      } catch {}
    }
  };

  const transport = {
    userData: null,
    destroyed: false,
    alloc(size) {
      return new Uint8Array(size);
    },
    on(event, listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
      return transport;
    },
    write(buffer) {
      if (destroyed) return false;
      if (opened && socket.readyState === WebSocket.OPEN) {
        socket.send(buffer);
      } else {
        pendingWrites.push(buffer);
      }
      return true;
    },
    pause() {},
    resume() {},
    end() {
      if (destroyed) return;
      destroyed = true;
      transport.destroyed = true;
      try {
        socket.close();
      } catch {}
      emit('end');
      emit('close');
    },
    destroy(err) {
      if (destroyed) return;
      destroyed = true;
      transport.destroyed = true;
      if (err) emit('error', err);
      try {
        socket.close();
      } catch {}
      emit('close');
    },
  };

  socket.addEventListener('open', () => {
    opened = true;
    while (pendingWrites.length > 0) {
      const chunk = pendingWrites.shift();
      if (chunk) socket.send(chunk);
    }
    emit('drain');
    emit('open');
  });

  socket.addEventListener('message', (event) => {
    const data = event.data;
    if (typeof data === 'string') {
      emit('data', new TextEncoder().encode(data));
      return;
    }

    if (data instanceof ArrayBuffer) {
      emit('data', new Uint8Array(data));
      return;
    }

    if (ArrayBuffer.isView(data)) {
      emit('data', new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      return;
    }

    emit('data', new Uint8Array());
  });

  socket.addEventListener('error', (event) => {
    emit('error', event.error ?? new Error('WebSocket error'));
  });

  socket.addEventListener('close', () => {
    destroyed = true;
    transport.destroyed = true;
    emit('end');
    emit('close');
  });

  return transport;
}

export function createIpcBridge(url = DEFAULT_IPC_URL) {
  const socket = new WebSocket(url);
  socket.binaryType = 'arraybuffer';

  const transport = createWebSocketTransport(socket);
  const mux = new Protomux(transport);
  const listeners = new Set();
  const pendingOutbound = [];
  let messagePort = null;

  const notify = (message) => {
    for (const listener of listeners) {
      try {
        listener(message);
      } catch {}
    }

    dispatchWorkerEvent(message);
  };

  const channel = mux.createChannel({
    protocol: 'farmville-ipc',
    onopen() {
      while (pendingOutbound.length > 0) {
        messagePort.send(pendingOutbound.shift());
      }
    },
  });

  messagePort = channel.addMessage({
    encoding: cenc.json,
    onmessage(message) {
      notify(message);
    },
  });

  channel.open();

  const bridge = {
    url,
    send(payload) {
      if (messagePort) {
        messagePort.send(payload);
        return;
      }

      pendingOutbound.push(payload);
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      try {
        transport.destroy();
      } catch {}
    },
    get ready() {
      return Boolean(messagePort);
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

const defaultBridge = typeof WebSocket !== 'undefined' ? createIpcBridge() : {
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
