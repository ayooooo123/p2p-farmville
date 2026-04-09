import { BrowserWindow } from 'electrobun/bun';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import PearRuntime from 'pear-runtime';
import Protomux from 'protomux';
import cenc from 'compact-encoding';

const APP_NAME = 'p2p-farmville';
const APP_VERSION = '1.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let pear = null;
let workerProcess = null;
let workerMessage = null;
let rendererBridgeBound = false;

function getStoragePath() {
  return path.join(process.env.APPDATA || process.env.HOME || '.', 'p2p-farmville');
}

function forwardToRenderer(message) {
  try {
    mainWindow?.webview?.sendMessageToWebviewViaExecute(message);
  } catch (error) {
    console.error('[main] renderer forward error:', error?.message || error);
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
  rpc.addMessageListener('to-worker', (payload) => {
    workerMessage?.send(payload);
  });
}

function createWindow(rendererUrl) {
  mainWindow = new BrowserWindow({
    title: 'P2P FarmVille',
    frame: { x: 0, y: 0, width: 1200, height: 800 },
    url: rendererUrl
  });

  bindRendererBridge();
}

async function startWorker(storagePath) {
  pear = new PearRuntime({
    dir: storagePath,
    version: APP_VERSION,
    name: APP_NAME,
    updates: false
  });

  await pear.ready();

  const workerPath = path.join(__dirname, '..', 'workers', 'main.js');
  workerProcess = pear.run(workerPath, [storagePath]);

  workerProcess.stdout?.on('data', (chunk) => {
    console.log('[worker]', chunk.toString().trim());
  });

  workerProcess.stderr?.on('data', (chunk) => {
    console.error('[worker:err]', chunk.toString().trim());
  });

  workerProcess.on?.('error', (error) => {
    console.error('[main] worker error:', error?.message || error);
  });

  const ipcMux = new Protomux(workerProcess);
  const ipcChannel = ipcMux.createChannel({ protocol: 'farmville-ipc' });

  workerMessage = ipcChannel.addMessage({
    encoding: cenc.json,
    onmessage(message) {
      forwardToRenderer(message);
    }
  });

  ipcChannel.open();
}

async function createApp() {
  const storagePath = getStoragePath();
  const rendererUrl = pathToFileURL(path.join(__dirname, '..', 'renderer', 'index.html')).href;

  createWindow(rendererUrl);
  await startWorker(storagePath);
}

await createApp();

process.on('beforeExit', async () => {
  try {
    await pear?.close?.();
  } catch {}
});