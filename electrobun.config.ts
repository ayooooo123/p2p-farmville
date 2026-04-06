export default {
  app: {
    name: "P2P FarmVille",
    identifier: "dev.p2p-farmville",
    version: "1.0.0",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    views: {
      game: {
        entrypoint: "src/game/index.ts",
      },
    },
    copy: {
      "renderer/index.html": "renderer/index.html",
      "renderer/app.js": "renderer/app.js",
      "renderer/css/style.css": "renderer/css/style.css",
      "renderer/js": "renderer/js",
      "shared/constants.js": "shared/constants.js",
    },
  },
};
