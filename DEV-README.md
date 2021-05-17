<p align="center">
  <img src="public/img/logos/dux-logo-with-text.svg" width="350" title="Dux Reserve">
</p>

<h3 align="center">
  Key Manager — 0.4.2-beta
</h3>


----


## Development Process

1. Use you use the proper node version (look at the end of package.json -> engines) We recommend [NVM](https://github.com/nvm-sh/nvm) to manage your node.js version.
   EXAMPLE run: `nvm install node && nvm use node`
2. Install the dependencies `yarn install`
3. Make sure the environments variable are sets: run `export $(cat .env | xargs)` or `export $(cat .env.development | xargs)` (look at [.env.development](.env.development) for an example)
4. To start the application: `yarn run dev-electron`

#### TIPS: To refresh the UI click `CTRL + R` on Linux or Windows and `Command ⌘ + R` for MacOS

## Requirement for Linux Environment
You need to apply all the udev rules. These are required for the hardwallet devices to be reachable.
For more information see: [udev/README.md](udev/README.md)


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
BASE_KEY=8fc647dc8d3cefd30cfc21d2c26b54606df61fc84e897c4e005403ff09492d9e01032009FAKE
NODE_OPTIONS=--trace-warnings
ELECTRON_ENABLE_SECURITY_WARNINGS
ELECTRON_ENABLE_LOGGING
ELECTRON_ENABLE_STACK_DUMPING

```

#### Development Testnet
```
NODE_ENV=development
BITCOIN_NETWORK=testnet
BASE_KEY=8fc647dc8d3cefd30cfc21d2c26b54606df61fc84e897c4e005403ff09492d9e01032009FAKE
NODE_OPTIONS=--trace-warnings
ELECTRON_ENABLE_SECURITY_WARNINGS
ELECTRON_ENABLE_LOGGING
ELECTRON_ENABLE_STACK_DUMPING
```


----


## Building Process
See [`release-process.md`](release-process.md)
