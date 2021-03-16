const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, Notification, shell } = require('electron');
const { networks } = require('bitcoinjs-lib');
const { validateAddress } = require('unchained-bitcoin');
const BigNumber = require('bignumber.js');
const fs = require('fs');
const path = require('path');
const Store = require('secure-electron-store').default;

const { enumerateConnectedHardWallet, getXPubFromHardWallet, promptPinOnHardWallet, sendPinToHardWallet, signPsbtWithHardWallet } = require('./bitcoin/HWIcommands');
const { areBitcoinNetworkEqual, getDataFromXPub, getMultisigDerivationPathForNetwork, getP2shDerivationPathForNetwork, zpubToXpub } = require('./bitcoin/index');
const { createColdCardSetupFile, createMultisigConfig, createSinglesigConfig, formatFileName } = require('./bitcoin/config');
const {
	broadcastTransactionPsbt,
	getBitcoinMarketData,
	getCurrentBitcoinFeesEstimationFromMempoolSpace,
	getCurrentBitcoinPrices,
	getHistoricalBitcoinPrice,
	getNetworkBlockHeight,
} = require('./bitcoin/network');
const { combinePsbts, createPsbt, finalizeAllInputs } = require('./bitcoin/psbt');

const { createEncryptedDuxConfig, decryptEncryptedDuxConfig } = require('./utils/crypto');

// !! Make sure the proper environment variables are set for public release !! //
const isDevelopment = process.env.NODE_ENV === 'development' ? true : false; // DevTools deactivated by default
let bitcoinTestnet = process.env.BITCOIN_NETWORK === 'testnet' ? true : false; // Mainnet by default
let currentBitcoinNetwork = bitcoinTestnet ? networks.testnet : networks.bitcoin;

// *** Main *** //
// Render the colors accurately on all OS
app.commandLine.appendSwitch('force-color-profile', 'srgb');
// Hardware acceleration may cause input lag, so we disable it
app.disableHardwareAcceleration();

// UI
let appMainWindow;

// Local user data
const store = new Store({
	filename: 'settings',
	path: app.getPath('userData'),
	reset: false,
});

// Live reload for the developers only
if (isDevelopment) {
	require('electron-reload')(__dirname, {
		electron: path.join(__dirname, '../../node_modules', '.bin', 'electron'),
		awaitWriteFinish: true,
	});

	console.log(
		bitcoinTestnet
			? '\x1b[40m\x1b[32m\x1b[5m\x1b[4m * BITCOIN TESTNET — DUX RESERVE ALPHA VERSION * \x1b[0m'
			: '\x1b[40m\x1b[33m\x1b[5m\x1b[4m *** BITCOIN MAINNET USE WITH CAUTION — DUX RESERVE ALPHA VERSION *** \x1b[0m',
	);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit();
}

const createMainWindow = () => {
	// Remove FrameMenu for single window	and all/child windows, for the user only
	if (!isDevelopment) {
		Menu.setApplicationMenu(null);
	}

	// Create Splash screen init loading
	const splashScreen = new BrowserWindow({
		icon: 'public/img/icons/app/icon.png',
		width: 282,
		height: 364,
		center: true,
		frame: false,
		movable: false,
		alwaysOnTop: true,
		backgroundColor: '#181b20',
		webPreferences: {
			contextIsolation: true,
			devTools: false,
			enableRemoteModule: false,
			nodeIntegration: false,
			nodeIntegrationInSubFrames: false,
			nodeIntegrationInWorker: false,
			spellcheck: false,
		},
	});

	splashScreen.removeMenu();

	// Load the html file for the splashscreen and display it
	splashScreen.loadFile(path.join(__dirname, '../../public/splash.html'));

	// Create the browser window.
	appMainWindow = new BrowserWindow({
		icon: 'public/img/icons/app/icon.png',
		show: false, // Don't show the main window before everything is loaded
		center: true,
		minWidth: 940,
		minHeight: 480,
		autoHideMenuBar: true, // Remove FrameMenu
		webPreferences: {
			devTools: isDevelopment, // Devtools accessible for developers only
			contextIsolation: true,
			enableRemoteModule: false,
			nodeIntegration: false,
			nodeIntegrationInSubFrames: false,
			nodeIntegrationInWorker: false,
			spellcheck: false,
			additionalArguments: [`storePath:${app.getPath('userData')}`], // IMPORTANT!
			preload: path.join(__dirname, 'preload.js'), // Link window.api to ipcRenderer & local Store
			disableBlinkFeatures: 'Auxclick',
		},
	});

	// Finalize the binding of ipcRenderer to the window.api
	store.mainBindings(ipcMain, appMainWindow, fs);

	// and load the index.html of the app.
	appMainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

	if (!isDevelopment) {
		appMainWindow.removeMenu();
	}

	// if main window is ready to show, then the splash window is destroyed and the main window is focus
	appMainWindow.once('ready-to-show', () => {
		setTimeout(() => {
			appMainWindow.show();

			if (isDevelopment) {
				appMainWindow.webContents.openDevTools();
			}

			appMainWindow.maximize();
			setTimeout(() => {
				splashScreen.destroy();
				appMainWindow.focus();
			}, 444);
		}, 444); // Too fast, need some delay
	});

	appMainWindow.on('close', e => {
		const choice = dialog.showMessageBoxSync(appMainWindow, {
			type: 'question',
			buttons: ['Yes', 'No'],
			title: 'Confirm',
			message: 'Do you really want to close the app?\n\nMake sure to have your config file backed up. You can export it in settings.',
			icon: path.join(__dirname, '../../public/img/icons/app/icon.png'),
		});

		if (choice !== 0) {
			e.preventDefault();
		}
	});
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createMainWindow);

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createMainWindow();
	}
});

app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	} else {
		store.clearMainBindings(ipcMain);
	}
});

// *** IPC *** //
// * OS  * /
ipcMain.handle('os:open-url-with-browser', (_event, args) => {
	// https://www.electronjs.org/docs/tutorial/security#14-do-not-use-openexternal-with-untrusted-content
	const { url, txid } = args;
	let link = 'https://duxreserve.com/';

	if (url === 'homepage') {
		link = 'https://duxreserve.com/';
	} else if (url === 'twitter') {
		link = 'https://twitter.com/duxreserve';
	} else if (url === 'github') {
		link = 'https://github.com/dux-reserve';
	} else if (url === 'telegram') {
		link = 'https://t.me/DuxReserve';
	} else if (url === 'manifesto') {
		link = 'https://duxreserve.com/manifesto';
	} else if (url === 'blockstream-explorer') {
		link = 'https://blockstream.info' + (bitcoinTestnet ? '/testnet' : '') + '/tx/' + txid;
	} else if (url === 'coldcard-docs') {
		link = 'https://coldcardwallet.com/docs/quick';
	} else if (url === 'ledger-doc') {
		link = 'https://www.ledger.com/start';
	} else if (url === 'trezor-docs') {
		link = 'https://wiki.trezor.io/User_manual:Setting_up_the_Trezor_device';
	}

	shell.openExternal(link);
});

ipcMain.handle('os:copy-to-clipboard', (_event, args) => {
	const { string } = args;
	const sanitize = String(string);

	try {
		clipboard.writeText(sanitize);
	} catch (error) {
		console.log(error);
	}
});

ipcMain.handle('os:desktop-notification', (_event, args) => {
	const { title, body } = args;

	const data = {
		title,
		body,
		silent: true,
		icon: path.join(__dirname, '../../public/img/icons/app/icon.png'),
	};

	try {
		const notification = new Notification(data);

		// Focus the main window when the user click the notification
		notification.on('click', (_event, _arg) => {
			appMainWindow.focus();
		});

		notification.show();
	} catch (error) {
		console.log(error);
	}
});

// * Bitcoin Data * //
ipcMain.handle('data:get-btc-current-prices', async (_event, _args) => {
	try {
		const currencyChoice = ['USD', 'AUD', 'CAD', 'EUR', 'GBP', 'JPY', 'XAG', 'XAU'];
		const response = await getCurrentBitcoinPrices();
		let bitcoinPrices = {};

		if (response.rates) {
			for (let i = 0; i < currencyChoice.length; i++) {
				bitcoinPrices = { ...bitcoinPrices, [currencyChoice[i]]: response.rates[currencyChoice[i].toLowerCase()].value };
			}

			return Promise.resolve(bitcoinPrices);
		} else {
			return Promise.reject(new Error('Error while getting rates'));
		}
	} catch (error) {
		return Promise.reject(new Error(error));
	}
});

ipcMain.handle('data:get-historical-btc-price', async (_event, args) => {
	const { currency } = args;
	const timescale = ['1', '7', '31', '186', '365', '1095', 'max'];
	let chartData = [];

	try {
		for (let i = 0; i < timescale.length; i++) {
			const response = await getHistoricalBitcoinPrice(currency, timescale[i]);
			chartData = [...chartData, { timescale: timescale[i], data: response.prices }];
		}

		return Promise.resolve(chartData);
	} catch (error) {
		return Promise.reject(new Error(error));
	}
});

ipcMain.handle('data:get-bitcoin-network-block-height', async (_event, _args) => {
	try {
		const response = await getNetworkBlockHeight(currentBitcoinNetwork);
		return Promise.resolve(response);
	} catch (error) {
		return Promise.reject(new Error(error));
	}
});

ipcMain.handle('data:get-bitcoin-market-data', async (_event, args) => {
	const { currency } = args;
	try {
		const response = await getBitcoinMarketData(currency);
		return Promise.resolve(response);
	} catch (error) {
		return Promise.reject(new Error(error));
	}
});

// * Config Data * //
ipcMain.handle('config:get-accounts-data', async (_event, args) => {
	const { config } = args;
	let addresses;
	let availableUtxos;
	let changeAddresses;
	let transactions;
	let unusedAddresses;
	let unusedChangeAddresses;

	try {
		[addresses, availableUtxos, changeAddresses, transactions, unusedAddresses, unusedChangeAddresses] = await getDataFromXPub(config, currentBitcoinNetwork);

		if (availableUtxos) {
			const currentBalance = availableUtxos.reduce((accumulated, utxo) => accumulated.plus(utxo.value), BigNumber(0));

			const configData = {
				name: config.name,
				addresses,
				availableUtxos,
				changeAddresses,
				config,
				currentBalance: currentBalance.toNumber(),
				transactions,
				unusedAddresses,
				unusedChangeAddresses,
			};

			return Promise.resolve(configData);
		} else {
			throw new Error('Error while getting config data');
		}
	} catch (error) {
		return Promise.reject(new Error(error));
	}
});

// * Config File * //
ipcMain.handle('config:create-singlesig', async (_event, args) => {
	const { importedDevice, testnet } = args;
	const config = createSinglesigConfig(importedDevice, testnet ? networks.testnet : networks.bitcoin);

	return Promise.resolve(config);
});

ipcMain.handle('config:create-multisig', async (_event, args) => {
	const { importedDevices, requiredSigners, testnet } = args;
	const config = createMultisigConfig(importedDevices, requiredSigners, testnet ? networks.testnet : networks.bitcoin);

	return Promise.resolve(config);
});

ipcMain.handle('config:import-config-file-dialog', async (_event, _args) => {
	let config;
	try {
		const file = await dialog.showOpenDialog({
			title: 'Import your Dux Reserve config file',
			buttonLabel: 'Import',
			properties: ['openFile'],
			filters: [{ name: 'Dux secure config files', extensions: ['dux'] }, { name: 'Unsecured config files (json)', extensions: ['json'] }],
		});

		if (!file.canceled) {
			const rawdata = fs.readFileSync(path.resolve(String(file.filePaths[0])));
			const parsedFile = JSON.parse(rawdata);
			if ('encrypted_config' in parsedFile) {
				config = decryptEncryptedDuxConfig(parsedFile.encrypted_config);
			} else {
				config = parsedFile;
			}
			return Promise.resolve(config);
		} else {
			throw new Error('Canceled');
		}
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config:import-coldcard-microsd-json-dialog', async (_event, args) => {
	const { multi } = args;
	try {
		const file = await dialog.showOpenDialog({
			title: `Import your Coldcard ` + (multi ? `'ccxp-XXXXXXXX.json'` : `'coldcard-export.json'`),
			buttonLabel: 'Import',
			properties: ['openFile'],
			filters: [{ name: 'Coldcard JSON', extensions: ['json'] }],
		});

		if (!file.canceled) {
			const rawdata = fs.readFileSync(path.resolve(String(file.filePaths[0])));
			const config = JSON.parse(rawdata);
			return Promise.resolve(config);
		} else {
			throw new Error('Canceled');
		}
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config:export-encrypted-config-file-dialog', async (_event, args) => {
	const { exported_config } = args;

	try {
		const response = await dialog.showSaveDialog({
			title: 'Exporting your Dux Reserve config file',
			buttonLabel: 'Export',
			filters: [{ name: 'Dux secure config files', extensions: ['dux'] }],
			dontAddToRecent: true,
		});

		if (!response.canceled) {
			const encryptedConfig = createEncryptedDuxConfig(exported_config);
			const fileName = formatFileName(response.filePath.split('.dux')[0], 'dux', false);

			fs.writeFile(path.resolve(fileName), JSON.stringify(encryptedConfig), error => {
				if (error) throw new Error('Canceled', error);
			});
			return Promise.resolve('Success');
		} else {
			throw new Error('Canceled');
		}
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config:export-coldcard-multisig-setup', async (_event, args) => {
	const { requiredSigners, totalSigners, accountName, importedDevices } = args;
	const colcardSetupFile = createColdCardSetupFile(requiredSigners, totalSigners, accountName, importedDevices, currentBitcoinNetwork);
	return await dialog
		.showOpenDialog({
			title: 'Exporting your Coldcard Multisig setup file',
			properties: ['openDirectory'],
			buttonLabel: 'Export Coldcard setup file',
			dontAddToRecent: true,
		})
		.then(response => {
			if (!response.canceled) {
				const savePath = response.filePaths[0];
				const fileName = formatFileName(`coldcard-setup-${accountName.replace(/\s+/g, '-').toLowerCase()}`, 'txt', true, currentBitcoinNetwork);
				fs.writeFile(path.resolve(path.join(savePath, fileName)), colcardSetupFile, error => {
					if (error) return false;
				});
			} else {
				return false;
			}
		});
});

ipcMain.handle('config:convert-zpub-to-xpub', async (_event, args) => {
	const { zpub } = args;
	try {
		const xpub = zpubToXpub(zpub, areBitcoinNetworkEqual(currentBitcoinNetwork, networks.testnet));
		return Promise.resolve(xpub);
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config:switch-network', async (_event, args) => {
	const { testnet } = args;
	currentBitcoinNetwork = testnet ? networks.testnet : networks.bitcoin;
	bitcoinTestnet = testnet;
});

// * HWI * /
ipcMain.handle('hwi:enumerate', async (_event, _args) => {
	const response = JSON.parse(await enumerateConnectedHardWallet());

	if (response.error) {
		return Promise.reject(new Error('Error enumerating Hardwallets'));
	}

	const filteredDevices = response.filter(device => {
		return device.type === 'coldcard' || device.type === 'ledger' || device.type === 'trezor';
	});

	return Promise.resolve(filteredDevices);
});

// TODO: refactor addressType selected by user
ipcMain.handle('hwi:get-xpub-current-network', async (_event, args) => {
	const { device, type } = args;
	const response = JSON.parse(
		await getXPubFromHardWallet(
			device.type,
			device.path,
			type === 'single' ? getP2shDerivationPathForNetwork(currentBitcoinNetwork) : getMultisigDerivationPathForNetwork(currentBitcoinNetwork),
			areBitcoinNetworkEqual(currentBitcoinNetwork, networks.testnet),
		),
	);

	if (response.error) {
		return Promise.reject(new Error('Error extracting XPUB'));
	}

	return Promise.resolve(response);
});

ipcMain.handle('hwi:get-xpub-all-network', async (_event, args) => {
	const { device, type } = args;

	const timer = ms => new Promise(resolve => setTimeout(resolve, ms));

	const mainnet = JSON.parse(
		await getXPubFromHardWallet(
			device.type,
			device.path,
			type === 'single' ? getP2shDerivationPathForNetwork(networks.bitcoin) : getMultisigDerivationPathForNetwork(networks.bitcoin),
			false,
		),
	);

	await timer(2000);

	const testnet = JSON.parse(
		await getXPubFromHardWallet(
			device.type,
			device.path,
			type === 'single' ? getP2shDerivationPathForNetwork(networks.testnet) : getMultisigDerivationPathForNetwork(networks.testnet),
			true,
		),
	);

	if (mainnet.error && testnet.error) {
		return Promise.reject(new Error('Error extracting Mainnet XPUB'));
	}

	return Promise.resolve({ mainnet: mainnet.error ? '' : mainnet, testnet: testnet.error ? '' : testnet });
});

ipcMain.handle('hwi:prompt-pin', async (_event, args) => {
	const { device } = args;
	const response = JSON.parse(await promptPinOnHardWallet(device.type, device.path));

	if (response.error) {
		return Promise.reject(new Error('Error prompting pin'));
	}

	return Promise.resolve(response);
});

ipcMain.handle('hwi:send-pin', async (_event, args) => {
	const { device, pin } = args;
	const response = JSON.parse(await sendPinToHardWallet(device.type, device.path, pin));

	if (response.error) {
		return Promise.reject(new Error('Error sending pin'));
	}

	return Promise.resolve(response);
});

ipcMain.handle('hwi:sign-tx', async (_event, args) => {
	const { device, psbt } = args;
	const response = JSON.parse(await signPsbtWithHardWallet(device.type, device.path, psbt, areBitcoinNetworkEqual(currentBitcoinNetwork, networks.testnet)));

	if (response.error) {
		return Promise.reject(new Error('Error signing transaction'));
	}

	return Promise.resolve(response);
});

// * Transaction * //
ipcMain.handle('withdraw:estimate-fees', async (_event, _args) => {
	try {
		const response = await getCurrentBitcoinFeesEstimationFromMempoolSpace();
		return Promise.resolve(response);
	} catch (error) {
		return Promise.reject(new Error(error));
	}
});

ipcMain.handle('withdraw:validate-address', async (_event, args) => {
	const { address } = args;
	const validated = validateAddress(address, bitcoinTestnet ? 'testnet' : 'bitcoin');

	return Promise.resolve(validated);
});

// * PSBT * //
ipcMain.handle('psbt:create-psbt', async (_event, args) => {
	const { txInputs, txOutputs, unusedChangeAddresses, config } = args;
	try {
		const psbt = await createPsbt(txInputs, txOutputs, unusedChangeAddresses, config, currentBitcoinNetwork);
		return Promise.resolve(psbt);
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('psbt:export-coldcard-unsigned-psbt-dialog', async (_event, args) => {
	const { psbt } = args;

	try {
		const response = await dialog.showOpenDialog({
			title: 'Exporting unsigned PSBT by Micro SD',
			properties: ['openDirectory'],
			buttonLabel: 'Export unsigned PSBT',
			filters: [{ name: 'PSBT', extensions: ['psbt'] }],
			dontAddToRecent: true,
		});

		if (!response.canceled) {
			const fileName = formatFileName(response.filePath, 'psbt', false);

			fs.writeFile(path.resolve(fileName), psbt, error => {
				if (error) throw new Error('Canceled', error);
			});
			return Promise.resolve('Success');
		} else {
			throw new Error('Canceled');
		}
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('psbt:import-coldcard-signed-psbt-dialog', async (_event, _args) => {
	try {
		const file = await dialog.showOpenDialog({
			title: 'Import your Coldcard signed PSBT from Micro SD',
			buttonLabel: 'Import',
			properties: ['openFile'],
			filters: [{ name: 'PSBT', extensions: ['psbt'] }, { name: 'All types', extensions: ['*'] }],
		});

		if (!file.canceled) {
			const rawdata = fs.readFileSync(path.resolve(String(file.filePaths[0])), 'utf8');
			return Promise.resolve(rawdata);
		} else {
			throw new Error('Canceled');
		}
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('psbt:combine', async (_event, args) => {
	const { createdPsbt, signedPsbts } = args;
	const combinedPsbt = combinePsbts(createdPsbt, signedPsbts);

	return combinedPsbt;
});

ipcMain.handle('psbt:finalize', async (_event, args) => {
	const { finalPsbt } = args;

	const finalizePsbt = finalizeAllInputs(finalPsbt);

	return finalizePsbt;
});

ipcMain.handle('psbt:broadcast-transaction', async (_event, args) => {
	const { broadcastPsbt } = args;
	try {
		const response = await broadcastTransactionPsbt(broadcastPsbt, currentBitcoinNetwork);

		return Promise.resolve(response);
	} catch (error) {
		return Promise.reject(new Error('Error on broadcasting transaction from psbt'));
	}
});

//
//
//
//
//
//
//
//
//
//
//
// ! *** Security Enforcement *** ! //
// https://electronjs.org/docs/tutorial/security#12-disable-or-limit-navigation
app.on('web-contents-created', (_event, contents) => {
	contents.on('will-navigate', (contentsEvent, navigationUrl) => {
		const parsedUrl = new URL(navigationUrl);
		const validOrigins = [selfHost];

		// Log and prevent the app from navigating to a new page if that page's origin is not whitelisted
		if (!validOrigins.includes(parsedUrl.origin)) {
			console.error(`The application tried to redirect to the following address: '${parsedUrl}'. This origin is not whitelisted and the attempt to navigate was blocked.`);

			contentsEvent.preventDefault();
			return;
		}
	});

	contents.on('will-redirect', (contentsEvent, navigationUrl) => {
		const parsedUrl = new URL(navigationUrl);
		const validOrigins = [];

		// Log and prevent the app from redirecting to a new page
		if (!validOrigins.includes(parsedUrl.origin)) {
			console.error(`The application tried to redirect to the following address: '${navigationUrl}'. This attempt was blocked.`);

			contentsEvent.preventDefault();
			return;
		}
	});

	// https://electronjs.org/docs/tutorial/security#11-verify-webview-options-before-creation
	contents.on('will-attach-webview', (_contentsEvent, webPreferences, _params) => {
		// Strip away preload scripts if unused or verify their location is legitimate
		delete webPreferences.preload;
		delete webPreferences.preloadURL;

		// Disable Node.js integration
		webPreferences.nodeIntegration = false;
	});

	// https://electronjs.org/docs/tutorial/security#13-disable-or-limit-creation-of-new-windows
	contents.on('new-window', async (contentsEvent, navigationUrl) => {
		// Log and prevent opening up a new window
		console.error(`The application tried to open a new window at the following address: '${navigationUrl}'. This attempt was blocked.`);

		contentsEvent.preventDefault();
		return;
	});
});

// Filter loading any module via remote;
// you shouldn't be using remote at all, though
// https://electronjs.org/docs/tutorial/security#16-filter-the-remote-module
app.on('remote-require', (event, _webContents, _moduleName) => {
	event.preventDefault();
});

// built-ins are modules such as "app"
app.on('remote-get-builtin', (event, _webContents, _moduleName) => {
	event.preventDefault();
});

app.on('remote-get-global', (event, _webContents, _globalName) => {
	event.preventDefault();
});

app.on('remote-get-current-window', (event, _webContents) => {
	event.preventDefault();
});

app.on('remote-get-current-web-contents', (event, _webContents) => {
	event.preventDefault();
});
