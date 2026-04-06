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
      "renderer/index.html": "game/index.html",
      "renderer/app.js": "game/app.js",
      "renderer/css/style.css": "game/css/style.css",
      "renderer/js": "game/js",
      "shared/constants.js": "shared/constants.js",
    },
  },
};
