import { BrowserWindow, BrowserView } from 'electrobun/bun';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const appDir = import.meta.dir ?? path.dirname(new URL(import.meta.url).pathname);
const rendererRoot = path.join(appDir, 'app', 'renderer');
const workerEntry = path.join(appDir, 'workers', 'main.cjs');

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

function getRendererUrl() {
  if (isDevelopment()) {
    const baseUrl = process.env.ELECTROBUN_DEV_SERVER_URL || 'http://localhost:50001';
    return new URL('/renderer/index.html', baseUrl).href;
  }

  return pathToFileURL(path.join(rendererRoot, 'index.html')).href;
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

      let decodedPath = url.pathname;
      try {
        decodedPath = decodeURIComponent(url.pathname);
      } catch {}

      const normalizedPath = decodedPath.replace(/\\/g, '/').replace(/^\/+/, '');
      const relativePath =
        normalizedPath === '' ||
        normalizedPath === 'renderer' ||
        normalizedPath === 'renderer/' ||
        normalizedPath === '/'
          ? 'index.html'
          : normalizedPath === 'renderer/index.html' || normalizedPath === '/renderer/index.html'
            ? 'index.html'
            : normalizedPath === 'manifest.json' || normalizedPath === 'renderer/manifest.json'
              ? 'manifest.json'
              : normalizedPath.startsWith('renderer/')
                ? normalizedPath.slice('renderer/'.length)
                : normalizedPath;

      const filePath = path.join(rendererRoot, relativePath);
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return new Response('Not Found', { status: 404 });
      }

      const body = await file.text();
      const contentType =
        relativePath.endsWith('.html') ? 'text/html; charset=utf-8' :
        relativePath.endsWith('.js') ? 'application/javascript; charset=utf-8' :
        relativePath.endsWith('.css') ? 'text/css; charset=utf-8' :
        relativePath.endsWith('.json') ? 'application/json; charset=utf-8' :
        relativePath.endsWith('.svg') ? 'image/svg+xml; charset=utf-8' :
        'application/octet-stream';

      return new Response(body, {
        headers: { 'content-type': contentType },
      });
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
