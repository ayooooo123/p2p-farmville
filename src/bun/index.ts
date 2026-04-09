import { BrowserWindow, BrowserView } from 'electrobun/bun';
import Protomux from 'protomux';
import cenc from 'compact-encoding';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP_NAME = 'p2p-farmville';
const APP_VERSION = '1.0.0';

type WorkerMessagePort = {
  send: (payload: unknown) => void;
};

type StreamListener = (...args: any[]) => void;

type WorkerTransport = {
  userData: unknown;
  destroyed: boolean;
  alloc: (size: number) => Uint8Array;
  on: (event: 'data' | 'drain' | 'end' | 'error' | 'close', listener: StreamListener) => WorkerTransport;
  write: (buffer: Uint8Array) => boolean;
  pause: () => void;
  resume: () => void;
  end: () => void;
  destroy: (err?: unknown) => void;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let workerTransport: WorkerTransport | null = null;
let workerMessage: WorkerMessagePort | null = null;
let rendererBridgeBound = false;

const appRPC = BrowserView.defineRPC({
  maxRequestTime: 30000,
  handlers: {
    requests: {
      startWorker: async () => ({ ok: true }),
    },
    messages: {
      workerWrite: () => {},
    },
  },
});

function getStoragePath() {
  return path.join(process.env.APPDATA || process.env.HOME || '.', 'p2p-farmville');
}

function getRendererUrl() {
  const isDev = process.env.NODE_ENV !== 'production' || process.env.ELECTROBUN_DEV === '1' || process.env.ELECTROBUN_MODE === 'dev';

  if (isDev) {
    const baseUrl = process.env.ELECTROBUN_DEV_SERVER_URL || 'http://localhost:50000';
    return new URL('/renderer/index.html', baseUrl).href;
  }

  return pathToFileURL(path.join(__dirname, '..', 'renderer', 'index.html')).href;
}

function forwardToRenderer(message: unknown) {
  try {
    mainWindow?.webview?.sendMessageToWebviewViaExecute(message);
  } catch (error) {
    console.error('[main] renderer forward error:', error instanceof Error ? error.message : error);
  }
}

function bindRendererBridge() {
  if (rendererBridgeBound) return;
  const rpc = mainWindow?.webview?.rpc;
  if (!rpc) {
    setTimeout(bindRendererBridge, 25);
    return;
  }

  rendererBridgeBound = true;
  rpc.addMessageListener('to-worker', (payload: unknown) => {
    console.log('[main] Received renderer message for worker:', typeof payload === 'object' && payload ? (payload as { type?: string }).type || payload : payload);
    if (!workerMessage) {
      console.warn('[main] workerMessage not ready for renderer payload');
      return;
    }
    console.log('[main] Forwarding renderer payload to worker');
    workerMessage.send(payload);
  });
}

function createWindow(rendererUrl: string) {
  mainWindow = new BrowserWindow({
    title: 'P2P FarmVille',
    frame: { x: 0, y: 0, width: 1200, height: 800 },
    url: rendererUrl,
    rpc: appRPC,
  });

  bindRendererBridge();
}

function createWorkerTransport(worker: Worker): WorkerTransport {
  const listeners = new Map<string, Set<StreamListener>>();
  let destroyed = false;

  const emit = (event: 'data' | 'drain' | 'end' | 'error' | 'close', ...args: any[]) => {
    const eventListeners = listeners.get(event);
    if (!eventListeners) return;
    for (const listener of eventListeners) {
      try {
        listener(...args);
      } catch (error) {
        console.error('[main] worker transport listener error:', error instanceof Error ? error.message : error);
      }
    }
  };

  const transport: WorkerTransport = {
    userData: null,
    destroyed: false,
    alloc(size: number) {
      return new Uint8Array(size);
    },
    on(event, listener) {
      const set = listeners.get(event) ?? new Set<StreamListener>();
      set.add(listener);
      listeners.set(event, set);
      return transport;
    },
    write(buffer) {
      if (destroyed) return false;
      worker.postMessage({ type: 'ipc:data', payload: buffer });
      return true;
    },
    pause() {},
    resume() {},
    end() {
      if (destroyed) return;
      destroyed = true;
      transport.destroyed = true;
      try {
        worker.postMessage({ type: 'ipc:end' });
      } catch {}
      emit('end');
      emit('close');
      worker.terminate();
    },
    destroy(err?: unknown) {
      if (destroyed) return;
      destroyed = true;
      transport.destroyed = true;
      if (err) emit('error', err);
      try {
        worker.postMessage({ type: 'ipc:destroy', error: String(err instanceof Error ? err.message : err ?? 'destroyed') });
      } catch {}
      emit('close');
      worker.terminate();
    },
  };

  worker.addEventListener('message', (event) => {
    const message = event.data as { type?: string; payload?: unknown; error?: unknown } | unknown;
    if (!message || typeof message !== 'object') return;

    const { type, payload, error } = message as { type?: string; payload?: unknown; error?: unknown };
    if (type === 'ipc:data') {
      emit('data', payload);
      return;
    }
    if (type === 'ipc:end') {
      destroyed = true;
      transport.destroyed = true;
      emit('end');
      emit('close');
      return;
    }
    if (type === 'ipc:destroy') {
      destroyed = true;
      transport.destroyed = true;
      if (error) emit('error', error);
      emit('close');
    }
  });

  worker.addEventListener('error', (event) => {
    emit('error', event.error ?? event.message ?? new Error('Worker error'));
    emit('close');
  });

  return transport;
}

function createWorker() {
  const workerEntry = pathToFileURL(path.join(__dirname, '..', 'workers', 'main.js')).href;
  const bootstrapSource = `
    import { createRequire } from 'node:module';

    const workerEntry = ${JSON.stringify(workerEntry)};
    const listeners = new Map();
    let destroyed = false;

    function emit(event, ...args) {
      const set = listeners.get(event);
      if (!set) return;
      for (const listener of set) {
        try {
          listener(...args);
        } catch {}
      }
    }

    const ipc = {
      userData: null,
      destroyed: false,
      alloc(size) {
        return new Uint8Array(size);
      },
      on(event, listener) {
        const set = listeners.get(event) ?? new Set();
        set.add(listener);
        listeners.set(event, set);
        return ipc;
      },
      write(buffer) {
        if (destroyed) return false;
        postMessage({ type: 'ipc:data', payload: buffer });
        return true;
      },
      pause() {},
      resume() {},
      end() {
        if (destroyed) return;
        destroyed = true;
        ipc.destroyed = true;
        try { postMessage({ type: 'ipc:end' }); } catch {}
        emit('end');
        emit('close');
        close();
      },
      destroy(err) {
        if (destroyed) return;
        destroyed = true;
        ipc.destroyed = true;
        if (err) emit('error', err);
        try { postMessage({ type: 'ipc:destroy', error: String(err instanceof Error ? err.message : err ?? 'destroyed') }); } catch {}
        emit('close');
        close();
      },
    };

    addEventListener('message', (event) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'ipc:data') {
        emit('data', message.payload);
        return;
      }
      if (message.type === 'ipc:end') {
        destroyed = true;
        ipc.destroyed = true;
        emit('end');
        emit('close');
        close();
        return;
      }
      if (message.type === 'ipc:destroy') {
        destroyed = true;
        ipc.destroyed = true;
        emit('error', new Error(String(message.error || 'destroyed')));
        emit('close');
        close();
      }
    });

    globalThis.require = createRequire(workerEntry);
    globalThis.Bare = { IPC: ipc };

    await import(workerEntry);
  `;

  const bootstrapUrl = URL.createObjectURL(new Blob([bootstrapSource], { type: 'text/javascript' }));
  const worker = new Worker(bootstrapUrl, { type: 'module' });
  worker.addEventListener('close', () => {
    URL.revokeObjectURL(bootstrapUrl);
  });
  return createWorkerTransport(worker);
}

async function startWorker() {
  workerTransport = createWorker();
  const ipcMux = new Protomux(workerTransport);
  const ipcChannel = ipcMux.createChannel({ protocol: 'farmville-ipc' });

  workerMessage = ipcChannel.addMessage({
    encoding: cenc.json,
    onmessage(message: unknown) {
      console.log('[main] Worker message for renderer:', typeof message === 'object' && message ? (message as { type?: string }).type || message : message);
      forwardToRenderer(message);
    },
  });

  ipcChannel.open();
}

async function createApp() {
  const rendererUrl = getRendererUrl();

  createWindow(rendererUrl);
  await startWorker();
}

await createApp();

process.on('beforeExit', async () => {
  try {
    workerTransport?.destroy();
  } catch {}
});
