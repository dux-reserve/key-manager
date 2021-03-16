import { writable } from 'svelte/store';

// Application
// TODO: Permanent local data
export const userSettings = writable({
	advancedUserInterface: false,
	askForPasswordAfterSleep: true,
	autoRefresh: true,
	autoRefreshTimeout: 60421,
	darkTheme: false,
	disabledAnimation: false,
	discreetMode: false,
	dontShowReuseAddressesAlert: false,
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
	sleepTimeout: 900421,
	verifyForUpdate: true,
	verifyForUpdateNotification: true,
});

// UI
export const timeNow = writable({});

export const disableScroll = writable(false);

// Bitcoin Data: Currency, Chart Price, Network
export const selectedCurrency = writable('USD');

export const chartTimeScale = writable('186');

export const chartLogarithmic = writable(false);

export const bitcoinChartArrayData = writable([]);

export const bitcoinCurrentPrices = writable({});

export const bitcoinMarketData = writable({});

export const bitcoinNetworkBlockHeight = writable(0);

// To use testnet by default change this value to true or load BITCOIN_NETWORK environment variables to 'testnet'
export const bitcoinTestnetNetwork = writable(process.env.BITCOIN_NETWORK === 'testnet' ? true : false);

// Config Data
export const configsCurrentDataWalletsArray = writable([]);

export const configsCurrentDataVaultsArray = writable([]);

export const configSelectedCurrentData = writable({});

export const currentNetworkConfigData = writable({});

// !! remove the data object for ANY public release of the source code !! //
// In a development environment a workaround is set on reload (TODO: rephrase this comment)
export const configData = writable({});
