# Troubleshooting

## Electron failed to install correctly

```
Error: Electron failed to install correctly, please delete node_modules/electron and try installing again
```

Fix:
```
rm -rf node_modules/electron
npm install
```

## Electron binary download blocked (firewall / proxy)

If the Electron binary fails to download repeatedly:

```
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
rm -rf node_modules/electron
npm install
```

## Verify Electron installed correctly

```
node -e "require('electron')"
```

Should print the path to the Electron binary. If it throws, reinstall:

```
rm -rf node_modules package-lock.json
npm install
```

## Cannot find module errors

```
rm -rf node_modules package-lock.json
npm install
```

## DevTools

DevTools open automatically in dev mode (`npm start`). If they don't, press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Linux/Windows).

## Reset save data

Delete the storage directory to start fresh:

- **macOS:** `rm -rf ~/Library/Application\ Support/p2p-farmville/`
- **Linux:** `rm -rf ~/.local/share/p2p-farmville/`
- **Windows:** `rmdir /s "%APPDATA%\p2p-farmville"`

## Test multiplayer locally

Run two instances in separate terminals:

```
npm start
```

Each gets its own farm and P2P identity. They auto-discover each other on the Hyperswarm network.

## architecture

This app uses Electron + pear-runtime as a library. The P2P networking runs in a Bare worker spawned by pear-runtime. This is the same architecture used by Keet (Holepunch's flagship app).

See `docs/ARCHITECTURE_RESEARCH.md` for the full analysis of why this pattern was chosen over native `pear run`.
