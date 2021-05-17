<script>
	import { onMount, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import dayjs from 'dayjs';
	import { location, querystring, replace } from 'svelte-spa-router';
	import {
		applicationSettings,
		bitcoinChartArrayData,
		bitcoinCurrentPrices,
		bitcoinMarketData,
		bitcoinNetworkBlockHeight,
		bitcoinTestnetNetwork,
		chartLogarithmic,
		chartTimeScale,
		configData,
		configsCurrentDataVaultsArray,
		configsCurrentDataWalletsArray,
		configSelectedCurrentData,
		currentNetworkConfigData,
		saveData,
		selectedCurrency,
		timeNow,
		withCustomUserPassword,
	} from '../../store';
	import { formatNumberByThousands, isObjectEmpty, isAudioPlaying, satoshisToBitcoins, timer } from '../../utils/helpers';

	import Button from '../../components/ui/Button.svelte';
	import SelectionDropDown from '../../components/ui/SelectionDropDown.svelte';
	import HeroSocialFooter from '../../components/ui/SocialFooter.svelte';
	import Overlay from '../../components/ui/Overlay.svelte';
	import Deposit from './Deposit.svelte';
	import Settings from './Settings.svelte';
	import Transactions from './Transactions.svelte';
	import Welcome from './Welcome.svelte';
	import Withdraw from './Withdraw.svelte';

	import Creation from '../../components/config/creation/Creation.svelte';

	const confirmedSound = new Audio('./sounds/coin.mp3');
	const receivedSound = new Audio('./sounds/default.mp3');

	// const keyIcon = './img/icons/ui/single-key.svg';
	// const keyshealtIcon = './img/icons/ui/verified-shield.svg';
	// const userIcon = './img/icons/ui/account-circle.svg';
	const bitcoinLetter = './img/icons/ui/bitcoin_letter.svg';
	const dashboadIcon = './img/icons/ui/dashboard.svg';
	const depositIcon = './img/icons/ui/deposit.svg';
	const settingsIcon = './img/icons/ui/settings.svg';
	const vaultIcon = './img/icons/ui/vault.svg';
	const walletIcon = './img/icons/ui/wallet.svg';
	const withdrawIcon = './img/icons/ui/withdraw.svg';

	let navigatorOnline = navigator.onLine;

	let accountDataLoaded = false;
	let dashboardLoaded = false;
	let allArray = [];
	let allArrayForChangePage = [];
	let allConfigArray = [];
	let allPendingAmount = [];
	let configDropdownArray = [];
	let accountDataInterval;
	let bitcoinPriceDataInterval;
	let configurationDropDownSelectedChoice = 0;
	let currentAvailableAmount = undefined;
	let currentPendingAmount = 0;
	let endShowLoadingTransaction = false;
	let forcedStep = 1;
	let forcedWalletType = '';
	let hideTopActionForWithdraw = false;
	let isUpdating = false;
	let configFileChanging = false;
	let newAdded = false;
	let refreshingAccountData = false;
	let requestedPage = '/dashboard';
	let showAlertCreation = false;
	let showAlertOverlay = false;
	let totalCurrentBalance = undefined;
	let totalCurrentPendingAmount = 0;

	$: if (($querystring || !$querystring) && hideTopActionForWithdraw && !$querystring === 'withdraw') {
		hideTopActionForWithdraw = false;
	}

	// TODO: preselect dropdown
	$: if (newAdded && $querystring.includes('updatedconfig=true')) {
		newAdded = false;

		configurationDropDownSelectedChoice = 0;
		currentAvailableAmount = undefined;
		currentPendingAmount = 0;
		filterNetworkConfigData();
		setTimeout(async () => {
			handleConfigDropdown();
			updateCurrentAccountData();
			replace('/dashboard');
		}, 0);
	}

	const handleConfigDropdown = () => {
		configDropdownArray = [];

		for (let i = 0; i <= $currentNetworkConfigData.vaults.length - 1; i++) {
			configDropdownArray.push({ name: $currentNetworkConfigData.vaults[i].name, selected: i === configurationDropDownSelectedChoice });
		}

		for (let i = 0; i <= $currentNetworkConfigData.wallets.length - 1; i++) {
			configDropdownArray.push({
				name: $currentNetworkConfigData.wallets[i].name,
				selected: i === configurationDropDownSelectedChoice - $currentNetworkConfigData.vaults.length,
			});
		}
	};

	const handleAllPendingAmount = () => {
		allPendingAmount = [];
		for (let i = 0; i < allArray.length; i++) {
			if (allArray[i] && allArray[i].availableUtxos) {
				let currentAvailableAmountCopy = 0;
				for (let j = 0; j < allArray[i].availableUtxos.length; j++) {
					if (
						(allArray[i].availableUtxos[j].status && allArray[i].availableUtxos[j].status.confirmed) ||
						allArray[i].changeAddresses.filter(change => change.address === allArray[i].availableUtxos[j].address.address).length >= 1
					) {
						currentAvailableAmountCopy += allArray[i].availableUtxos[j].value;
					}
				}

				allPendingAmount = [...allPendingAmount, allArray[i].currentBalance - currentAvailableAmountCopy];
			}
		}

		if (allPendingAmount.length >= 1) {
			totalCurrentPendingAmount = allPendingAmount.reduce((previous, current) => {
				return previous + current;
			}, 0);
		}
	};

	const handleChangePage = link => {
		if (!hideTopActionForWithdraw) {
			if ((link.includes('id=') && link.split('id=')[1] !== $querystring.split('id=')[1]) || link === 'dropdownChange') {
				currentAvailableAmount = undefined;
				allConfigArray = [...$currentNetworkConfigData.vaults, ...$currentNetworkConfigData.wallets];
				if (link !== 'dropdownChange') {
					configurationDropDownSelectedChoice = allConfigArray.findIndex(config => config.id === link.split('id=')[1]);
				}

				$configSelectedCurrentData = !isObjectEmpty(allArrayForChangePage[configurationDropDownSelectedChoice])
					? allArrayForChangePage[configurationDropDownSelectedChoice]
					: !isObjectEmpty(allArray[configurationDropDownSelectedChoice])
					? allArray[configurationDropDownSelectedChoice]
					: allConfigArray[configurationDropDownSelectedChoice]
					? allConfigArray[configurationDropDownSelectedChoice]
					: {};

				if ($configSelectedCurrentData.availableUtxos && accountDataLoaded) {
					let currentAvailableAmountCopy = 0;
					for (let i = 0; i < $configSelectedCurrentData.availableUtxos.length; i++) {
						if (
							($configSelectedCurrentData.availableUtxos[i].status && $configSelectedCurrentData.availableUtxos[i].status.confirmed) ||
							$configSelectedCurrentData.changeAddresses.filter(change => change.address === $configSelectedCurrentData.availableUtxos[i].address.address).length >=
								1
						) {
							currentAvailableAmountCopy += $configSelectedCurrentData.availableUtxos[i].value;
						}
					}

					currentAvailableAmount = currentAvailableAmountCopy;
					currentPendingAmount = $configSelectedCurrentData.currentBalance - currentAvailableAmount;
				}
			}
			if (newAdded) {
				requestedPage = link;
				if (forcedWalletType !== link.split('creationtype=')[1]) {
					showAlertCreation = true;
				}
			} else if (link !== 'dropdownChange') {
				if (link.includes('creationtype=')) {
					forcedStep = 1;
					forcedWalletType = link.split('creationtype=')[1];
					newAdded = true;
					replace('/dashboard?view=void');
				}

				setTimeout(() => {
					replace(link);
				}, 0);
			}
		} else if (link.split('/dashboard?')[1] !== $querystring) {
			requestedPage = link;
			showAlertOverlay = true;
		}
	};

	const handleCurrencyChangedUpdateBitcoinData = () => {
		isUpdating = true;
		// Emptied the reload the chart & and the market stats
		$bitcoinChartArrayData = [];
		$bitcoinMarketData = {};
		setTimeout(async () => {
			if (navigatorOnline) {
				getCurrentBitcoinPrices();
				getBicoinMarketData();
				await getHistoricalBitcoinPrice();
			}
			isUpdating = false; // ? duplication maybe use refreshingAccountData
		}, 0);
	};

	const handleChangeCurrentConfigFile = ({ detail }) => {
		if (detail.viewTransaction) {
			handleChangePage(`/dashboard?view=transactions,id=${detail.id}`);
		}
	};

	const handleCreateNewVault = () => {
		handleChangePage('/dashboard?view=newCreation,creationtype=multi');
	};

	const handleCreateNewWallet = () => {
		handleChangePage('/dashboard?view=newCreation,creationtype=single');
	};

	const cancelPresentTransaction = () => {
		hideTopActionForWithdraw = false;
		showAlertOverlay = false;
		handleChangePage(requestedPage);
		requestedPage = '/dashboard';
	};

	const handleContinueCreationOverlay = () => {
		showAlertCreation = false;
	};

	const handleCancelCreationOverlay = () => {
		showAlertCreation = false;
		newAdded = false;
		forcedWalletType = '';
		handleChangePage(requestedPage);
	};

	const continuePresentTransaction = () => {
		showAlertOverlay = false;
	};

	const getNetworkBlockHeight = async () => {
		try {
			const oldBitcoinNetworkBlockHeight = $bitcoinNetworkBlockHeight;
			$bitcoinNetworkBlockHeight = await window.api.ipcRenderer.invoke('data:get-bitcoin-network-block-height');
			if (
				$applicationSettings.notification &&
				$applicationSettings.notificationBlockfound &&
				oldBitcoinNetworkBlockHeight < $bitcoinNetworkBlockHeight &&
				oldBitcoinNetworkBlockHeight !== 0
			) {
				window.api.ipcRenderer.invoke('os:desktop-notification', {
					title: 'New block found' + ($bitcoinTestnetNetwork ? ' on Testnet' : ''),
					body: 'Present block height: ' + formatNumberByThousands($bitcoinNetworkBlockHeight, false, '', false, 0),
				});
				console.log('New Block found');
				if ($applicationSettings.notificationSound && !isAudioPlaying(receivedSound) && !isAudioPlaying(confirmedSound)) {
					receivedSound.play();
				}
			}
		} catch (error) {
			console.log('error on updating the block height', error);
		}
	};

	const handleNotificationLookup = (accountData, oldConfig) => {
		const sortedOldConfigTransactionConfirmed = oldConfig.transactions
			? oldConfig.transactions.sort((a, b) => a.status.block_height - b.status.block_height).filter(tx => tx.status.confirmed === true)
			: [];
		const sortedCurrentConfigTransactionConfirmed = accountData.transactions
			? accountData.transactions.sort((a, b) => a.status.block_height - b.status.block_height).filter(tx => tx.status.confirmed === true)
			: [];

		const sortedOldConfigTransactionUnconfirmed = oldConfig.transactions ? oldConfig.transactions.filter(tx => tx.status.confirmed === false) : [];
		const sortedCurrentConfigTransactionUnconfirmed = accountData.transactions ? accountData.transactions.filter(tx => tx.status.confirmed === false) : [];

		if ($applicationSettings.notificationReceive) {
			for (let i = 0; i < sortedCurrentConfigTransactionUnconfirmed.length; i++) {
				if (
					sortedOldConfigTransactionUnconfirmed.length < sortedCurrentConfigTransactionUnconfirmed.length &&
					sortedCurrentConfigTransactionUnconfirmed[i] &&
					sortedCurrentConfigTransactionUnconfirmed[i].type === 'received' &&
					sortedCurrentConfigTransactionUnconfirmed.length - 1 === i
				) {
					const title = $applicationSettings.notificationIncognito ? 'New transaction received' : `New transaction received on ${accountData.name}`;
					const body = $applicationSettings.notificationIncognito
						? ''
						: satoshisToBitcoins(sortedCurrentConfigTransactionUnconfirmed[i].value).toNumber() +
						  ($bitcoinTestnetNetwork ? ' tBTC on ' : ' BTC on ') +
						  sortedCurrentConfigTransactionUnconfirmed[i].address.address;
					console.log('New Transaction Received');

					try {
						window.api.ipcRenderer.invoke('os:desktop-notification', { title: title, body: body });

						if ($applicationSettings.notificationSound && !isAudioPlaying(receivedSound) && !isAudioPlaying(confirmedSound)) {
							receivedSound.play();
						}
					} catch (error) {
						console.log('Error on requesting notification', error);
					}
				}
			}
		}
		if ($applicationSettings.notificationReceiveConfirm && oldConfig.transactions && oldConfig.transactions.length >= 1)
			for (let i = 0; i < sortedCurrentConfigTransactionConfirmed.length; i++) {
				if (
					sortedOldConfigTransactionConfirmed.length < sortedCurrentConfigTransactionConfirmed.length &&
					sortedCurrentConfigTransactionConfirmed.length - 1 === i &&
					sortedCurrentConfigTransactionConfirmed[i].status.confirmed &&
					sortedCurrentConfigTransactionConfirmed[i].type === 'received'
				) {
					const title = $applicationSettings.notificationIncognito
						? 'Deposit confirmed'
						: `Deposit confirmed on ${accountData.name} in block: ${formatNumberByThousands(
								sortedCurrentConfigTransactionConfirmed[i].status.block_height,
								false,
								'',
								false,
								0,
						  )}`;
					const body = $applicationSettings.notificationIncognito
						? ''
						: satoshisToBitcoins(sortedCurrentConfigTransactionConfirmed[i].value).toNumber() +
						  ($bitcoinTestnetNetwork ? ' tBTC on ' : ' BTC on ') +
						  sortedCurrentConfigTransactionConfirmed[i].address.address;
					console.log('Deposit Confirmed');
					try {
						window.api.ipcRenderer.invoke('os:desktop-notification', { title: title, body: body });

						if ($applicationSettings.notificationSound && !isAudioPlaying(receivedSound) && !isAudioPlaying(confirmedSound)) {
							confirmedSound.play();
						}
					} catch (error) {
						console.log('Error on requesting notification', error);
					}
				}
			}
		if ($applicationSettings.notificationWithdrawConfirm && oldConfig.transactions && oldConfig.transactions.length >= 1)
			for (let i = 0; i < sortedCurrentConfigTransactionConfirmed.length; i++) {
				if (
					sortedOldConfigTransactionConfirmed.length < sortedCurrentConfigTransactionConfirmed.length &&
					sortedCurrentConfigTransactionConfirmed.length - 1 === i &&
					sortedCurrentConfigTransactionConfirmed[i].status.confirmed &&
					sortedCurrentConfigTransactionConfirmed[i].type === 'sent'
				) {
					const title = $applicationSettings.notificationIncognito
						? 'Withdraw confirmed'
						: `Withdraw from ${accountData.name} confirmed in block: ${formatNumberByThousands(
								sortedCurrentConfigTransactionConfirmed[i].status.block_height,
								false,
								'',
								false,
								0,
						  )}`;
					const body = $applicationSettings.notificationIncognito
						? ''
						: satoshisToBitcoins(sortedCurrentConfigTransactionConfirmed[i].value).toNumber() +
						  ($bitcoinTestnetNetwork ? ' tBTC on ' : ' BTC on ') +
						  sortedCurrentConfigTransactionConfirmed[i].address;
					console.log('Withdraw Confirmed');

					try {
						window.api.ipcRenderer.invoke('os:desktop-notification', { title: title, body: body });

						if ($applicationSettings.notificationSound && !isAudioPlaying(receivedSound) && !isAudioPlaying(confirmedSound)) {
							confirmedSound.play();
						}
					} catch (error) {
						console.log('Error on requesting notification', error);
					}
				}
			}
	};

	const handleAccountData = (accountData, notification, oldConfig) => {
		if (
			notification &&
			$applicationSettings.notification &&
			!isObjectEmpty(oldConfig) &&
			Object.values(oldConfig.transactions) !== Object.values(accountData.transactions)
		) {
			handleNotificationLookup(accountData, oldConfig);
		}
	};

	const filterNetworkConfigData = () => {
		const filteredWallets = $configData.wallets.filter(wallet => {
			if ($bitcoinTestnetNetwork) {
				return wallet.network === 'testnet';
			} else {
				return wallet.network === 'mainnet';
			}
		});

		const filteredVaults = $configData.vaults.filter(vault => {
			if ($bitcoinTestnetNetwork) {
				return vault.network === 'testnet';
			} else {
				return vault.network === 'mainnet';
			}
		});

		$currentNetworkConfigData = { version: $configData.version, name: $configData.name, wallets: filteredWallets, vaults: filteredVaults };
	};

	const calculatedTotalAmount = () => {
		if (allConfigArray.length >= 1) {
			totalCurrentBalance = allConfigArray.reduce((previous, current) => {
				return previous + current.currentBalance;
			}, 0);
		}
	};

	const checkForCurrentNetworkLocalConfigFile = async () => {
		try {
			const fileExist = await window.api.ipcRenderer.invoke('config-data:check-for-file');

			if (fileExist) {
				const configDatafromFile = await window.api.ipcRenderer.invoke('config-data:read-file');

				if ($bitcoinTestnetNetwork === configDatafromFile.testnet) {
					refreshingAccountData = true;
					$configsCurrentDataVaultsArray = configDatafromFile.config_data_vault;
					$configsCurrentDataWalletsArray = configDatafromFile.config_data_wallet;

					allArray = [...$configsCurrentDataVaultsArray, ...$configsCurrentDataWalletsArray];
					allConfigArray = [...$configsCurrentDataVaultsArray, ...$configsCurrentDataWalletsArray];
					allArrayForChangePage = [...$configsCurrentDataVaultsArray, ...$configsCurrentDataWalletsArray];

					$configSelectedCurrentData = allConfigArray[configurationDropDownSelectedChoice];

					handleAllPendingAmount();
					calculatedTotalAmount();
				}
			}
		} catch (error) {
			console.log('error on getting local config data');
		}
	};

	const handleSaveCurrentNetworkConfigLocally = async () => {
		try {
			const data = {
				config_data_wallet: $configsCurrentDataWalletsArray,
				config_data_vault: $configsCurrentDataVaultsArray,
				testnet: $bitcoinTestnetNetwork,
			};

			if (!isObjectEmpty(allConfigArray)) {
				await window.api.ipcRenderer.invoke('config-data:create-file', {
					data: data,
				});
			}
		} catch (error) {
			console.log('error on creating local config data');
		}
	};

	const updateCurrentAccountData = async (notification = true, filterNetwork = true) => {
		try {
			if (navigatorOnline && !configFileChanging && dashboardLoaded) {
				getNetworkBlockHeight();

				if (filterNetwork) {
					filterNetworkConfigData();
				}

				allArray = [];

				for (let i = 0; i < $currentNetworkConfigData.vaults.length; i++) {
					const oldConfig = $configsCurrentDataVaultsArray[i];
					const accountData = await window.api.ipcRenderer.invoke('config:get-accounts-data', { config: $currentNetworkConfigData.vaults[i] });
					$configsCurrentDataVaultsArray[i] = accountData;
					if (i === configurationDropDownSelectedChoice) {
						$configSelectedCurrentData = accountData;
					}
					allArray = i === 1 ? [accountData] : [...allArray, accountData];
					handleAccountData(accountData, notification, oldConfig);
				}

				for (let i = 0; i < $currentNetworkConfigData.wallets.length; i++) {
					const oldConfig = $configsCurrentDataWalletsArray[i];
					const accountData = await window.api.ipcRenderer.invoke('config:get-accounts-data', { config: $currentNetworkConfigData.wallets[i] });
					$configsCurrentDataWalletsArray[i] = accountData;
					if (i === configurationDropDownSelectedChoice - $configsCurrentDataVaultsArray.length) {
						$configSelectedCurrentData = accountData;
					}
					allArray = [...allArray, accountData];
					handleAccountData(accountData, notification, oldConfig);
				}

				allConfigArray = allArray;
				allArrayForChangePage = allArray;

				$configSelectedCurrentData = allConfigArray[configurationDropDownSelectedChoice];

				if ($querystring.includes('id=')) {
					handleChangePage(`/dashboard?view=transactions,id=${$configSelectedCurrentData.config.id}`);
				}

				const currentOldConfig = $configSelectedCurrentData;

				if ((!accountDataLoaded || currentOldConfig !== $configSelectedCurrentData) && $configSelectedCurrentData.availableUtxos) {
					let currentAvailableAmountCopy = 0;
					for (let i = 0; i < $configSelectedCurrentData.availableUtxos.length; i++) {
						if (
							($configSelectedCurrentData.availableUtxos[i].status && $configSelectedCurrentData.availableUtxos[i].status.confirmed) ||
							$configSelectedCurrentData.changeAddresses.filter(change => change.address === $configSelectedCurrentData.availableUtxos[i].address.address).length >=
								1
						) {
							currentAvailableAmountCopy += $configSelectedCurrentData.availableUtxos[i].value;
						}
					}

					currentAvailableAmount = currentAvailableAmountCopy;
					currentPendingAmount = $configSelectedCurrentData.currentBalance - currentAvailableAmount;
				}
			}
		} catch (error) {
			console.log('Error on updating account data', error);
			await timer(6666);
			if (dashboardLoaded) {
				await updateCurrentAccountData();
			}
		} finally {
			accountDataLoaded = true;
			handleAllPendingAmount();
			calculatedTotalAmount();
			handleSaveCurrentNetworkConfigLocally();
			refreshingAccountData = false;
		}
	};

	const getCurrentBitcoinPrices = async () => {
		try {
			$bitcoinCurrentPrices = await window.api.ipcRenderer.invoke('data:get-btc-current-prices');
		} catch (error) {
			console.log('Error on updating the price', error);
		}
	};

	const getHistoricalBitcoinPrice = async () => {
		try {
			$bitcoinChartArrayData = await window.api.ipcRenderer.invoke('data:get-historical-btc-price', { currency: $selectedCurrency });
		} catch (error) {
			console.log('Error on updating the historical price', error);
		}
	};

	const getBicoinMarketData = async () => {
		try {
			$bitcoinMarketData = await window.api.ipcRenderer.invoke('data:get-bitcoin-market-data', { currency: $selectedCurrency });
		} catch (error) {
			console.log('Error on updating the market data', error);
		}
	};

	// TODO: refactor
	const handleConfigFileChanged = async () => {
		configFileChanging = true;
		refreshingAccountData = true;
		allArray = [];
		allConfigArray = [];
		allPendingAmount = [];
		configDropdownArray = [];
		configurationDropDownSelectedChoice = 0;
		currentAvailableAmount = undefined;
		currentPendingAmount = 0;
		totalCurrentBalance = undefined;
		$configSelectedCurrentData = {};
		$configsCurrentDataVaultsArray = [];
		$configsCurrentDataWalletsArray = [];
		filterNetworkConfigData();
		configFileChanging = false;
		await updateCurrentAccountData();
		refreshingAccountData = false;
	};

	const handleNetworkChange = () => {
		refreshingAccountData = true;
		totalCurrentBalance = undefined;
		currentAvailableAmount = undefined;
		allArray = [];
		currentPendingAmount = 0;
		configurationDropDownSelectedChoice = 0;
		allConfigArray = [];
		allPendingAmount = [];
		configDropdownArray = [];
		$configSelectedCurrentData = {};
		$configsCurrentDataVaultsArray = [];
		$configsCurrentDataWalletsArray = [];
		$bitcoinTestnetNetwork = !$bitcoinTestnetNetwork;

		setTimeout(async () => {
			await window.api.ipcRenderer.invoke('config:switch-network', {
				testnet: $bitcoinTestnetNetwork,
			});

			await updateCurrentAccountData();
			refreshingAccountData = false;
		}, 0);
	};

	const handleShowAlertCreation = () => {
		showAlertCreation = true;
		handleChangePage('/dashboard');
	};

	const reupdateCurrentAccountData = () => {
		endShowLoadingTransaction = false;
		setTimeout(async () => {
			if (navigatorOnline) {
				await updateCurrentAccountData();
			}
			endShowLoadingTransaction = true;
		}, 6666);
	};

	const handleForceUpdateCurrentAccountData = async () => {
		refreshingAccountData = true;
		handleSyncPriceData();

		if (accountDataLoaded) {
			await updateCurrentAccountData();
		}

		setTimeout(() => {
			refreshingAccountData = false;
		}, 333);
	};

	const setIntervalAccountData = () => {
		accountDataInterval = setInterval(async () => {
			if ($applicationSettings.autoRefresh && navigatorOnline && accountDataLoaded && !isUpdating && !refreshingAccountData && !hideTopActionForWithdraw) {
				accountDataLoaded = false;

				await updateCurrentAccountData();
			}
		}, 60001);
	};

	const handleSyncPriceData = async () => {
		if (((!isUpdating && !refreshingAccountData) || $querystring !== 'view=widthdraw') && navigatorOnline && !hideTopActionForWithdraw) {
			getCurrentBitcoinPrices();
			await getHistoricalBitcoinPrice();
			getBicoinMarketData();

			// update local 'time'
			$timeNow = dayjs();

			setTimeout(() => {
				$saveData = true;
			}, 0);
		}
	};

	const setIntervalHistoricalBitcoinPrice = () => {
		bitcoinPriceDataInterval = setInterval(() => {
			handleSyncPriceData();
		}, 60421); //  rate limits with up to 100 requests/minute but only refresh every 60 secondes
	};

	const handleCurrentConfigChangeFromDropdown = ({ detail }) => {
		configurationDropDownSelectedChoice = detail;
		handleChangePage('dropdownChange');
	};

	const handleResetApp = () => {
		dashboardLoaded = false;

		try {
			clearInterval(accountDataInterval);
			clearInterval(bitcoinPriceDataInterval);

			setTimeout(async () => {
				$configData = {};
				$configsCurrentDataWalletsArray = [];
				$configsCurrentDataVaultsArray = [];
				$configSelectedCurrentData = {};
				$currentNetworkConfigData = {};
				$withCustomUserPassword = false;
				$bitcoinChartArrayData = [];
				$bitcoinCurrentPrices = {};
				$selectedCurrency = 'USD';
				$bitcoinMarketData = {};
				$bitcoinNetworkBlockHeight = 0;
				$chartTimeScale = '186';
				$chartLogarithmic = false;
				$bitcoinTestnetNetwork = process.env.BITCOIN_NETWORK === 'testnet' ? true : false;
				$timeNow = {};
				$applicationSettings = {
					advancedUserInterface: false,
					askForPasswordAfterSleep: true,
					autoRefresh: true,
					autoRefreshTimeout: 60000,
					darkTheme: false,
					disabledAnimation: false,
					discreetMode: false,
					dontShowReuseAddressesAlert: false,
					interfaceLanguage: 'en',
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
				};

				await window.api.ipcRenderer.invoke('app:reset');
				replace('/');
			}, 0);
		} catch (error) {
			console.log('error when deleting current config file');
		}
	};

	filterNetworkConfigData();

	onMount(async () => {
		// We listen for network status changes
		window.addEventListener('online', () => {
			navigatorOnline = true;
		});

		window.addEventListener('offline', () => {
			navigatorOnline = false;
		});

		dashboardLoaded = true;

		handleConfigDropdown();

		if (navigatorOnline) {
			getCurrentBitcoinPrices();
			getHistoricalBitcoinPrice();
			getBicoinMarketData();
			$timeNow = dayjs();
			getNetworkBlockHeight();
		}

		await checkForCurrentNetworkLocalConfigFile();
		// console.time('First');
		await updateCurrentAccountData(false, true);
		// console.timeEnd('First');

		setIntervalAccountData();
		setIntervalHistoricalBitcoinPrice();

		handleSyncPriceData();
	});

	onDestroy(() => {
		dashboardLoaded = false;
		clearInterval(accountDataInterval);
		clearInterval(bitcoinPriceDataInterval);
	});
</script>

<aside class="menu">
	<ul class="menu-list main">
		<li>
			<a on:click={() => handleChangePage('/dashboard')} class:is-active={$location === '/dashboard' && !$querystring}>
				<span
					class="icon has-no-hover"
					class:is-prussian-blue={$location === '/dashboard' && $querystring}
					class:is-active={$location === '/dashboard' && !$querystring}><img src={dashboadIcon} alt="icon" /></span
				>{$_('dashboard.menu.dashboard', { default: 'Dashboard' })}
			</a>
		</li>
		<li>
			<a on:click={() => handleChangePage('/dashboard?view=widthdraw')} class:is-active={$querystring === 'view=widthdraw'}>
				<span class="icon has-no-hover" class:is-prussian-blue={$location !== 'view=widthdraw'} class:is-active={$querystring === 'view=widthdraw'}
					><img src={withdrawIcon} alt="icon" /></span
				>{$_('dashboard.menu.withdraw', { default: 'Withdraw' })}
			</a>
		</li>
		<li>
			<a on:click={() => handleChangePage('/dashboard?view=deposit')} class:is-active={$querystring === 'view=deposit'}>
				<span class="icon has-no-hover" class:is-prussian-blue={$location !== 'view=deposit'} class:is-active={$querystring === 'view=deposit'}
					><img src={depositIcon} alt="icon" /></span
				>{$_('dashboard.menu.deposit', { default: 'Deposit' })}
			</a>
		</li>

		<li>
			<a on:click={() => handleChangePage('/dashboard?view=settings')} class:is-active={$querystring === 'view=settings'}>
				<span class="icon has-no-hover" class:is-prussian-blue={$location !== 'view=settings'} class:is-active={$querystring === 'view=settings'}
					><img src={settingsIcon} alt="icon" /></span
				>{$_('dashboard.menu.settings', { default: 'Settings' })}
			</a>
		</li>

		<li>
			<a class="is-disabled" title={$_('dashboard.menu.button_buy_sell_title', { default: 'Subscribe to our newsletter for updates or follow us on twitter' })}>
				<span class="icon is-small has-no-hover is-grey bitcoin-icon"><img src={bitcoinLetter} alt="icon" /></span>{$_('dashboard.menu.buy', {
					default: 'Buy',
				})}
				<!-- <span class="is-size-7">/</span>Sell -->
				<span class="exposant has-text-primary">{$_('dashboard.menu.soon', { default: 'soon' })}</span>
			</a>
		</li>
	</ul>
	<ul class="menu-list vaults">
		<li>
			<a class="has-no-hover" class:has-text-weight-bold={$querystring.includes('vault')}>
				<span class="icon is-prussian-blue has-no-hover"><img src={vaultIcon} alt="icon" /></span>{$_('dashboard.menu.vault', { default: 'Vault' })}
			</a>
			{#if !isObjectEmpty($currentNetworkConfigData)}
				{#each $currentNetworkConfigData.vaults as { id, name }}
					<a
						class="mt-2 ml-1 pr-3 has-text-weight-normal sub-menu-list move-on-hover is-capitalized has-text-multiline"
						class:is-active={$querystring === `view=transactions,id=${id}`}
						on:click={() => handleChangePage(`/dashboard?view=transactions,id=${id}`)}
					>
						{name}
					</a>
				{/each}
			{/if}
			<a class="mt-2 ml-1 has-text-weight-semibold sub-menu-list is-primary is-capitalized move-on-hover" on:click={handleCreateNewVault}
				>+ {$_('dashboard.menu.add_vault', { default: 'Add Vault' })}</a
			>
		</li>
	</ul>

	<ul class="menu-list wallets">
		<li>
			<a class="has-no-hover" class:has-text-weight-bold={$querystring.includes('wallet')}>
				<span class="icon is-prussian-blue has-no-hover"><img src={walletIcon} alt="icon" /></span>{$_('dashboard.menu.wallet', { default: 'Wallet' })}
			</a>
			{#if !isObjectEmpty($currentNetworkConfigData)}
				{#each $currentNetworkConfigData.wallets as { id, name }}
					<a
						class="mt-2 ml-1 pr-3 has-text-weight-normal sub-menu-list move-on-hover is-capitalized has-text-multiline"
						class:is-active={$querystring === `view=transactions,id=${id}`}
						on:click={() => handleChangePage(`/dashboard?view=transactions,id=${id}`)}
					>
						{name}
					</a>
				{/each}
			{/if}
			<a class="mt-2 ml-1 has-text-weight-semibold sub-menu-list is-primary is-capitalized move-on-hover" on:click={handleCreateNewWallet}
				>+ {$_('dashboard.menu.add_wallet', { default: 'Add Wallet' })}</a
			>
		</li>
	</ul>
</aside>

<div class="content-container">
	{#if !hideTopActionForWithdraw || $querystring.includes('view=newCreation')}
		<div class="columns is-vertical-center top-action" class:is-hidden={$querystring.includes('view=newCreation')}>
			{#if $location === '/dashboard' && $querystring === ''}
				<div class="column is-9">
					<h3 class="title is-3">
						{#if !isObjectEmpty($timeNow)}
							{#if $timeNow.hour() >= 0 && $timeNow.hour() < 3}
								{$_('dashboard.welcoming_message.good_night', { default: 'Good night' })},
							{:else if $timeNow.hour() >= 3 && $timeNow.hour() < 12}
								{$_('dashboard.welcoming_message.good_morning', { default: 'Good morning' })},
							{:else if $timeNow.hour() >= 12 && $timeNow.hour() <= 17}
								{$_('dashboard.welcoming_message.good_afternoon', { default: 'Good afternoon' })},
							{:else}
								{$_('dashboard.welcoming_message.good_evening', { default: 'Good evening' })},
							{/if}
						{/if}
						<span title="VIRES IN NUMERIS">Bitcoin</span>er
					</h3>
				</div>
			{:else if $location === '/dashboard' && $querystring === 'view=deposit'}
				<div class="column is-9">
					<h3 class="title is-3">{$_('dashboard.receiving.headline', { default: 'Deposit bitcoin' })}</h3>
				</div>
			{:else if $location === '/dashboard' && $querystring === 'view=widthdraw'}
				<div class="column is-9">
					<h3 class="title is-3">{$_('withdraw.main.headline', { default: 'Withdraw bitcoin' })}</h3>
				</div>
			{:else if $location === '/dashboard' && $querystring.includes('view=transactions')}
				<div class="column is-9">
					<h3 class="title is-3 is-capitalized">
						{#if configDropdownArray.length <= 1}
							{configDropdownArray.length <= 1 && configDropdownArray[configurationDropDownSelectedChoice]
								? configDropdownArray[configurationDropDownSelectedChoice].name
								: ''}
						{:else if configDropdownArray.length >= 2 && configDropdownArray[configurationDropDownSelectedChoice] && configDropdownArray[configurationDropDownSelectedChoice].name}
							<SelectionDropDown
								dropdownText={configDropdownArray[configurationDropDownSelectedChoice].name}
								dropdownClass={'is-primary'}
								on:dropdownSelected={handleCurrentConfigChangeFromDropdown}
								options={configDropdownArray}
							/>
						{:else}
							...
						{/if}
					</h3>
				</div>
			{:else if $location === '/dashboard' && $querystring.includes('view=settings')}
				<div class="column">
					<h3 class="title is-3">{$_('settings.headline', { default: 'Settings' })}</h3>
				</div>
			{/if}
			{#if !$querystring.includes('view=settings') && !$querystring.includes('view=newCreation')}
				<div class="column">
					<div class="buttons is-right">
						<Button
							buttonClass="is-primary is-small button-refresh"
							text={$_('dashboard.welcome.button_refresh', { default: 'Refresh' })}
							icon="refresh"
							loading={refreshingAccountData}
							on:buttonClicked={handleForceUpdateCurrentAccountData}
						/>
					</div>
				</div>
			{/if}
			{#if $querystring.includes('view=settings')}
				<div class="column">
					<div class="buttons is-right">
						<h6 class="subtitle is-family-primary is-6 has-text-weight-normal mr-1"><b>{$_('settings.version', { default: 'Version' })}:</b> 0.4.2-beta</h6>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	{#if $location === '/dashboard' && $querystring === ''}
		<Welcome {totalCurrentBalance} on:changeCurrentConfigFile={handleChangeCurrentConfigFile} {allPendingAmount} {totalCurrentPendingAmount} />
	{:else if $location === '/dashboard' && $querystring === 'view=deposit'}
		<Deposit
			{configDropdownArray}
			{configurationDropDownSelectedChoice}
			{currentPendingAmount}
			on:changeCurrentConfigFile={handleChangeCurrentConfigFile}
			on:dropdownSelected={handleCurrentConfigChangeFromDropdown}
		/>
	{:else if $location === '/dashboard' && $querystring === 'view=widthdraw'}
		<Withdraw
			{configDropdownArray}
			{configurationDropDownSelectedChoice}
			{currentAvailableAmount}
			{currentPendingAmount}
			on:reupdateAccountData={reupdateCurrentAccountData}
			on:withdrawStepsStarted={() => {
				hideTopActionForWithdraw = true;
			}}
			on:withdrawStepsEnded={() => {
				hideTopActionForWithdraw = false;
			}}
			on:changeCurrentConfigFile={handleChangeCurrentConfigFile}
			on:dropdownSelected={handleCurrentConfigChangeFromDropdown}
		/>
	{:else if $location === '/dashboard' && $querystring.includes('view=transactions')}
		<Transactions {currentPendingAmount} {endShowLoadingTransaction} on:reupdateAccountData={reupdateCurrentAccountData} />
	{:else if $location === '/dashboard' && $querystring.includes('view=settings')}
		<Settings
			on:configFileChanged={handleConfigFileChanged}
			on:currencyChanged={handleCurrencyChangedUpdateBitcoinData}
			on:networkChanged={handleNetworkChange}
			on:resetApp={handleResetApp}
		/>
	{:else if $location === '/dashboard' && $querystring.includes('view=newCreation')}
		<Creation step={forcedStep} walletType={forcedWalletType} on:showAlertCreation={handleShowAlertCreation} newAdded />
	{/if}
</div>

{#if !$querystring.includes('view=newCreation')}
	<div class="footer">
		<HeroSocialFooter />
	</div>
{/if}

{#if showAlertOverlay}
	<Overlay title={$_('dashboard.overlay.alert.title', { default: 'Cancel this transaction?' })} titleIsLeft disableClosing>
		<p>
			{$_('dashboard.overlay.alert.paragraph', {
				default: 'Are you sure that you want to cancel this transaction? All details will be lost. You’ll have to create another one',
			})}.
		</p>
		<div class="buttons is-centered mt-6">
			<Button
				buttonClass="is-primary is-outlined"
				text={$_('dashboard.overlay.alert.button_continue', { default: 'Continue transaction' })}
				on:buttonClicked={continuePresentTransaction}
			/>
			<Button
				buttonClass="is-primary"
				text={$_('dashboard.overlay.alert.button_cancel', { default: 'Cancel withdraw' })}
				on:buttonClicked={cancelPresentTransaction}
			/>
		</div>
	</Overlay>
{/if}

{#if showAlertCreation}
	<Overlay
		title={`${$_('dashboard.overlay.alert_creation.title_1', { default: 'Cancel this' })} ${forcedWalletType === 'single' ? 'wallet' : 'vault'}${
			$applicationSettings.interfaceLanguage === 'fr' ? ' ' : ''
		}?`}
		subtitle={`${$_('dashboard.overlay.alert_creation.subtitle_your', { default: 'Your' })} ${
			forcedWalletType === 'single'
				? $_('dashboard.overlay.alert_creation.wallet', { default: 'wallet' })
				: $_('dashboard.overlay.alert_creation.vault', { default: 'vault' })
		} ${$_('dashboard.overlay.alert_creation.subtitle_not_created', { default: "isn't created yet" })}`}
		titleIsLeft
		disableClosing
	>
		<p class="mt-2">
			{$_('dashboard.overlay.alert_creation.paragraph_1_1', { default: 'You are about to cancel the creation of this' })}
			{forcedWalletType === 'single'
				? $_('dashboard.overlay.alert_creation.wallet', { default: 'wallet' })
				: $_('dashboard.overlay.alert_creation.vault', { default: 'vault' })}. {$_('dashboard.overlay.alert_creation.paragraph_1_2', {
				default: 'It will not be saved and you will have to start over',
			})}.
		</p>
		<p class="mb-5">{$_('dashboard.overlay.alert_creation.paragraph_2', { default: 'Are you sure you want to continue' })}</p>
		<div class="buttons is-centered mt-6">
			<Button
				text={$_('dashboard.overlay.alert_creation.button_continue', { default: 'Continue' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleContinueCreationOverlay}
			/>
			<Button
				text={$_('dashboard.overlay.alert_creation.button_cancel', { default: 'Cancel creation' })}
				buttonClass="is-primary"
				on:buttonClicked={handleCancelCreationOverlay}
			/>
		</div>
	</Overlay>
{/if}

<style lang="scss">
	.menu {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		z-index: 1;
		overflow-x: hidden;
		overflow-y: auto;
		width: 202px;
		box-shadow: inset -1px 0 1px darken(#f8f7f6, 3.75%);

		.menu-list {
			padding-left: 0.9rem;

			&.vaults {
				padding-top: 0.5rem;
				padding-bottom: 1rem;
				border-bottom: 1px solid darken(#f8f7f6, 4.5%);
			}

			// &.keys
			&.wallets {
				padding-top: 0.5rem;
				padding-bottom: 1rem;
			}

			.icon {
				opacity: 0.95;
				width: 1.25rem;
				height: 1.25rem;
			}
		}

		.menu-list.main {
			padding-top: 1.3rem;
			border-bottom: 1px solid darken(#f8f7f6, 4.5%);

			li:last-child a {
				margin-bottom: 1.29rem;
			}
		}

		.sub-menu-list {
			padding: 0.25rem;
			padding-left: 1.15rem;
			font-size: 0.895rem;

			&:last-child {
				padding-bottom: 0.345rem;
			}
		}

		&::-webkit-scrollbar {
			width: 6px;
		}
		&::-webkit-scrollbar-track {
			background: transparent;
		}
		&::-webkit-scrollbar-thumb {
			border-radius: 10px;
			background: #464e5d;
		}
	}

	.bitcoin-icon {
		margin-right: 0.715rem;
		margin-left: 0.18rem;
	}

	.content-container {
		min-height: calc(100vh - 154px);
		padding-right: 32px;
		padding-left: 32px;
		margin-left: 202px;

		.top-action {
			padding-top: 1.75rem;
		}
	}

	.footer {
		margin-left: 202px;
	}
</style>
