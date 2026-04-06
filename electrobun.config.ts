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
      "renderer/index.html": "views/game/index.html",
      "renderer/app.js": "views/game/app.js",
      "renderer/css/style.css": "views/game/css/style.css",
      "renderer/js": "views/game/js",
      "shared/constants.js": "views/game/shared/constants.js",
    },
  },
};
