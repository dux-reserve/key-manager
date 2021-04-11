import { writable } from 'svelte/store';

// Application
export const applicationSettings = writable({
	advancedUserInterface: false,
	askForPasswordAfterSleep: true,
	autoRefresh: true,
	autoRefreshTimeout: 60000,
	darkTheme: false,
	disabledAnimation: false,
	discreetMode: false,
	dontShowReuseAddressesAlert: false,
	interfaceLanguage: '',
	keepLocalData: true,
	keepLocalEncryptedConfig: true,
	notification: true,
	notificationBlockfound: false,
	notificationIncognito: false,
	notificationReceive: true,
	notificationReceiveConfirm: true,
	notificationSound: true,
	notificationWithdrawConfirm: true,
	refreshDelay: true,
	satoshiUnit: false,
	showTooltips: true,
	sleepInterface: true,
	sleepMillisecondTimeout: 900000,
	verifyForUpdate: true,
	verifyForUpdateNotification: true,
});

// UI Interface
export const timeNow = writable({});

export const disableScroll = writable(false);

export const disableNetworkQuickSettings = writable(false);

export const saveSettings = writable(false);

export const saveData = writable(false);

export const withCustomUserPassword = writable(false);

// To use testnet by default change this value to true or set BITCOIN_NETWORK environment variables to 'testnet'
export const bitcoinTestnetNetwork = writable(process.env.BITCOIN_NETWORK === 'testnet' ? true : false);

// Bitcoin Data: Currency, Chart Price, Network
export const selectedCurrency = writable('USD');

export const chartTimeScale = writable('186');

export const chartLogarithmic = writable(false);

export const bitcoinChartArrayData = writable([]);

export const bitcoinCurrentPrices = writable({});

export const bitcoinMarketData = writable({});

export const bitcoinNetworkBlockHeight = writable(0);

// Config Data
export const configsCurrentDataWalletsArray = writable([]);

export const configsCurrentDataVaultsArray = writable([]);

export const configSelectedCurrentData = writable({});

export const currentNetworkConfigData = writable({});

// !! remove the data object for ANY public release of the source code !! //
export const configData = writable({});
