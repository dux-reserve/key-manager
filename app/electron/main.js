const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, Notification, shell } = require('electron');
const { networks } = require('bitcoinjs-lib');
const { validateAddress } = require('unchained-bitcoin');
const BigNumber = require('bignumber.js');
const fs = require('fs');
const path = require('path');
const Store = require('secure-electron-store').default;

const { enumerateConnectedHardWallet, getXPubFromHardWallet, promptPinOnHardWallet, sendPinToHardWallet, signPsbtWithHardWallet } = require('./bitcoin/HWIcommands');
const { areBitcoinNetworkEqual, getDataFromXPub, getMultisigDerivationPathForNetwork, getP2shDerivationPathForNetwork, zpubToXpub } = require('./bitcoin/index');
const { createMultisigConfig, createSinglesigConfig } = require('./bitcoin/config');
const {
	broadcastTransactionPsbtToBlockstream,
	getBitcoinMarketData,
	getCurrentBitcoinFeesEstimationFromMempoolSpace,
	getCurrentBitcoinPrices,
	getHistoricalBitcoinPrice,
	getNetworkBlockHeightFromBlockstream,
} = require('./bitcoin/network');
const { combinePsbts, createPsbt, finalizeAllInputs } = require('./bitcoin/psbt');

const { createEncryptedJsonFile, createEncryptedDuxFile, decryptEncryptedDuxFile } = require('./utils/crypto');
const { encryptFeedbackMessageWithPGP, sendFeedBackForm } = require('./utils/email');
const { createColdCardSetupFile, formatFileName } = require('./utils/file');

const gpuDisabled = app.commandLine.hasSwitch('gpu-disabled');
const userFilePath = app.getPath('userData');

// !! Make sure the proper environment variables are set for public release !! //
// const isDevelopment = process.env.NODE_ENV === 'development'; // DevTools deactivated by default
const isDevelopment = false; // !! UNCOMMENT FOR PRODUCTION !!

// *** basePassword is the default Secret Password, DUX use its own Password, if you DIY the building process you will need to change it for your own. MINIMUM 8 CHARACTERS *** //
const basePassword = process.env.BASE_KEY || 'THIS_IS_NOT_FOR_PRODUCTION';

let bitcoinTestnet = process.env.BITCOIN_NETWORK === 'testnet'; // Mainnet by default
let currentBitcoinNetwork = bitcoinTestnet ? networks.testnet : networks.bitcoin;

// *** Main *** //
// Hardware acceleration may cause input lag, so we disable it if the GPU doesn't support it
if (gpuDisabled) {
	app.disableHardwareAcceleration();
}

// Render colors accurately on all OS
app.commandLine.appendSwitch('force-color-profile', 'srgb');

// Local user data
const store = new Store({
	filename: 'blob',
	passkey: basePassword.substr(1, 5),
	path: userFilePath,
	extension: '.json',
	reset: true,
});

// UI
let appMainWindow;

// !! COMMENT FOR PRODUCTION !!
// Hot reload for the developers only
// if (isDevelopment) {
// 	require('electron-reload')(__dirname, {
// 		electron: path.join(__dirname, '../../node_modules', '.bin', 'electron'),
// 		awaitWriteFinish: true,
// 	});

// 	console.log(
// 		bitcoinTestnet
// 			? '\x1b[40m\x1b[32m\x1b[5m\x1b[4m * BITCOIN TESTNET — DUX RESERVE ALPHA VERSION * \x1b[0m'
// 			: '\x1b[40m\x1b[33m\x1b[5m\x1b[4m *** BITCOIN MAINNET USE WITH CAUTION — DUX RESERVE ALPHA VERSION *** \x1b[0m',
// 	);
// }

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	app.quit();
}

const createMainWindow = () => {
	// Remove FrameMenu for single window	and all/child windows (End-user only)
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
			devTools: false,
			contextIsolation: true,
			enableRemoteModule: false,
			nodeIntegration: false,
			nodeIntegrationInSubFrames: false,
			nodeIntegrationInWorker: false,
			spellcheck: false,
			disableBlinkFeatures: 'Auxclick',
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
			additionalArguments: [`storePath:${userFilePath}`], // IMPORTANT!
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

	// if main window is ready to show, then the splash window is destroyed and the main window is focused
	appMainWindow.once('ready-to-show', () => {
		// Look up if the GPU doesn't support hardware acceleration
		// Relaunch the app with hardware acceleration disabled
		// The gpu-info-update event happen after app.on('ready) so we need this hack to handle incompatible GPU
		if (!gpuDisabled && app.getGPUFeatureStatus().gpu_compositing.includes('disabled')) {
			console.log('Disable hardware acceleration');
			appMainWindow = null;
			app.relaunch({ args: process.argv.slice(1).concat(['--gpu-disabled']) });
			app.exit();
		} else {
			setTimeout(() => {
				appMainWindow.show();

				// !! COMMENT FOR PRODUCTION !!
				// if (isDevelopment) {
				// 	appMainWindow.webContents.openDevTools();
				// }

				appMainWindow.maximize();
				setTimeout(() => {
					splashScreen.destroy();
					appMainWindow.focus();
				}, 444);
			}, 444); // Too fast, need some delay
		}
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

	try {
		if (url === 'homepage') {
			link = 'https://duxreserve.com/';
		} else if (url === 'twitter') {
			link = 'https://twitter.com/duxreserve';
		} else if (url === 'github') {
			link = 'https://github.com/dux-reserve';
		} else if (url === 'telegram') {
			link = 'https://t.me/DuxReserve';
		} else if (url === 'telegram-fr') {
			link = 'https://t.me/DuxReserveFR';
		} else if (url === 'manifesto') {
			link = 'https://duxreserve.com/manifesto';
		} else if (url === 'blockstream-explorer') {
			link = 'https://blockstream.info' + (bitcoinTestnet ? '/testnet' : '') + '/tx/' + txid;
		} else if (url === 'mempool-space-explorer') {
			link = 'https://mempool.space' + (bitcoinTestnet ? '/testnet' : '') + '/tx/' + txid;
		} else if (url === 'coldcard-docs') {
			link = 'https://coldcardwallet.com/docs/quick';
		} else if (url === 'ledger-doc') {
			link = 'https://www.ledger.com/start';
		} else if (url === 'trezor-docs') {
			link = 'https://wiki.trezor.io/User_manual:Setting_up_the_Trezor_device';
		}

		shell.openExternal(link);
	} catch (error) {
		console.log('Error on opening URL with default browser');
	}
});

ipcMain.handle('os:copy-to-clipboard', (_event, args) => {
	const { string } = args;
	const sanitize = String(string);

	try {
		clipboard.writeText(sanitize);
	} catch (error) {
		console.log('Error on copying to clipboard');
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
		console.log('Error on notification creation');
	}
});

// * Language * //
ipcMain.handle('language:get-i18n-json-data', async (_event, _args) => {
	try {
		const enJSON = fs.readFileSync(path.resolve(path.join(__dirname, '../../public/lang/en.json')));
		const frJSON = fs.readFileSync(path.resolve(path.join(__dirname, '../../public/lang/fr.json')));

		const languagesJson = { en: JSON.parse(enJSON), fr: JSON.parse(frJSON) };

		return Promise.resolve(languagesJson);
	} catch (error) {
		return Promise.reject(new Error('Error on getting locale language json'));
	}
});

// * Email * //
ipcMain.handle('email:encrypt-with-pgp-keys', async (_event, args) => {
	const { feedback } = args;

	try {
		const encryptedMessage = await encryptFeedbackMessageWithPGP(feedback);

		return Promise.resolve(encryptedMessage);
	} catch (error) {
		return Promise.reject(new Error('Error on encrypting feedback', error));
	}
});

ipcMain.handle('email:send-encrypted-feedback', async (_event, args) => {
	const { encryptedMessage } = args;

	try {
		const response = await sendFeedBackForm(encryptedMessage);

		return Promise.resolve(response);
	} catch (error) {
		return Promise.reject(new Error('Error on sending encrypted feedback'));
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
		const response = await getNetworkBlockHeightFromBlockstream(currentBitcoinNetwork);
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

// * Local Data File * //
// Data
ipcMain.handle('data:check-for-file', async (_event, _args) => {
	try {
		const fileExist = fs.existsSync(path.resolve(path.join(userFilePath, 'local_data.json')));

		if (fileExist) {
			const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_data.json')));
			const parsedFile = JSON.parse(rawdata);

			if ('encrypted_data' in parsedFile) {
				return true;
			}
		} else {
			return false;
		}
	} catch (error) {
		return false;
	}
});

ipcMain.handle('data:create-file', async (_event, args) => {
	const { data } = args;
	try {
		const encryptedData = await createEncryptedJsonFile(data, basePassword + 'DATA', 'encrypted_data');

		fs.writeFileSync(path.resolve(path.join(userFilePath, 'local_data.json')), JSON.stringify(encryptedData));
		return Promise.resolve('Success');
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('data:read-file', async (_event, _args) => {
	try {
		let data;
		const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_data.json')));
		const parsedFile = JSON.parse(rawdata);

		if ('encrypted_data' in parsedFile) {
			data = await decryptEncryptedDuxFile(parsedFile.encrypted_data, basePassword + 'DATA');
		} else {
			throw new Error('Local Data file is corrupted');
		}

		return Promise.resolve(data);
	} catch (error) {
		return Promise.reject(error);
	}
});

// Settings
ipcMain.handle('settings:check-for-file', async (_event, _args) => {
	try {
		const fileExist = fs.existsSync(path.resolve(path.join(userFilePath, 'local_settings.json')));

		if (fileExist) {
			const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_settings.json')));
			const parsedFile = JSON.parse(rawdata);

			if ('encrypted_settings' in parsedFile) {
				return true;
			}
		} else {
			return false;
		}
	} catch (error) {
		return false;
	}
});

ipcMain.handle('settings:create-file', async (_event, args) => {
	const { settings } = args;
	try {
		const encryptedSettings = await createEncryptedJsonFile(settings, basePassword + 'SETTINGS', 'encrypted_settings');

		fs.writeFileSync(path.resolve(path.join(userFilePath, 'local_settings.json')), JSON.stringify(encryptedSettings));
		return Promise.resolve('Success');
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('settings:read-file', async (_event, _args) => {
	try {
		let settings;
		const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_settings.json')));
		const parsedFile = JSON.parse(rawdata);

		if ('encrypted_settings' in parsedFile) {
			settings = await decryptEncryptedDuxFile(parsedFile.encrypted_settings, basePassword + 'SETTINGS');
		} else {
			throw new Error('Settings file is corrupted');
		}

		return Promise.resolve(settings);
	} catch (error) {
		return Promise.reject(error);
	}
});

// * Config File * //
ipcMain.handle('config:check-for-file', async (_event, _args) => {
	try {
		const fileExist = fs.existsSync(path.resolve(path.join(userFilePath, 'local_config.json')));

		if (fileExist) {
			const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_config.json')));
			const parsedFile = JSON.parse(rawdata);

			if ('encrypted_config' in parsedFile) {
				return { exist: true, withCustomPassword: parsedFile.withCustomPassword };
			}
		} else {
			return { exist: false };
		}
	} catch (error) {
		return { exist: false };
	}
});

ipcMain.handle('config:create-file', async (_event, args) => {
	const { data, withCustomPassword, userPassword } = args;
	try {
		const encryptedConfig = await createEncryptedDuxFile(data, withCustomPassword ? userPassword : basePassword + 'CONFIG-DATA', withCustomPassword);

		fs.writeFileSync(path.resolve(path.join(userFilePath, 'local_config.json')), JSON.stringify(encryptedConfig));
		return Promise.resolve('Success');
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config:read-file', async (_event, args) => {
	const { userPassword } = args;
	try {
		let data;
		const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_config.json')));
		const parsedFile = JSON.parse(rawdata);

		if ('encrypted_config' in parsedFile) {
			if (userPassword) {
				data = parsedFile.encrypted_config.toString();
			} else {
				data = await decryptEncryptedDuxFile(parsedFile.encrypted_config, basePassword + 'CONFIG-DATA');
			}
		} else {
			throw new Error('Local config file is corrupted');
		}

		return Promise.resolve(data);
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config-data:check-for-file', async (_event, _args) => {
	try {
		const fileExist = fs.existsSync(path.resolve(path.join(userFilePath, 'local_config_data.json')));

		if (fileExist) {
			const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_config_data.json')));
			const parsedFile = JSON.parse(rawdata);

			if ('encrypted_config' in parsedFile) {
				return { exist: true };
			} else {
				return { exist: false };
			}
		} else {
			return { exist: false };
		}
	} catch (error) {
		return { exist: false };
	}
});

ipcMain.handle('config-data:create-file', async (_event, args) => {
	const { data } = args;
	try {
		const encryptedConfig = await createEncryptedDuxFile(data, basePassword + 'CONFIG-DATA');

		fs.writeFileSync(path.resolve(path.join(userFilePath, 'local_config_data.json')), JSON.stringify(encryptedConfig));
		return Promise.resolve('Success');
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config-data:read-file', async (_event, _args) => {
	try {
		let data;
		const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_config_data.json')));
		const parsedFile = JSON.parse(rawdata);

		if ('encrypted_config' in parsedFile) {
			data = await decryptEncryptedDuxFile(parsedFile.encrypted_config, basePassword + 'CONFIG-DATA');
		} else {
			throw new Error('Local config data file is corrupted');
		}

		return Promise.resolve(data);
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config-data:delete-file', async (_event, _args) => {
	try {
		const pathConfigFile = path.resolve(path.join(userFilePath, 'local_config.json'));
		const pathConfigDataFile = path.resolve(path.join(userFilePath, 'local_config_data.json'));
		const configFileExist = fs.existsSync(pathConfigFile);
		const configDataFileExist = fs.existsSync(pathConfigDataFile);

		if (configFileExist) {
			fs.unlinkSync(pathConfigFile);
		}

		if (configDataFileExist) {
			fs.unlinkSync(pathConfigDataFile);
		}

		return Promise.resolve('Success');
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('app:reset', async (_event, _args) => {
	try {
		const pathConfigFile = path.resolve(path.join(userFilePath, 'local_config.json'));
		const pathConfigDataFile = path.resolve(path.join(userFilePath, 'local_config_data.json'));
		const pathSettingsFile = path.resolve(path.join(userFilePath, 'local_settings.json'));
		const pathLocalDataFile = path.resolve(path.join(userFilePath, 'local_data.json'));
		const configFileExist = fs.existsSync(pathConfigFile);
		const configDataFileExist = fs.existsSync(pathConfigDataFile);
		const settingsFileExist = fs.existsSync(pathSettingsFile);
		const localDataExist = fs.existsSync(pathLocalDataFile);

		if (configFileExist) {
			fs.unlinkSync(pathConfigFile);
		}

		if (configDataFileExist) {
			fs.unlinkSync(pathConfigDataFile);
		}

		if (settingsFileExist) {
			fs.unlinkSync(pathSettingsFile);
		}

		if (localDataExist) {
			fs.unlinkSync(pathLocalDataFile);
		}

		return Promise.resolve('Success');
	} catch (error) {
		return Promise.reject(error);
	}
});

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

ipcMain.handle('config:verify-password-validity', async (_event, args) => {
	const { password } = args;
	try {
		const rawdata = fs.readFileSync(path.resolve(path.join(userFilePath, 'local_config.json')));
		const parsedFile = JSON.parse(rawdata);
		const decryptedConfig = await decryptEncryptedDuxFile(parsedFile.encrypted_config, password);

		if ('version' in decryptedConfig && 'name' in decryptedConfig && 'wallets' in decryptedConfig && 'vaults' in decryptedConfig) {
			return Promise.resolve(true);
		} else {
			return Promise.resolve(false);
		}
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config:import-config-file-dialog', async (_event, _args) => {
	let config;

	try {
		const file = await dialog.showOpenDialog({
			title: 'Import Dux Reserve config file',
			buttonLabel: 'Import',
			properties: ['openFile'],
			filters: [{ name: 'Dux secure config files', extensions: ['dux'] }, { name: 'Unsecured config files (json)', extensions: ['json'] }],
		});

		if (!file.canceled) {
			const rawdata = fs.readFileSync(path.resolve(String(file.filePaths[0])));
			const parsedFile = JSON.parse(rawdata);
			if ('encrypted_config' in parsedFile) {
				if (parsedFile.withCustomPassword) {
					config = parsedFile;
				} else {
					config = await decryptEncryptedDuxFile(parsedFile.encrypted_config, basePassword);
				}
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

ipcMain.handle('config:decrypt-config-file-with-user-password', async (_event, args) => {
	const { config, userPassword } = args;

	try {
		const decryptedConfig = await decryptEncryptedDuxFile(config, userPassword);
		return Promise.resolve(decryptedConfig);
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config:export-unsecure-config-file-dialog', async (_event, args) => {
	const { exported_config } = args;

	try {
		const response = await dialog.showSaveDialog({
			title: 'Export unsecure config file',
			buttonLabel: 'Export',
			filters: [{ name: 'Unsecure config files (json)', extensions: ['json'] }],
		});

		if (!response.canceled) {
			const fileName = `${response.filePath.split('.dux')[0].split('.json')[0]}.json`;

			fs.writeFileSync(path.resolve(fileName), JSON.stringify(exported_config));
			shell.showItemInFolder(path.resolve(fileName));
			return Promise.resolve('Success');
		} else {
			throw new Error('Canceled');
		}
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('config:export-encrypted-config-file-dialog', async (_event, args) => {
	const { exported_config, userPassword } = args;

	try {
		const response = await dialog.showSaveDialog({
			title: 'Export Dux Reserve config file',
			buttonLabel: 'Export',
			filters: [{ name: 'Dux secure config files', extensions: ['dux'] }],
		});

		if (!response.canceled) {
			const encryptedConfig = await createEncryptedDuxFile(exported_config, userPassword ? userPassword : basePassword, userPassword ? true : false);

			const fileName = `${response.filePath.split('.dux')[0]}.dux`;

			fs.writeFileSync(path.resolve(fileName), JSON.stringify(encryptedConfig));
			shell.showItemInFolder(path.resolve(fileName));
			return Promise.resolve('Success');
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
			title: `Import Coldcard ` + (multi ? `'ccxp-XXXXXXXX.json'` : `'coldcard-export.json'`),
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

ipcMain.handle('config:export-coldcard-multisig-setup', async (_event, args) => {
	const { requiredSigners, totalSigners, accountName, importedDevices } = args;
	const colcardSetupFile = createColdCardSetupFile(requiredSigners, totalSigners, accountName, importedDevices, currentBitcoinNetwork);

	try {
		const response = await dialog.showOpenDialog({
			title: 'Export Coldcard Multisig setup file',
			properties: ['openDirectory'],
			buttonLabel: 'Export Coldcard setup file',
		});

		if (!response.canceled) {
			const savePath = response.filePaths[0];
			const fileName = formatFileName(`coldcard-setup-${accountName.replace(/\s+/g, '-').toLowerCase()}`, 'txt', true, currentBitcoinNetwork);

			fs.writeFileSync(path.resolve(path.join(savePath, fileName)), colcardSetupFile);
			shell.showItemInFolder(path.resolve(path.join(savePath, fileName)));
			return Promise.resolve('Success');
		} else {
			throw new Error('Canceled');
		}
	} catch (error) {
		return Promise.reject(error);
	}
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

	await timer(1337);

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
	const { txInputs, txOutputs, unusedChangeAddresses, config, isRBF } = args;
	try {
		const psbt = await createPsbt(txInputs, txOutputs, unusedChangeAddresses, config, currentBitcoinNetwork, isRBF);
		return Promise.resolve(psbt);
	} catch (error) {
		return Promise.reject(error);
	}
});

ipcMain.handle('psbt:export-coldcard-unsigned-psbt-dialog', async (_event, args) => {
	const { psbt } = args;

	try {
		const response = await dialog.showOpenDialog({
			title: 'Export unsigned PSBT via Micro SD',
			properties: ['openDirectory'],
			buttonLabel: 'Export unsigned PSBT',
			filters: [{ name: 'PSBT', extensions: ['psbt'] }],
		});

		if (!response.canceled) {
			const fileName = formatFileName(response.filePath, 'psbt', false);

			fs.writeFileSync(path.resolve(fileName), psbt);
			shell.showItemInFolder(path.resolve(fileName));
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
			title: 'Import Coldcard signed PSBT via Micro SD',
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
		const response = await broadcastTransactionPsbtToBlockstream(broadcastPsbt, currentBitcoinNetwork);

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
