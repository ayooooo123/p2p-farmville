import { BrowserWindow, BrowserView } from 'electrobun/bun';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type BareProcess = ReturnType<typeof spawn>;

let mainWindow: BrowserWindow | null = null;
let rendererServer: { stop?: () => void } | null = null;
let workerProcess: BareProcess | null = null;

const appRPC = BrowserView.defineRPC({
  maxRequestTime: 30000,
  handlers: {
    requests: {
      startWorker: async () => ({ ok: true }),
    },
    messages: {},
  },
});

function isDevelopment() {
  return process.env.NODE_ENV !== 'production' || process.env.ELECTROBUN_DEV === '1' || process.env.ELECTROBUN_MODE === 'dev';
}

function getRendererRoot() {
  return path.resolve(__dirname, '..', '..', 'renderer');
}

function getRendererUrl() {
  if (isDevelopment()) {
    const baseUrl = process.env.ELECTROBUN_DEV_SERVER_URL || 'http://localhost:50001';
    return new URL('/renderer/index.html', baseUrl).href;
  }

  return pathToFileURL(path.join(__dirname, '..', 'renderer', 'index.html')).href;
}

function resolveRendererPath(pathname: string) {
  const normalized = pathname.replace(/\\/g, '/').replace(/^\/+/, '');

  if (normalized === '' || normalized === 'renderer' || normalized === 'renderer/') {
    return 'index.html';
  }

  if (normalized === 'renderer/index.html') {
    return 'index.html';
  }

  if (normalized.startsWith('renderer/')) {
    return normalized.slice('renderer/'.length);
  }

  return normalized;
}

async function serveRendererRequest(pathname: string) {
  const rendererRoot = path.resolve(getRendererRoot());
  const relativePath = resolveRendererPath(pathname);
  const filePath = path.resolve(rendererRoot, relativePath);

  if (filePath !== rendererRoot && !filePath.startsWith(rendererRoot + path.sep)) {
    return new Response('Forbidden', { status: 403 });
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(file);
}

function startRendererDevServer() {
  if (!isDevelopment() || rendererServer) {
    return;
  }

  rendererServer = Bun.serve({
    hostname: '127.0.0.1',
    port: 50001,
    fetch: async (request) => {
      const url = new URL(request.url);
      return await serveRendererRequest(url.pathname);
    },
  });

  console.log('[main] renderer dev server listening on http://127.0.0.1:50001');
}

function createWindow(rendererUrl: string) {
  mainWindow = new BrowserWindow({
    title: 'P2P FarmVille',
    frame: { x: 0, y: 0, width: 1200, height: 800 },
    url: rendererUrl,
    rpc: appRPC,
  });
}

function createWorker() {
  const workerEntry = path.join(__dirname, '..', 'workers', 'main.cjs');
  const worker = spawn('bare', [workerEntry], {
    stdio: ['ignore', 'inherit', 'inherit'],
    windowsHide: true,
  });

  worker.on('error', (error) => {
    console.error('[main] bare worker process error:', error instanceof Error ? error.message : error);
  });

  worker.on('exit', (code, signal) => {
    console.log('[main] bare worker process exited:', { code, signal });
  });

  return worker;
}

async function startWorker() {
  workerProcess = createWorker();
}

async function createApp() {
  startRendererDevServer();

  const rendererUrl = getRendererUrl();
  createWindow(rendererUrl);
  await startWorker();
}

await createApp();

process.on('beforeExit', async () => {
  try {
    workerProcess?.kill('SIGTERM');
  } catch {}

  try {
    rendererServer?.stop?.();
  } catch {}
});
