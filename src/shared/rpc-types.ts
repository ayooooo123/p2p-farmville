// Shared RPC type definitions for P2P FarmVille
// Used by both src/bun/index.ts (main/bun handlers) and src/game/index.ts (webview handlers)
//
// Architecture: P2P module runs directly in the Bun main process.
// Renderer communicates via typed RPC. The main process relays
// P2P events to the renderer, and renderer commands to the P2P module.

export type FarmvilleRPC = {
  // Functions handled in the BUN (main) process
  // The browser calls these via rpc.send or rpc.request
  main: {
    requests: {
      // Signal that the renderer is ready for P2P events
      viewReady: { params: {}; response: { ok: boolean } };
    };
    messages: {
      // Renderer sends P2P commands (chat, trade, farm updates, etc.)
      p2pMessage: { type: string; [key: string]: any };
    };
  };
  // Functions handled in the WEBVIEW (browser/renderer) process
  // The bun process calls these via view.rpc.send or view.rpc.request
  webview: {
    requests: {};
    messages: {
      // P2P module pushes events to the renderer
      onWorkerMessage: {
        type: string;
        [key: string]: any;
      };
      // Logging from the P2P module
      onWorkerStdout: { data: string };
      onWorkerStderr: { data: string };
    };
  };
};
