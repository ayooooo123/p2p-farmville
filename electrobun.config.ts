import type { ElectrobunConfig } from 'electrobun';

const config: ElectrobunConfig = {
  app: {
    name: 'P2P FarmVille',
    identifier: 'com.ayooooo123.p2pfarmville',
    version: '1.0.0',
    description: 'Peer-to-peer FarmVille with Three.js + Electrobun + pear-runtime',
  },
  build: {
    bun: {
      entrypoint: 'src/bun/index.ts',
    },
    views: {
      game: {
        entrypoint: 'renderer/js/ipc-bridge.js',
      },
    },
    copy: {
      renderer: 'renderer',
      workers: 'workers',
    },
  },
};

export default config;
