<p align="center">
  <img src="public/img/logos/dux-logo-with-text.svg" width="350" title="Dux Reserve">
</p>
<h3 align="center">
  Key Manager — 0.4.1-beta
</h3>


----


## Release Process

0. Make sure the last dependencies is install `yarn install`
1. Change the environment variables for what you want to deliver (e.i.: testnet vs mainnet) in environment variables file (`.env`), run `export $(cat .env | xargs)` to set the variables in your environment
2. Make sure the configData workaround in [store.js](app/src/store.js) is an empty object {} for any production release (App or code source)
3. Comment everything with "COMMENT FOR PRODUCTION" above it
4. Hardcode every variable with "THIS_IS_NOT_FOR_PRODUCTION" (values are from .env file)
5. On each different OS (Linux, MacOS, Windows) execute `yarn run build-electron` or `yarn run build && yarn run dist` (may need to type `CTRL + C` or `Command ⌘ + C` to [SIGINT](https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html) after the build-svelte is done)
6. The installation file is outputted in `/dist/*`

### NOTE: It's preferable to package the App on MacOS. It can build everything (AppImage & DEB for Linux, EXE & MSI for Windows and of course the DMG for MacOS).


----


## .env File Example:

#### Production Mainnet
```
NODE_ENV=production
BITCOIN_NETWORK=mainnet
```

#### Production Testnet
```
NODE_ENV=production
BITCOIN_NETWORK=testnet
```

#### Development Mainnet
```
NODE_ENV=development
BITCOIN_NETWORK=mainnet
NODE_OPTIONS=--trace-warnings
ELECTRON_ENABLE_SECURITY_WARNINGS
ELECTRON_ENABLE_LOGGING
ELECTRON_ENABLE_STACK_DUMPING
```

#### Development Testnet
```
NODE_ENV=development
BITCOIN_NETWORK=testnet
NODE_OPTIONS=--trace-warnings
ELECTRON_ENABLE_SECURITY_WARNINGS
ELECTRON_ENABLE_LOGGING
ELECTRON_ENABLE_STACK_DUMPING
```
