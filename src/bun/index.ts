import { BrowserWindow, BrowserView } from 'electrobun/bun';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const bundleDir = import.meta.dir ?? path.dirname(new URL(import.meta.url).pathname);

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

function findPath(candidates: string[], exists: (candidate: string) => boolean) {
  for (const candidate of candidates) {
    if (exists(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

const rendererRoot = findPath(
  [
    path.join(bundleDir, 'app', 'renderer'),
    path.join(bundleDir, '..', 'app', 'renderer'),
    path.join(bundleDir, '..', '..', 'app', 'renderer'),
    path.join(bundleDir, '..', 'renderer'),
    path.join(process.cwd(), 'app', 'renderer'),
    path.join(process.cwd(), 'renderer'),
  ],
  (candidate) => fs.existsSync(path.join(candidate, 'index.html'))
);

const workerEntry = findPath(
  [
    path.join(bundleDir, 'app', 'workers', 'main.cjs'),
    path.join(bundleDir, '..', 'app', 'workers', 'main.cjs'),
    path.join(bundleDir, '..', '..', 'app', 'workers', 'main.cjs'),
    path.join(bundleDir, '..', 'workers', 'main.cjs'),
    path.join(process.cwd(), 'app', 'workers', 'main.cjs'),
    path.join(process.cwd(), 'workers', 'main.cjs'),
  ],
  (candidate) => fs.existsSync(candidate)
);

console.log('[main] resolved bundle paths', {
  bundleDir,
  rendererRoot,
  rendererIndex: path.join(rendererRoot, 'index.html'),
  workerEntry,
});

function getRendererUrl() {
  if (isDevelopment()) {
    const baseUrl = process.env.ELECTROBUN_DEV_SERVER_URL || 'http://localhost:50005';
    return new URL('/renderer/index.html', baseUrl).href;
  }

  return pathToFileURL(path.join(rendererRoot, 'index.html')).href;
}

function contentTypeFor(relativePath: string) {
  if (relativePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (relativePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (relativePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (relativePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (relativePath.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  if (relativePath.endsWith('.png')) return 'image/png';
  if (relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg')) return 'image/jpeg';
  if (relativePath.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function normalizeRendererPath(pathname: string) {
  const decodedPath = (() => {
    try {
      return decodeURIComponent(pathname);
    } catch {
      return pathname;
    }
  })();

  const normalizedPath = decodedPath.replace(/\\/g, '/').replace(/^\/+/, '');

  if (normalizedPath === '' || normalizedPath === 'renderer' || normalizedPath === 'renderer/' || normalizedPath === '/') {
    return 'index.html';
  }

  if (normalizedPath === 'renderer/index.html' || normalizedPath === '/renderer/index.html') {
    return 'index.html';
  }

  if (normalizedPath === 'manifest.json' || normalizedPath === 'renderer/manifest.json') {
    return 'manifest.json';
  }

  if (normalizedPath.startsWith('renderer/')) {
    return normalizedPath.slice('renderer/'.length);
  }

  return normalizedPath;
}

async function serveRendererRequest(request: Request) {
  const url = new URL(request.url);
  const relativePath = normalizeRendererPath(url.pathname);
  const resolvedPath = path.resolve(rendererRoot, relativePath);
  console.log('[main] renderer request', { requestedUrl: request.url, resolvedPath });

  const rootPrefix = rendererRoot.endsWith(path.sep) ? rendererRoot : rendererRoot + path.sep;
  if (resolvedPath !== rendererRoot && !resolvedPath.startsWith(rootPrefix)) {
    return new Response('Forbidden', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const file = Bun.file(resolvedPath);
  try {
    if (!(await file.exists())) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  } catch {
    return new Response('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(file, {
    status: 200,
    headers: { 'content-type': contentTypeFor(relativePath || 'index.html') },
  });
}

function startRendererDevServer() {
  if (!isDevelopment() || rendererServer) {
    return;
  }

  rendererServer = Bun.serve({
    hostname: '127.0.0.1',
    port: 50005,
    fetch: async (request) => {
      try {
        return await serveRendererRequest(request);
      } catch (error) {
        console.error('[main] renderer dev server fetch error:', error instanceof Error ? error.message : error);
        return new Response('Internal Server Error', { status: 500 });
      }
    },
  });

  console.log('[main] renderer dev server listening on http://127.0.0.1:50005');
}

function createWindow(rendererUrl: string) {
  mainWindow = new BrowserWindow({
    title: 'P2P FarmVille',
    frame: { x: 0, y: 0, width: 1600, height: 1000 },
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
