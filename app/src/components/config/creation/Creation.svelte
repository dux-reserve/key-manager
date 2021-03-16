<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { location, replace } from 'svelte-spa-router';
	import QrCode from 'svelte-qrcode';
	import {
		bitcoinChartArrayData,
		bitcoinCurrentPrices,
		bitcoinMarketData,
		bitcoinNetworkBlockHeight,
		bitcoinTestnetNetwork,
		configData,
		currentNetworkConfigData,
		configsCurrentDataVaultsArray,
		configsCurrentDataWalletsArray,
		configSelectedCurrentData,
		selectedCurrency,
	} from '../../../store';
	import { isObjectEmpty, numberToOrdinalLabel, timer } from '../../../utils/helpers';

	import Button from '../../ui/Button.svelte';
	import TrezorNumberPad from '../../hardware/TrezorNumberPad.svelte';
	import HeroSocialFooter from '../../ui/SocialFooter.svelte';
	import Overlay from '../../ui/Overlay.svelte';
	import OverlayV2 from '../../ui/OverlayV2.svelte';

	import ConfigTypeChoice from '../../config/creation/ConfigTypeChoice.svelte'; // Step 0

	// Wallet
	import WalletDetailsSingleSig from './singlekey/WalletConfigDetails.svelte'; // Step 1

	// Vault
	import QuorumChoiceMultiSig from './multikey/QuorumChoice.svelte'; // Step 1
	import VaultConfigDetailsMultiSig from './multikey/VaultConfigDetails.svelte'; // Step 2
	import KeysChoice2of3MultiSig from './multikey/KeysChoice2of3.svelte'; // Step 3

	import Extraction from './Extraction.svelte'; // Single Steps 2 & 3 || Multi Steps 4 & 5
	import ConfirmConfig from '../../config/creation/ConfirmConfig.svelte'; // Last Step | Single: 4 | Multi: 6

	// ColdCardMicroSD
	import ColdCardMicroSD from '../../config/creation/ColdCardMicroSD.svelte';

	export let newAdded = false;
	export let step = 0;
	export let walletType = 'single';

	const checkCircle = './img/icons/ui/check-circle.svg';
	const coldcardLogo = './img/logos/coldcard.png';
	const ledgerLogo = './img/logos/ledger-vertical.png';
	const trezorLogo = './img/logos/trezor.png';

	const dispatch = createEventDispatcher();

	let navigatorOnline = navigator.onLine;

	// let passphrase = '';

	let cancelXpubExtration = false;
	let configName = '';
	let deviceAlreadyAdded = false;
	let deviceNotInitialized = false;
	let deviceScanning = false;
	let exportingDone = false;
	let exportingFailed = false;
	let exportingInProgress = false;
	let extractedFromMicroSD = false;
	let extractedXpub = '';
	let extractedXpubMirror = '';
	let extractedXpubWrongNetwork = false;
	let importedDevices = [];
	let importedDevicesMirror = [];
	let lockClosingPinOverlay = false;
	let microSDColdcardExportOverlay = false;
	let microSDColdcardExportLoading = false;
	let microSDUploadError = false;
	let overlayXpub = '';
	let requiredSigners = 2;
	let retryXpubExtration = false;
	let scannedDevices = [];
	let scannedWalletData = {};
	let selectedWalletBrand = '';
	let showCancelConfirmation = false;
	let showConfigFileAlert = false;
	let showMicroSDModel = false;
	let showPinOverlay = false;
	let showXpub = false;
	let showXpubOverlay = false;
	let totalSigners = 3;
	let trezorError = false;
	let trezorLockPinKey = false;
	let trezorPinMessage = '';
	let vaultCompletedKeys = 0;
	let walletNeedPinSent = false;
	let wrongDeviceDetected = false;
	// *** General ***
	const updateWalletSelected = ({ detail }) => {
		selectedWalletBrand = detail.toLowerCase().split(' ')[0];
	};

	const updateWalletName = ({ detail }) => {
		configName = detail.trim();
	};

	const handleResetWalletData = () => {
		// passphrase = '';
		cancelXpubExtration = false;
		deviceAlreadyAdded = false;
		deviceNotInitialized = false;
		deviceScanning = false;
		exportingDone = false;
		exportingFailed = false;
		exportingInProgress = false;
		extractedFromMicroSD = false;
		extractedXpub = '';
		extractedXpubMirror = '';
		extractedXpubWrongNetwork = false;
		lockClosingPinOverlay = false;
		microSDColdcardExportOverlay = false;
		microSDColdcardExportLoading = false;
		microSDUploadError = false;
		overlayXpub = '';
		retryXpubExtration = false;
		scannedDevices = [];
		scannedWalletData = {};
		showCancelConfirmation = false;
		showConfigFileAlert = false;
		showPinOverlay = false;
		showXpub = false;
		showXpubOverlay = false;
		trezorError = false;
		trezorLockPinKey = false;
		trezorPinMessage = '';
		walletNeedPinSent = false;
		wrongDeviceDetected = false;
	};

	const openUrl = url => {
		window.api.ipcRenderer.invoke('os:open-url-with-browser', { url });
	};

	const handleShowXpubOverlay = xpub => {
		overlayXpub = xpub;
		showXpubOverlay = true;
	};

	const handleHideXpubOverlay = () => {
		showXpubOverlay = false;
		overlayXpub = '';
	};

	const enumerate = async () => {
		try {
			const response = await window.api.ipcRenderer.invoke('hwi:enumerate');
			if (deviceScanning && !showMicroSDModel && ((walletType === 'single' && step > 1) || (walletType === 'multi' && step > 3))) {
				scannedDevices = response;
			}
		} catch (error) {
			deviceScanning = false;
			console.log('error on enumerate: ', error);
		}
	};

	const importXpubFromDevice = async device => {
		try {
			const response = await window.api.ipcRenderer.invoke('hwi:get-xpub-all-network', {
				device: device,
				type: walletType,
			});

			if (!cancelXpubExtration && !retryXpubExtration && !showMicroSDModel) {
				exportingInProgress = false;
				retryXpubExtration = false;
				// TODO: tenary
				extractedXpub = $bitcoinTestnetNetwork ? response.testnet.xpub : response.mainnet.xpub;
				extractedXpubMirror = $bitcoinTestnetNetwork ? response.mainnet.xpub : response.testnet.xpub;

				// TODO: checkup
				if (($bitcoinTestnetNetwork && !extractedXpub.startsWith('tpub')) || (!$bitcoinTestnetNetwork && !extractedXpub.startsWith('xpub'))) {
					retryXpubExtration = true;
					extractedXpub = '';
					extractedXpubMirror = '';
					extractedXpubWrongNetwork = true;
				}
			}
		} catch (error) {
			const deviceError = { error: device.error, code: device.code };
			console.log(deviceError, device);

			// Wordaround sometimes get-xpub lag, that's look ugly tho
			setTimeout(() => {
				if (
					!extractedXpub &&
					!cancelXpubExtration &&
					!retryXpubExtration &&
					!showMicroSDModel &&
					((walletType === 'single' && step > 1) || (walletType === 'multi' && step > 3))
				) {
					exportingInProgress = false;
					retryXpubExtration = true;
				}
			}, 10210);
		}
	};

	const handleScanningStop = () => {
		deviceScanning = false;
	};

	const handleDeviceNotInitialized = () => {
		deviceScanning = false;
		deviceNotInitialized = true;
	};

	const handleCancelExtraction = () => {
		cancelXpubExtration = true;
		retryXpubExtration = true;
		extractedXpub = '';
		extractedXpubMirror = '';
	};

	const handleCancelCreation = () => {
		vaultCompletedKeys = 0;
		requiredSigners = 2;
		totalSigners = 3;
		importedDevices = [];
		importedDevicesMirror = [];
		handleResetWalletData();
		if (walletType === 'single') {
			step = 1;
		} else if (walletType === 'multi') {
			step = 2;
		}
	};

	const verifyIfDeviceIsalreadyAdded = () => {
		if (
			scannedWalletData.fingerprint &&
			importedDevices.filter(device => device.fingerprint && device.fingerprint.toLowerCase() === scannedWalletData.fingerprint.toLowerCase()).length > 0
		) {
			deviceAlreadyAdded = true;
			retryXpubExtration = true;
			return true;
		} else {
			deviceAlreadyAdded = false;
			return false;
		}
	};

	const handleExtraction = async () => {
		exportingInProgress = true;
		if (!extractedXpub && ((walletType === 'single' && step > 1) || (walletType === 'multi' && step > 3))) {
			if (walletNeedPinSent && scannedWalletData.type === 'trezor') {
				trezorPinMessage = 'PIN layout is displayed on your device';
				await handleTrezorExtraction(scannedWalletData);
			} else {
				await timer(2000);
				if (!cancelXpubExtration) {
					await importXpubFromDevice(scannedWalletData);
				}
			}
		}
	};

	const initScanning = async () => {
		await timer(1111);
		for (let i = 0; i <= 30; i++) {
			if (!deviceScanning) break;
			await enumerate();
			if (scannedDevices.length >= 1) {
				for (let i = 0; i < scannedDevices.length; i++) {
					if (scannedDevices[i].type === selectedWalletBrand && deviceScanning) {
						scannedWalletData = { ...scannedDevices[i] };
						wrongDeviceDetected = false;
						walletNeedPinSent = scannedWalletData.needs_pin_sent;
						if (walletType === 'multi' && verifyIfDeviceIsalreadyAdded()) break;
						handleScanningStop();
					}
				}
				if (!isObjectEmpty(scannedWalletData)) {
					if (scannedWalletData.code == -18 || scannedWalletData.fingerprint === '00000000') {
						handleDeviceNotInitialized();
						break;
					} else {
						if (walletType === 'single') {
							step = 3;
						} else if (walletType === 'multi') {
							step = 5;
						}
						break;
					}
				}
			}
			if (i > 10 && scannedDevices.length >= 1 && deviceScanning) {
				scannedWalletData = { ...scannedDevices[scannedDevices.length - 1] };
				handleScanningStop();
				wrongDeviceDetected = true;
				break;
			}
			if (i === 30) handleScanningStop();
			await timer(1000);
		}
	};

	const handleRetryExtraction = async () => {
		handleResetWalletData();
		deviceScanning = true;
		exportingInProgress = true;
		await timer(1000);
		for (let i = 0; i <= 30; i++) {
			if (!deviceScanning) break;
			await enumerate();
			if (scannedDevices.length >= 1) {
				// ? change for for in
				for (let i = 0; i < scannedDevices.length; i++) {
					if (scannedDevices[i].type === selectedWalletBrand) {
						scannedWalletData = { ...scannedDevices[i] };
						wrongDeviceDetected = false;
						walletNeedPinSent = scannedWalletData.needs_pin_sent;
						handleScanningStop();
						if (walletType === 'multi' && verifyIfDeviceIsalreadyAdded()) break;
					}
				}
				if (!isObjectEmpty(scannedWalletData)) {
					if (scannedWalletData.code == -18 || scannedWalletData.fingerprint === '00000000') {
						handleDeviceNotInitialized();
						break;
					} else {
						await timer(3000);
						handleExtraction();
						break;
					}
				}
			}
			if (i > 10 && scannedDevices.length >= 1) {
				scannedWalletData = { ...scannedDevices[scannedDevices.length - 1] };
				handleScanningStop();
				wrongDeviceDetected = true;
				break;
			}
			if (i === 30) handleScanningStop();
			await timer(1000);
		}
	};

	const initFirstScanning = () => {
		handleResetWalletData();
		deviceScanning = true;
		initScanning();
	};

	const handleSwitchDevice = async () => {
		selectedWalletBrand = scannedWalletData.type.toLowerCase();
		walletNeedPinSent = scannedWalletData.needs_pin_sent;
		wrongDeviceDetected = false;

		if (scannedWalletData.code == -18) {
			handleDeviceNotInitialized();
		} else {
			if (walletType === 'single') {
				step = 3;
			} else if (walletType === 'multi') {
				step = 5;
			}
		}
	};

	const setupSingleSig = async () => {
		try {
			const configObject = await window.api.ipcRenderer.invoke('config:create-singlesig', {
				importedDevice: importedDevices[0],
				testnet: $bitcoinTestnetNetwork,
			});

			if (isObjectEmpty($configData)) {
				$configData = configObject;
			} else {
				$configData.wallets.push(...configObject.wallets);
				$configData.keys.push(...configObject.keys);
			}

			if (extractedXpubMirror) {
				const configObjectMirror = await window.api.ipcRenderer.invoke('config:create-singlesig', {
					importedDevice: importedDevicesMirror[0],
					testnet: !$bitcoinTestnetNetwork,
				});

				if (isObjectEmpty($configData)) {
					$configData = configObjectMirror;
				} else {
					$configData.wallets.push(...configObjectMirror.wallets);
					$configData.keys.push(...configObjectMirror.keys);
				}
			}

			preloadAccountData();
			step = 4;
		} catch (error) {
			console.log('Error on creating single config file');
		}
	};

	// Step 0
	const handleWalletSelected = () => {
		walletType = 'single';
		step = 1;
	};

	const handleVaultSelected = () => {
		walletType = 'multi';
		step = 1;
	};

	const handle2of3Selected = () => {
		requiredSigners = 2;
		totalSigners = 3;
		step = 2;
	};

	// *** Wallet ***
	// Step 1
	const handleInitSingleKey = () => {
		step = 2;
		initFirstScanning();
	};

	const confirmSingleWallet = () => {
		importedDevices = [{ ...scannedWalletData, xpub: extractedXpub, configName: configName }];
		if (extractedXpubMirror) {
			importedDevicesMirror = [{ ...scannedWalletData, xpub: extractedXpubMirror, configName: configName }];
		}

		setupSingleSig();
	};

	// *** Trezor NumberPad ***
	const handleHidePinOverlay = () => {
		retryXpubExtration = true;
		showPinOverlay = false;
		trezorError = false;
		trezorPinMessage = 'PIN layout is displayed on your device';
	};

	const handleTrezorExtraction = async device => {
		showPinOverlay = true;
		trezorError = false;
		try {
			await window.api.ipcRenderer.invoke('hwi:prompt-pin', {
				device: device,
			});
		} catch (error) {
			trezorPinMessage = 'Something went wrong. Please unplug and re-plug your Trezor & retry';
			trezorError = true;
		}
	};

	const sendPin = async pin => {
		lockClosingPinOverlay = true;
		trezorLockPinKey = true;
		trezorPinMessage = 'Verifying PIN';

		if (pin.length < 1) {
			trezorPinMessage = 'Incorrect PIN - Please retry';
			trezorLockPinKey = false;
			await handleTrezorExtraction(scannedWalletData);
		}

		try {
			const response = await window.api.ipcRenderer.invoke('hwi:send-pin', {
				device: scannedWalletData,
				pin: pin.detail.pin,
			});

			if (response.success) {
				showPinOverlay = false;
				trezorLockPinKey = false;
				walletNeedPinSent = false;
				deviceScanning = true;
				await timer(1000);
				for (let i = 0; i <= 20; i++) {
					if (i === 60) {
						handleScanningStop();
						handleCancelExtraction();
					}
					await enumerate();
					if (scannedDevices.length >= 1) {
						for (let i = 0; i < scannedDevices.length; i++) {
							if (scannedDevices[i].type === selectedWalletBrand) {
								scannedWalletData = { ...scannedDevices[i] };
								wrongDeviceDetected = false;
								if (verifyIfDeviceIsalreadyAdded()) break;
							}
						}
						if (!isObjectEmpty(scannedWalletData) && scannedWalletData.fingerprint) {
							if (scannedWalletData.code == -18 || scannedWalletData.fingerprint === '00000000') {
								handleScanningStop();
								handleDeviceNotInitialized();
								break;
							} else {
								handleScanningStop();
								await timer(1000);
								if (!cancelXpubExtration) {
									await importXpubFromDevice(scannedWalletData);
								}
								break;
							}
						}
					}
					await timer(1000);
				}
			} else {
				trezorPinMessage = 'Incorrect PIN - Please retry';
				trezorLockPinKey = false;
				await handleTrezorExtraction(scannedWalletData);
			}
		} catch (error) {
			trezorPinMessage = 'Something went wrong. Please unplug and re-plug your Trezor & retry';
			trezorError = true;
		} finally {
			lockClosingPinOverlay = false;
		}
	};

	const handleShowExtractFromMicroSD = async () => {
		handleResetWalletData();
		if (walletType === 'single') {
			step = 2;
		} else if (walletType === 'multi') {
			step = 4;
		}
		showMicroSDModel = true;
	};

	const handleCancelImportingFromMicroSD = async () => {
		handleResetWalletData();
		handleScanningStop();
		if (walletType === 'single') {
			step = 2;
		} else if (walletType === 'multi') {
			step = 4;
		}
		showMicroSDModel = false;
	};

	const handleExtractFromMicroSD = async () => {
		microSDUploadError = false;
		try {
			const response = await window.api.ipcRenderer.invoke('config:import-coldcard-microsd-json-dialog', { multi: walletType === 'multi' });

			if (
				(walletType === 'single' && !$bitcoinTestnetNetwork && response.chain !== 'BTC') ||
				(walletType === 'multi' && !$bitcoinTestnetNetwork && !response.p2sh.startsWith('xpub')) ||
				(walletType === 'single' && $bitcoinTestnetNetwork && response.chain !== 'XTN') ||
				(walletType === 'multi' && $bitcoinTestnetNetwork && !response.p2sh.startsWith('tpub'))
			) {
				extractedXpubWrongNetwork = true;
				throw new Error('Invalid data');
			}

			if (!response.xfp || (walletType === 'single' && !response.bip49['_pub']) || (walletType === 'multi' && !response.p2wsh)) {
				throw new Error('Invalid data');
			} else {
				extractedFromMicroSD = true;
				if (walletType === 'single') {
					scannedWalletData = { type: 'coldcard', model: 'coldcard', fingerprint: response.xfp };
					deviceScanning = true;
					exportingInProgress = true;
					step = 3;
					showMicroSDModel = false;
					await timer(3000);
					if (!cancelXpubExtration && !verifyIfDeviceIsalreadyAdded()) {
						const xpub = await window.api.ipcRenderer.invoke('config:convert-zpub-to-xpub', { zpub: response.bip49['_pub'] });

						if (xpub) {
							extractedXpub = xpub;
							extractedXpubMirror = '';
						} else {
							throw new Error('Corrupted File');
						}
					}
				} else if (walletType === 'multi') {
					scannedWalletData = { type: 'coldcard', model: 'coldcard', fingerprint: response.xfp };
					deviceScanning = true;
					exportingInProgress = true;
					step = 5;
					showMicroSDModel = false;
					await timer(3000);
					if (!cancelXpubExtration && !verifyIfDeviceIsalreadyAdded()) {
						const zpub = await window.api.ipcRenderer.invoke('config:convert-zpub-to-xpub', { zpub: response.p2wsh });

						if (zpub) {
							extractedXpub = zpub;
							extractedXpubMirror = '';
						} else {
							throw new Error('Corrupted File');
						}
					}
				}
			}
		} catch (error) {
			console.log(error);
			if (!error.message.includes('Canceled')) {
				microSDUploadError = true;
			}
		}
	};

	// Reset the trezor if not unplugged correctly
	const handleReplugTrezorDevice = () => {
		if (walletType === 'single') {
			step = 2;
			initFirstScanning();
		} else if (walletType === 'multi') {
			step = 3;
			initFirstScanning();
		}
	};

	// *** Buttons actions ***
	const handleBackButton = () => {
		if (step === 0) {
			if ($location === '/init-config') {
				replace('/');
			} else {
				replace('/dashboard');
			}
		} else if (step === 1 && !newAdded) {
			configName = '';
			selectedWalletBrand = '';
			walletType = '';
			step = 0;
		} else if (step === 1 && newAdded) {
			dispatch('showAlertCreation');
		} else if (walletType === 'single' && !showMicroSDModel && (step === 2 || step === 3)) {
			importedDevices = [];
			importedDevicesMirror = [];
			handleResetWalletData();
			step = 1;
		} else if (walletType === 'single' && showMicroSDModel && (step === 2 || step === 3)) {
			importedDevices = [];
			importedDevicesMirror = [];
			showMicroSDModel = false;
			handleResetWalletData();
			step = 2;
		} else if (walletType === 'multi' && step === 2) {
			configName = '';
			importedDevices = [];
			importedDevicesMirror = [];
			handleResetWalletData();
			step = 1;
		} else if (walletType === 'multi' && step === 3) {
			selectedWalletBrand = '';
			handleResetWalletData();
			step = 2;
		} else if (walletType === 'multi' && !showMicroSDModel && (step === 4 || step === 5)) {
			handleResetWalletData();
			step = 3;
		} else if (walletType === 'multi' && showMicroSDModel && (step === 4 || step === 5)) {
			showMicroSDModel = false;
			handleResetWalletData();
			step = 4;
			handleRetryExtraction();
		}
	};

	const handleContinueConfirmation = () => {
		showCancelConfirmation = false;
	};

	const handleShowCancelConfirmationAlert = () => {
		showCancelConfirmation = true;
	};

	const handleCancelConfirmation = () => {
		if (walletType === 'single') {
			showCancelConfirmation = false;
			selectedWalletBrand = '';
			importedDevices = [];
			importedDevicesMirror = [];
			handleResetWalletData();
			step = 1;
		} else if (walletType === 'multi') {
			showCancelConfirmation = false;
			selectedWalletBrand = '';
			if (step === 5) {
				handleResetWalletData();
				step = 3;
			} else if (step === 3 || importXpubFromDevice.length === requiredSigners) {
				importedDevices = [];
				importedDevicesMirror = [];
				vaultCompletedKeys = 0;
				handleResetWalletData();
				step = 1;
			} else if (step === 6) {
				importedDevices = [];
				importedDevicesMirror = [];
				vaultCompletedKeys = 0;
				handleResetWalletData();
				step = 1;
			}
		}
	};

	const handleExportConfigFile = async () => {
		// throo error if walletconfig empty && handle cancel
		const exported_config = {
			...$configData,
		};

		exportingInProgress = true;

		try {
			await window.api.ipcRenderer.invoke('config:export-encrypted-config-file-dialog', { exported_config });
			exportingInProgress = false;
			exportingDone = true;
		} catch (error) {
			exportingInProgress = false;
			exportingFailed = true;
		}
	};

	//  *** Account Data ***
	const getNetworkBlockHeight = async () => {
		try {
			$bitcoinNetworkBlockHeight = await window.api.ipcRenderer.invoke('data:get-bitcoin-network-block-height');
		} catch (error) {
			console.log('error on updating the block height', error);
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

	const updateCurrentAccountData = async () => {
		filterNetworkConfigData();

		try {
			if (walletType === 'single') {
				$configsCurrentDataWalletsArray = [
					...$configsCurrentDataWalletsArray,
					await window.api.ipcRenderer.invoke('config:get-accounts-data', {
						config: $currentNetworkConfigData.wallets[$currentNetworkConfigData.wallets.length - 1],
					}),
				];

				$configSelectedCurrentData = $configsCurrentDataWalletsArray[$configsCurrentDataWalletsArray.length - 1];
			} else {
				$configsCurrentDataVaultsArray = [
					...$configsCurrentDataVaultsArray,
					await window.api.ipcRenderer.invoke('config:get-accounts-data', {
						config: $currentNetworkConfigData.vaults[$currentNetworkConfigData.vaults.length - 1],
					}),
				];

				$configSelectedCurrentData = $configsCurrentDataVaultsArray[$configsCurrentDataVaultsArray.length - 1];

				microSDColdcardExportLoading = false;
			}
		} catch (error) {
			console.log('Error on updating account data', error);
			await timer(5000);
			updateCurrentAccountData();
		}
	};

	const preloadAccountData = () => {
		if (navigatorOnline) {
			updateCurrentAccountData();
			getCurrentBitcoinPrices();
			getBicoinMarketData();
			getHistoricalBitcoinPrice();
			getNetworkBlockHeight();
		}
	};

	const handleCreateVault = () => {
		step = 3;
	};

	// *** Vault ***
	const handleInitMultiSigKey = () => {
		step = 4;
		initFirstScanning();
	};

	const confirmAddedKeyToVault = async () => {
		importedDevices = [...importedDevices, { ...scannedWalletData, xpub: extractedXpub, configName: configName }];
		console.log('importedDevices', importedDevices);
		if (extractedXpubMirror) {
			importedDevicesMirror = [{ ...scannedWalletData, xpub: extractedXpubMirror, configName: configName }];
		}
		vaultCompletedKeys += 1;

		selectedWalletBrand = '';
		step = 3;
	};

	const setupMultiSig = async () => {
		try {
			const configObject = await window.api.ipcRenderer.invoke('config:create-multisig', {
				importedDevices: importedDevices,
				requiredSigners: 2,
				testnet: $bitcoinTestnetNetwork,
			});

			if (isObjectEmpty($configData)) {
				$configData = configObject;
			} else {
				$configData.vaults.push(...configObject.vaults);
				$configData.keys.push(...configObject.keys);
			}

			if (importedDevicesMirror.length === importedDevices.length) {
				const configObjectMirror = await window.api.ipcRenderer.invoke('config:create-multisig', {
					importedDevices: importedDevicesMirror,
					requiredSigners: 2,
					testnet: !$bitcoinTestnetNetwork,
				});

				if (isObjectEmpty($configData)) {
					$configData = configObjectMirror;
				} else {
					$configData.vaults.push(...configObjectMirror.vaults);
					$configData.keys.push(...configObjectMirror.keys);
				}
			}

			if (importedDevices.some(device => device.type === 'coldcard')) {
				microSDColdcardExportLoading = true;
				microSDColdcardExportOverlay = true;
			}

			preloadAccountData();

			step = 6;
		} catch (error) {
			console.log('Error on creating vault config file');
		}
	};

	const handleShowConfigFileAlert = () => {
		showConfigFileAlert = true;
	};

	const handleHideConfigFileAlert = () => {
		showConfigFileAlert = false;
	};

	const handleExportConfigDone = () => {
		showConfigFileAlert = false;
		replace(`/dashboard${newAdded ? '?updatedconfig=true' : ''}`);
	};

	const handleHideColdcardExportOverlay = () => {
		microSDColdcardExportOverlay = false;
	};

	const handleExportColdCardBlob = async () => {
		if (!microSDColdcardExportLoading) {
			await window.api.ipcRenderer.invoke('config:export-coldcard-multisig-setup', {
				// use current config check config data on other files
				requiredSigners: $configSelectedCurrentData.config.quorum.requiredSigners,
				totalSigners: $configSelectedCurrentData.config.quorum.totalSigners,
				accountName: $configSelectedCurrentData.config.name,
				importedDevices: $configSelectedCurrentData.config.extendedPublicKeys,
			});
		}
	};

	onMount(async () => {
		// We listen for network status changes
		window.addEventListener('online', () => {
			navigatorOnline = true;
		});

		window.addEventListener('offline', () => {
			navigatorOnline = false;
		});
	});
</script>

<section class="container-fluid">
	<div class="columns has-text-centered">
		<div class="column mt-5 mb-6 top-hero">
			{#if step === 0}
				<h1 class="title has-subtitle-margin">Pick what works for you</h1>
				<p class="subtitle is-5">Either way, hold your own keys</p>
			{:else if walletType === 'single'}
				{#if step === 1}
					<h1 class="title has-subtitle-margin">Creating your wallet</h1>
					<p class="subtitle is-5">Let’s add some details</p>
				{:else if step === 2}
					<h1 class="title has-subtitle-margin">Creating your wallet</h1>
					<p class="subtitle is-5">It's time to connect your hardware device</p>
				{:else if step === 3}
					<h1 class="title has-subtitle-margin">Creating your wallet</h1>
					{#if extractedXpub}
						<p class="subtitle is-5">Hardware device successfully added</p>
					{:else}
						<p class="subtitle is-5">About to read the key from your hardware device</p>
					{/if}
				{:else if step === 4}
					<h1 class="title has-subtitle-margin">Your wallet is created</h1>
					<p class="subtitle is-5">Just one last thing before you’re done</p>
				{/if}
			{:else if walletType === 'multi'}
				{#if step === 1}
					<h1 class="title has-subtitle-margin">Pick your multisig vault</h1>
					<p class="subtitle is-5">Use as many keys as you want</p>
				{:else if step === 2}
					<h1 class="title has-subtitle-margin">Creating your {requiredSigners} of {totalSigners} vault</h1>
					<p class="subtitle is-5">Let’s add some details</p>
				{:else if step === 3 || step === 4}
					{#if vaultCompletedKeys < totalSigners}
						<h1 class="title has-subtitle-margin">Creating your {requiredSigners} of {totalSigners} vault</h1>
						<p class="subtitle is-5">
							It's time connect your {numberToOrdinalLabel(vaultCompletedKeys + 1)} hardware device
						</p>
					{:else}
						<h1 class="title has-subtitle-margin">Your {requiredSigners} of {totalSigners} vault is ready!</h1>
						<p class="subtitle is-5">Review the details</p>
					{/if}
				{:else if step === 5}
					<h1 class="title has-subtitle-margin">Your {requiredSigners} of {totalSigners} vault</h1>
					{#if extractedXpub}
						<p class="subtitle is-5">Hardware device successfully added</p>
					{:else}
						<p class="subtitle is-5">About to read the key from your hardware device</p>
					{/if}
				{:else if step === 6}
					<h1 class="title has-subtitle-margin">Your {requiredSigners} of {totalSigners} vault is now complete</h1>
					<p class="subtitle is-5">Just one last thing before you’re done</p>
				{/if}
			{/if}
		</div>
	</div>

	<div class="cards">
		{#if step === 0}
			<div class="card-action">
				<ConfigTypeChoice on:walletSelected={handleWalletSelected} on:vaultSelected={handleVaultSelected} />
			</div>
		{:else if walletType === 'single' && step !== 4}
			{#if step === 1}
				<div class="card-action">
					<WalletDetailsSingleSig
						{selectedWalletBrand}
						exportedName={configName}
						on:walletDeviceChange={updateWalletSelected}
						on:walletNameChange={updateWalletName}
					/>
				</div>
			{:else if !showMicroSDModel && (step === 2 || step === 3)}
				<div class="card-action">
					<Extraction
						{deviceScanning}
						{exportingInProgress}
						{extractedFromMicroSD}
						{extractedXpub}
						{retryXpubExtration}
						{scannedWalletData}
						{selectedWalletBrand}
						{step}
						{walletNeedPinSent}
						{walletType}
						on:startExtraction={handleExtraction}
						on:cancelExtraction={handleCancelExtraction}
						on:cancelScanning={handleScanningStop}
						on:launchRescanning={initFirstScanning}
						on:retryExtraction={handleRetryExtraction}
						on:extractFromMicroSD={handleShowExtractFromMicroSD}
						on:showXpub={() => handleShowXpubOverlay(extractedXpub)}
					/>
				</div>
			{:else if showMicroSDModel && step === 2}
				<div class="card-action">
					<ColdCardMicroSD {walletType} on:uploadFromMicroSD={handleExtractFromMicroSD} />
				</div>
			{/if}
		{:else if walletType === 'multi' && step !== 6}
			{#if step === 1}
				<div class="card-action">
					<QuorumChoiceMultiSig on:userSelect2of3={handle2of3Selected} />
				</div>
			{:else if step === 2}
				<div class="card-action">
					<VaultConfigDetailsMultiSig on:walletNameChange={updateWalletName} exportedName={configName} />
				</div>
			{:else if step === 3}
				<div class="card-action">
					<KeysChoice2of3MultiSig {importedDevices} {selectedWalletBrand} on:walletDeviceChange={updateWalletSelected} />
				</div>
			{:else if !showMicroSDModel && (step === 4 || step === 5)}
				<div class="card-action">
					<Extraction
						{deviceScanning}
						{exportingInProgress}
						{extractedFromMicroSD}
						{extractedXpub}
						{retryXpubExtration}
						{scannedWalletData}
						{selectedWalletBrand}
						{step}
						{vaultCompletedKeys}
						{walletNeedPinSent}
						{walletType}
						on:startExtraction={handleExtraction}
						on:cancelExtraction={handleCancelExtraction}
						on:cancelScanning={handleScanningStop}
						on:launchRescanning={initFirstScanning}
						on:retryExtraction={handleRetryExtraction}
						on:extractFromMicroSD={handleShowExtractFromMicroSD}
						on:showXpub={() => handleShowXpubOverlay(extractedXpub)}
					/>
				</div>
			{:else if showMicroSDModel && step === 4}
				<div class="card-action">
					<ColdCardMicroSD
						{walletType}
						on:uploadFromMicroSD={handleExtractFromMicroSD}
						on:cancelImportingFromMicroSD={handleCancelImportingFromMicroSD}
						on:retryImportingFromMicroSD={handleShowExtractFromMicroSD}
					/>
				</div>
			{/if}
		{:else if (walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)}
			<div class="card-action">
				<ConfirmConfig {importedDevices} {configName} {walletType} />
			</div>
		{/if}
	</div>

	<div class="container-action">
		<div class="buttons">
			<!-- Back Button -->
			{#if step === 0}
				<Button text="Back" buttonClass="is-primary is-outlined" icon="arrowBack" on:buttonClicked={handleBackButton} />
			{:else if walletType === 'single' && step !== 4}
				{#if extractedXpub && step !== 1}
					<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleShowCancelConfirmationAlert} />
				{:else}
					<Button
						text={newAdded && step === 1 ? 'Cancel new wallet' : 'Back'}
						icon={newAdded && step === 1 ? '' : 'arrowBack'}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleBackButton}
					/>
				{/if}
			{:else if walletType === 'multi' && step !== 6}
				{#if extractedXpub && step >= 4 && step !== 2}
					<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleShowCancelConfirmationAlert} />
				{:else if vaultCompletedKeys >= 1 && step === 3}
					<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleShowCancelConfirmationAlert} />
				{:else}
					<Button
						text={newAdded && step === 1 ? 'Cancel new vault' : 'Back'}
						icon={newAdded && step === 1 ? '' : 'arrowBack'}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleBackButton}
					/>
				{/if}
			{/if}

			{#if walletType === 'single' && step !== 4}
				{#if step === 1}
					<Button
						text="Create wallet"
						title={!configName ? 'Enter a name for your wallet and selected the hardware device to continue' : ''}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={handleInitSingleKey}
						buttonDisabled={!configName || !selectedWalletBrand}
					/>
				{:else if (step === 2 || step === 3) && !showMicroSDModel}
					<Button
						text="Confirm your wallet"
						title={extractedXpub ? 'Please wait for the extraction to be completed' : ''}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={confirmSingleWallet}
						buttonDisabled={!extractedXpub}
					/>
				{/if}
			{:else if walletType === 'multi' && step !== 6}
				{#if step === 2}
					<Button
						text="Create vault"
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={handleCreateVault}
						title={configName ? '' : 'Enter a name for your vault to continue'}
						buttonDisabled={!configName}
					/>
				{:else if step === 3 && vaultCompletedKeys !== totalSigners}
					<Button
						text={`Add ${numberToOrdinalLabel(vaultCompletedKeys + 1)} key to your vault`}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={handleInitMultiSigKey}
						title={selectedWalletBrand ? '' : 'Select a hardware device to continue'}
						buttonDisabled={!selectedWalletBrand}
					/>
				{:else if step === 3 && vaultCompletedKeys === totalSigners}
					<Button
						text="Confirm your vault"
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={setupMultiSig}
						buttonDisabled={vaultCompletedKeys !== totalSigners}
					/>
				{:else if (step === 4 || step === 5) && !showMicroSDModel}
					<Button
						text="Confirm this hardware device"
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={confirmAddedKeyToVault}
						buttonDisabled={!extractedXpub}
						title={!extractedXpub ? 'Please wait for the extraction to be completed' : ''}
					/>
				{/if}
			{/if}

			{#if (walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)}
				<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleShowCancelConfirmationAlert} />
				<Button
					text={`Download ${newAdded ? 'updated' : ''} config file and access dashboard`}
					buttonClass="is-primary"
					on:buttonClicked={handleShowConfigFileAlert}
				/>
			{/if}
		</div>
	</div>
</section>

<HeroSocialFooter />

<!-- Overlay -->
{#if showCancelConfirmation}
	{#if walletType === 'multi' && step !== 6 && (step === 4 || step === 5)}
		<Overlay title="Hardware device was not added" titleIsLeft disableClosing>
			<p class="mt-2 mb-6">
				Are you sure you want to cancel? You will have to add another hardware device once again.<br />This one will not be saved to your vault.
			</p>
			<div class="buttons is-centered mt-6">
				<Button text="Back" buttonClass="is-primary is-outlined" on:buttonClicked={handleContinueConfirmation} />
				<Button text="Yes, cancel" buttonClass="is-primary" on:buttonClicked={handleCancelConfirmation} />
			</div>
		</Overlay>
	{:else if walletType === 'multi' && vaultCompletedKeys >= 1}
		<Overlay title="Vault was not created just yet" titleIsLeft disableClosing>
			<p class="mt-2 mb-6">
				Are you sure you want to cancel? Your current vault will not be saved.<br />You will have to add your hardware devices all over again.
			</p>
			<div class="buttons is-centered mt-6">
				<Button text="Back" buttonClass="is-primary is-outlined" on:buttonClicked={handleContinueConfirmation} />
				<Button text="Yes, cancel" buttonClass="is-primary" on:buttonClicked={handleCancelConfirmation} />
			</div>
		</Overlay>
	{:else}
		<Overlay title="Wallet was not created just yet" titleIsLeft disableClosing>
			<p class="mt-2 mb-6">Are you sure you want to cancel? You will have to add another hardware device once again.<br />This one will not be saved.</p>
			<div class="buttons is-centered mt-6">
				<Button text="Back" buttonClass="is-primary is-outlined" on:buttonClicked={handleContinueConfirmation} />
				<Button text="Yes, cancel" buttonClass="is-primary" on:buttonClicked={handleCancelConfirmation} />
			</div>
		</Overlay>
	{/if}
{/if}

{#if deviceNotInitialized}
	<Overlay
		title="Hardware device not active yet"
		subtitle={'You need to initialize your ' + scannedWalletData.model.split('_').join(' ')}
		titleIsLeft
		disableClosing
	>
		<p class="mt-2">
			We recommend that you read the official documentation from {scannedWalletData.model.split('_')[0]} available on
			<span
				class="is-link has-text-weight-semibold"
				on:click={() =>
					openUrl(
						scannedWalletData.model.toLowerCase().split('_')[0] === 'coldcard'
							? 'coldcard-docs'
							: scannedWalletData.model.toLowerCase().split('_')[0] === 'ledger'
							? 'ledger-doc'
							: 'trezor-docs',
					)}>this website</span
			>.<br />Reach out to us on our
			<span class="is-link has-text-weight-semibold" on:click={() => openUrl('telegram')}>Telegram</span>
			if you have any questions.
		</p>
		<div class="buttons is-right mt-6">
			<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelCreation} />
			<Button text="Retry scanning" buttonClass="is-primary" on:buttonClicked={initFirstScanning} />
		</div>
	</Overlay>
{/if}

<!-- TODO: brand is-capitalized button and title -->
{#if wrongDeviceDetected}
	<Overlay
		title="Wrong device detected"
		subtitle={'Do you want to switch for ' + scannedWalletData.model.split('_').join(' ') + '?'}
		titleIsLeft
		disableClosing
	>
		{#if scannedWalletData.model.split('_')[0] === 'ledger'}
			<img class="overlay-wallet-image" src={ledgerLogo} alt="Ledger" />
		{:else if scannedWalletData.model.split('_')[0] === 'coldcard'}
			<img class="overlay-wallet-image" src={coldcardLogo} alt="Coldcard" />
		{:else if scannedWalletData.model.split('_')[0] === 'trezor'}
			<img class="overlay-wallet-image" src={trezorLogo} alt="Trezor" />
		{/if}
		<div class="buttons is-centered mt-6">
			<Button text="Retry scanning" buttonClass="is-primary is-outlined" on:buttonClicked={initFirstScanning} />
			<Button text={'Switch for ' + scannedWalletData.model.split('_').join(' ')} buttonClass="is-primary" on:buttonClicked={handleSwitchDevice} />
		</div>
	</Overlay>
{/if}

{#if microSDUploadError}
	<Overlay title="Couldn't import via Micro SD" titleIsLeft disableClosing>
		<p class="mt-2">Make sure the proper file was selected.</p>
		<p class="mb-5">
			The default file name may be: "<span class="has-text-weight-medium">
				{#if walletType === 'single'}coldcard-export.json{:else}ccxp-XXXXXXXX.json{/if}</span
			>".
		</p>
		<div class="buttons is-right mt-6">
			<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelImportingFromMicroSD} />
			<Button text="Retry Micro SD import" buttonClass="is-primary" on:buttonClicked={handleExtractFromMicroSD} />
		</div>
	</Overlay>
{/if}

{#if extractedXpubWrongNetwork}
	<Overlay title={'Coldcard is not on ' + ($bitcoinTestnetNetwork ? 'Testnet' : 'Mainnet')} titleIsLeft disableClosing>
		<p class="mt-2">
			Your Coldcard is currently on {$bitcoinTestnetNetwork ? 'Mainnet' : 'Testnet'}. You need to change this to {$bitcoinTestnetNetwork
				? 'Testnet'
				: 'Mainnet'} to added to your {walletType === 'single' ? 'wallet' : 'vault'}.
		</p>
		<p class="mb-5">
			To do so, go to:
			<span class="has-text-weight-bold">Advanced > Danger Zone > Testnet mode > Select: {$bitcoinTestnetNetwork ? 'Testnet: BTC' : 'Bitcoin'}</span>.
		</p>
		<div class="buttons is-right mt-6">
			<!-- <Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelCreation} /> -->
			<Button text="Retry" buttonClass="is-primary" on:buttonClicked={handleRetryExtraction} />
		</div>
	</Overlay>
{/if}

{#if deviceAlreadyAdded}
	<Overlay title="Device already added" titleIsLeft disableClosing>
		{#if scannedWalletData.model.split('_')[0] === 'ledger'}
			<img class="overlay-wallet-image" src={ledgerLogo} alt="Ledger" />
		{:else if scannedWalletData.model.split('_')[0] === 'coldcard'}
			<img class="overlay-wallet-image" src={coldcardLogo} alt="Coldcard" />
		{:else if scannedWalletData.model.split('_')[0] === 'trezor'}
			<img class="overlay-wallet-image" src={trezorLogo} alt="Trezor" />
		{/if}
		<p class="is-uppercase has-text-centered has-text-weight-medium mt-5 mb-2">
			{scannedWalletData.model.split('_').join(' ')} ({scannedWalletData.fingerprint})
		</p>
		<div class="buttons is-centered mt-6">
			<Button text="Retry scanning" buttonClass="is-primary" on:buttonClicked={initFirstScanning} />
		</div>
	</Overlay>
{/if}

{#if showPinOverlay}
	<Overlay
		title="Unlock your Trezor"
		subtitle={trezorPinMessage}
		titleIsLeft={lockClosingPinOverlay}
		disableClosing={lockClosingPinOverlay}
		on:closeOverlayClicked={handleHidePinOverlay}
	>
		<div class="trezor-overlay mt-5">
			<TrezorNumberPad {trezorError} {trezorLockPinKey} on:replugTrezorDevice={handleReplugTrezorDevice} on:sendPin={sendPin} />
		</div>
	</Overlay>
{/if}

{#if microSDColdcardExportOverlay && step === 6}
	<Overlay title="Export vault setup to your Coldcard" titleIsLeft disableClosing on:closeOverlayClicked={handleHideColdcardExportOverlay}>
		<div class="overlay-coldcard-export">
			<p class="has-text-justified">
				Import that file into the Coldcard via a Micro SD card so that it can sign transactions along with the other hardware devices from the same vault. On
				the Coldcard, go to "Settings > Multisig Wallets > Import from SD". You'll have a chance to view the details of the wallet before accepting it.
			</p>
			{#if microSDColdcardExportLoading}
				<p class="has-text-weight-semibold">Generating setup file, please wait</p>
			{/if}
			<div class="buttons is-right mt-6">
				<Button text="Skip, for now" buttonClass="is-primary is-outlined" on:buttonClicked={handleHideColdcardExportOverlay} />
				<Button
					text="Export Coldcard multisig setup"
					buttonClass="is-primary"
					on:buttonClicked={handleExportColdCardBlob}
					loading={microSDColdcardExportLoading}
				/>
			</div>
		</div>
	</Overlay>
{/if}

{#if showXpubOverlay && !showPinOverlay}
	<OverlayV2 on:closeOverlayClicked={handleHideXpubOverlay}>
		<span slot="title"
			>Extended public key from your
			{selectedWalletBrand === 'ledger' ? 'Ledger' : selectedWalletBrand === 'coldcard' ? 'Coldcard' : selectedWalletBrand === 'trezor' ? 'Trezor' : 'wallet'}
			<span class="is-uppercase">({scannedWalletData.fingerprint})</span></span
		>
		<div class="xpub-overlay">
			<div class="qrcode-img mt-6 has-text-centered">
				<!-- <QrCode value={extractedXpub} background={'#dcd9d1'} /> -->
				<QrCode value={extractedXpub} background={'#fefefe'} />
			</div>
			<p class="subtitle is-5 is-selectable">{extractedXpub}</p>
		</div>
	</OverlayV2>
{/if}

{#if showConfigFileAlert}
	<Overlay
		title={exportingDone ? 'Config file exported  ✓' : newAdded ? 'Download your updated config file' : 'Download config file'}
		subtitle={exportingDone ? '' : 'Your config file explains where to find your bitcoin.'}
		titleIsLeft
		disableClosing
	>
		<div class="overlay-configfile">
			{#if exportingDone}
				<p class="mt-3 mb-2">
					It's important to store your config file in a secure place with your key backups, for instance. It doesn't hold any private key, but is enough to give
					access to all account balances and transaction history.
				</p>
			{:else}
				{#if newAdded}
					<p class="mt-3 mb-2">
						It's important to store your config file in a secure place with your key backups, for instance. It doesn't hold any private key, but is enough to
						give access to all account balances and transaction history. Your config file was updated with your new vault. Make sure that you download and
						securely store your updated config file, which includes details from your previous setup with the new wallet or vault that you have just created.
					</p>
					<p class="mt-3 mb-2">
						You are only exporting your {walletType === 'single' ? 'wallet' : 'vault'} details. No account will be created with Dux Reserve for now, which means
						that you are 100% responsible for taking care of your config file. We do not keep any copy of it. For now, you will have to upload this file anytime
						you want to access your wallet(s) or vault(s).
					</p>
				{:else}
					<p class="mt-3 mb-2">
						It's important to store your config file in a secure place with your key backups, for instance. It doesn't hold any private key, but is enough to
						give access to all account balances and transaction history.
					</p>
					<p class="mt-3 mb-2">
						You are only exporting your {walletType === 'single' ? 'wallet' : 'vault'} details. No account will be created with Dux Reserve for now, which means
						that you are 100% responsible for taking care of your config file. We do not keep any copy of it.
					</p>
				{/if}
				<p class="mb-6">You will have to upload this file anytime you want to access your wallet(s) or vault(s).</p>
			{/if}
			<div class="buttons is-right mt-6">
				{#if exportingDone}
					<Button text="Access my dashboard" buttonClass="is-primary" on:buttonClicked={handleExportConfigDone} />
				{:else}
					<Button text="Back" buttonClass="is-primary is-outlined" on:buttonClicked={handleHideConfigFileAlert} />
					<Button text="Yes, export config file" buttonClass="is-primary" on:buttonClicked={handleExportConfigFile} />
				{/if}
			</div>
		</div>
	</Overlay>
{/if}

<style lang="scss">
	.container-fluid {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: calc(100vh - 168px);
	}

	.container-action {
		width: 100vw;
		max-width: 892px !important;
		margin-top: 3rem;
		margin-right: auto;
		margin-bottom: 2.5rem;
		margin-left: auto;

		.buttons {
			display: flex;
			justify-content: space-between;
			width: 100%;
		}
	}

	.cards {
		display: grid;
		align-items: center;
		min-height: 390px;
	}

	.card-action {
		grid-column: 1/2;
		grid-row: 1/2;
	}

	.check-circle {
		justify-content: space-around;
		margin-top: 3.5rem;

		img {
			width: 121px;
		}
	}

	.overlay-wallet-image {
		display: block;
		width: auto;
		height: 165px;
		margin: 2rem auto;
		object-fit: cover;
	}

	.overlay-configfile,
	.overlay-coldcard-export {
		max-width: 800px;
	}

	.trezor-overlay {
		min-width: 620px;
	}

	.xpub-overlay {
		max-width: 780px;
		margin-right: auto;
		margin-left: auto;
	}

	.qrcode-img {
		width: auto;
		padding: 0 !important;
		margin-bottom: 20px;
		// filter: invert(1);
		object-fit: cover;
	}

	@media (min-height: 769px) {
		.container-action {
			margin-top: 3.8rem;
		}
	}

	@media (min-height: 900px) {
		.container-action {
			margin-top: 4.21rem;
		}
	}
</style>
