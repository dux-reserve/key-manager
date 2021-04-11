<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { location, replace } from 'svelte-spa-router';
	import { _ } from 'svelte-i18n';
	import QrCode from 'svelte-qrcode';
	import {
		applicationSettings,
		bitcoinChartArrayData,
		bitcoinCurrentPrices,
		bitcoinMarketData,
		bitcoinNetworkBlockHeight,
		bitcoinTestnetNetwork,
		configData,
		configsCurrentDataVaultsArray,
		configsCurrentDataWalletsArray,
		configSelectedCurrentData,
		currentNetworkConfigData,
		disableNetworkQuickSettings,
		selectedCurrency,
		withCustomUserPassword,
	} from '../../../store';
	import { isObjectEmpty, numberToOrdinalEnglishLabel, numberToOrdinalFrenchLabel, timer } from '../../../utils/helpers';

	import Button from '../../ui/Button.svelte';
	import TrezorNumberPad from '../../hardware/TrezorNumberPad.svelte';
	import HeroSocialFooter from '../../ui/SocialFooter.svelte';
	import Overlay from '../../ui/Overlay.svelte';
	import OverlayV2 from '../../ui/OverlayV2.svelte';

	import ConfigTypeChoice from '../../config/creation/ConfigTypeChoice.svelte'; // Step 0
	import UserPassword from './UserPassword.svelte'; // Step 1

	// Wallet
	import WalletDetailsSingleSig from './singlekey/WalletConfigDetails.svelte'; // Step 2

	// Vault
	import QuorumChoiceMultiSig from './multikey/QuorumChoice.svelte'; // Step 2
	import VaultConfigDetailsMultiSig from './multikey/VaultConfigDetails.svelte'; // Step 3
	import KeysChoice2of3MultiSig from './multikey/KeysChoice2of3.svelte'; // Step 4

	import Extraction from './Extraction.svelte'; // Single Steps 3 & 4 || Multi Steps 5 & 6
	import ConfirmConfig from '../../config/creation/ConfirmConfig.svelte'; // Last Step | Single: 5 | Multi: 7

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

	let cancelXpubExtration = false;
	let configName = '';
	let deviceAlreadyAdded = false;
	let deviceNotInitialized = false;
	let deviceScanning = false;
	let exportingDone = false;
	let exportingInProgress = false;
	let extractedFromMicroSD = false;
	let extractedXpub = '';
	let extractedXpubMirror = '';
	let extractedXpubWrongNetwork = false;
	let importedDevices = [];
	let importedDevicesMirror = [];
	let lockClosingPinOverlay = false;
	let microSDColdcardExportOverlay = false;
	let microSDColdcardExportOverlayStep = 0;
	let microSDUploadError = false;
	let overlayXpub = '';
	let requiredSigners = 2;
	let retryXpubExtration = false;
	let scannedDevices = [];
	let scannedWalletData = {};
	let selectedWalletBrand = '';
	let showCancelConfirmation = false;
	let showConfigFileOverlay = false;
	let showMicroSDModel = false;
	let showPinOverlay = false;
	let showXpubOverlay = false;
	let totalSigners = 3;
	let trezorError = false;
	let trezorLockPinKey = false;
	let trezorPinMessage = '';
	let userPassword = '';
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
		cancelXpubExtration = false;
		deviceAlreadyAdded = false;
		deviceNotInitialized = false;
		deviceScanning = false;
		exportingDone = false;
		exportingInProgress = false;
		extractedFromMicroSD = false;
		extractedXpub = '';
		extractedXpubMirror = '';
		extractedXpubWrongNetwork = false;
		lockClosingPinOverlay = false;
		microSDColdcardExportOverlay = false;
		microSDUploadError = false;
		overlayXpub = '';
		retryXpubExtration = false;
		scannedDevices = [];
		scannedWalletData = {};
		showCancelConfirmation = false;
		showConfigFileOverlay = false;
		showPinOverlay = false;
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
			if (response.some(hardware => hardware.type === 'trezor' && hardware.code == -13)) {
				deviceScanning = false;
				trezorPinMessage = $_('creation.main.trezor_something_went_wrong', { default: 'Something went wrong. Please unplug and re-plug your Trezor & retry' });
				showPinOverlay = true;
				trezorError = true;
			} else if (deviceScanning && !showMicroSDModel && ((walletType === 'single' && step > 2) || (walletType === 'multi' && step > 4))) {
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

			if (device.fingerprint === undefined) throw new error('No fingerprint found');

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

			// Wordaround sometimes get-xpub lag, that's look ugly though
			setTimeout(() => {
				if (
					!extractedXpub &&
					!cancelXpubExtration &&
					!retryXpubExtration &&
					!showMicroSDModel &&
					((walletType === 'single' && step > 2) || (walletType === 'multi' && step > 4))
				) {
					if (importXpubFromDevice.length === 0) $disableNetworkQuickSettings = false;
					exportingInProgress = false;
					retryXpubExtration = true;
				}
			}, 10210);
		}
	};

	const handleScanningStop = () => {
		deviceScanning = false;

		if (importXpubFromDevice.length === 0) $disableNetworkQuickSettings = false;
	};

	const handleDeviceNotInitialized = () => {
		deviceScanning = false;
		deviceNotInitialized = true;

		if (importXpubFromDevice.length === 0) $disableNetworkQuickSettings = false;
	};

	const handleCancelExtraction = () => {
		cancelXpubExtration = true;
		retryXpubExtration = true;
		extractedXpub = '';
		extractedXpubMirror = '';

		if (importXpubFromDevice.length === 0) $disableNetworkQuickSettings = false;
	};

	const handleCancelCreation = () => {
		vaultCompletedKeys = 0;
		requiredSigners = 2;
		totalSigners = 3;
		importedDevices = [];
		importedDevicesMirror = [];
		handleResetWalletData();
		if (walletType === 'single') {
			step = 2;
		} else if (walletType === 'multi') {
			step = 3;
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
		if (!extractedXpub && ((walletType === 'single' && step > 2) || (walletType === 'multi' && step > 4))) {
			if (walletNeedPinSent && scannedWalletData.type === 'trezor') {
				trezorPinMessage = $_('creation.main.trezor_pin_layout', { default: 'PIN layout is displayed on your device' });
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
		$disableNetworkQuickSettings = true;
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
						handleScanningStop();
						if (walletType === 'multi' && verifyIfDeviceIsalreadyAdded()) break;
					}
				}
				if (!isObjectEmpty(scannedWalletData)) {
					if (scannedWalletData.code == -18 || scannedWalletData.fingerprint === '00000000') {
						handleDeviceNotInitialized();
						break;
					} else {
						if (walletType === 'single') {
							step = 4;
						} else if (walletType === 'multi') {
							step = 6;
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
		$disableNetworkQuickSettings = true;
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
				step = 4;
			} else if (walletType === 'multi') {
				step = 6;
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

			step = 5;
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
		step = 3;
	};

	// *** UserPIN ***
	// Step 1
	const handleCreatedUserPassword = ({ detail }) => {
		userPassword = String(detail);
		$withCustomUserPassword = true;
		step = 2;
	};

	const handleSkipPasswordCreation = () => {
		userPassword = '';
		if (!newAdded) {
			$withCustomUserPassword = false;
		}
		step = 2;
	};

	// *** Wallet ***
	// Step 2
	const handleInitSingleKey = () => {
		step = 3;
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
		trezorPinMessage = $_('creation.main.trezor_pin_layout', { default: 'PIN layout is displayed on your device' });
	};

	const handleTrezorExtraction = async device => {
		showPinOverlay = true;
		trezorError = false;
		try {
			await window.api.ipcRenderer.invoke('hwi:prompt-pin', {
				device: device,
			});
		} catch (error) {
			trezorPinMessage = $_('creation.main.trezor_something_went_wrong', { default: 'Something went wrong. Please unplug and re-plug your Trezor & retry' });
			trezorError = true;
		}
	};

	const sendPin = async pin => {
		lockClosingPinOverlay = true;
		trezorLockPinKey = true;
		trezorPinMessage = $_('creation.main.trezor_pin_verifying', { default: 'Verifying Trezor PIN' });

		if (pin.length < 1) {
			trezorPinMessage = $_('creation.main.trezor_pin_incorrect', { default: 'Incorrect PIN - Please retry' });
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
				$disableNetworkQuickSettings = true;
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
				trezorPinMessage = $_('creation.main.trezor_pin_incorrect', { default: 'Incorrect PIN - Please retry' });
				trezorLockPinKey = false;
				await handleTrezorExtraction(scannedWalletData);
			}
		} catch (error) {
			trezorPinMessage = $_('creation.main.trezor_something_went_wrong', { default: 'Something went wrong. Please unplug and re-plug your Trezor & retry' });
			trezorError = true;
		} finally {
			lockClosingPinOverlay = false;
		}
	};

	const handleShowExtractFromMicroSD = async () => {
		handleResetWalletData();
		if (walletType === 'single') {
			step = 3;
		} else if (walletType === 'multi') {
			step = 5;
		}
		showMicroSDModel = true;
	};

	const handleCancelImportingFromMicroSD = async () => {
		handleResetWalletData();
		handleScanningStop();
		if (walletType === 'single') {
			step = 3;
		} else if (walletType === 'multi') {
			step = 5;
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
					step = 4;
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
					step = 6;
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
			step = 3;
			initFirstScanning();
		} else if (walletType === 'multi') {
			step = 4;
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
			walletType = '';
			userPassword = '';
			if (!newAdded) {
				$withCustomUserPassword = false;
			}
			step = 0;
		} else if (step === 1 && newAdded) {
			dispatch('showAlertCreation');
		} else if (step === 2) {
			configName = '';
			selectedWalletBrand = '';
			step = 1;
		} else if (walletType === 'single' && !showMicroSDModel && (step === 3 || step === 4)) {
			importedDevices = [];
			importedDevicesMirror = [];
			handleResetWalletData();
			step = 2;
		} else if (walletType === 'single' && showMicroSDModel && (step === 3 || step === 4)) {
			importedDevices = [];
			importedDevicesMirror = [];
			showMicroSDModel = false;
			handleResetWalletData();
			step = 3;
		} else if (walletType === 'multi' && step === 3) {
			configName = '';
			importedDevices = [];
			importedDevicesMirror = [];
			handleResetWalletData();
			step = 2;
		} else if (walletType === 'multi' && step === 4) {
			selectedWalletBrand = '';
			handleResetWalletData();
			step = 3;
		} else if (walletType === 'multi' && !showMicroSDModel && (step === 5 || step === 6)) {
			handleResetWalletData();
			step = 4;
		} else if (walletType === 'multi' && showMicroSDModel && (step === 5 || step === 6)) {
			showMicroSDModel = false;
			handleResetWalletData();
			step = 5;
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
			$disableNetworkQuickSettings = false;
			handleResetWalletData();
			step = 2;
		} else if (walletType === 'multi') {
			showCancelConfirmation = false;
			selectedWalletBrand = '';
			if (step === 6) {
				if (importXpubFromDevice.length === 1) $disableNetworkQuickSettings = false;
				handleResetWalletData();
				step = 4;
			} else if (step === 4 || importXpubFromDevice.length === requiredSigners) {
				importedDevices = [];
				importedDevicesMirror = [];
				vaultCompletedKeys = 0;
				$disableNetworkQuickSettings = false;
				handleResetWalletData();
				step = 1;
			} else if (step === 7) {
				importedDevices = [];
				importedDevicesMirror = [];
				vaultCompletedKeys = 0;
				$disableNetworkQuickSettings = false;
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
			await window.api.ipcRenderer.invoke('config:export-encrypted-config-file-dialog', { exported_config, userPassword });
			exportingInProgress = false;
			exportingDone = true;
			if (!isObjectEmpty($configData)) {
				await window.api.ipcRenderer.invoke('config:create-file', {
					data: $configData,
					withCustomPassword: $withCustomUserPassword,
					userPassword: userPassword,
				});
			}
		} catch (error) {
			exportingInProgress = false;
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
		step = 4;
	};

	// *** Vault ***
	const handleInitMultiSigKey = () => {
		step = 5;
		initFirstScanning();
	};

	const confirmAddedKeyToVault = async () => {
		importedDevices = [...importedDevices, { ...scannedWalletData, xpub: extractedXpub, configName: configName }];
		if (extractedXpubMirror) {
			importedDevicesMirror = [{ ...scannedWalletData, xpub: extractedXpubMirror, configName: configName }];
		}
		vaultCompletedKeys += 1;

		selectedWalletBrand = '';
		step = 4;
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
				microSDColdcardExportOverlay = true;
			}

			step = 7;
		} catch (error) {
			console.log('Error on creating vault config file');
		}
	};

	const handleShowConfigFileAlert = () => {
		showConfigFileOverlay = true;
		// here
	};

	const handleHideConfigFileAlert = () => {
		showConfigFileOverlay = false;
	};

	const handleExportConfigDone = () => {
		showConfigFileOverlay = false;
		replace(`/dashboard${newAdded ? '?updatedconfig=true' : ''}`);
	};

	const handleHideColdcardExportOverlay = () => {
		microSDColdcardExportOverlay = false;
	};

	const handleExportColdCardBlob = async () => {
		await window.api.ipcRenderer.invoke('config:export-coldcard-multisig-setup', {
			// use current config check config data on other files
			requiredSigners: $configData.vaults[$configData.vaults.length - 1].quorum.requiredSigners,
			totalSigners: $configData.vaults[$configData.vaults.length - 1].quorum.totalSigners,
			accountName: $configData.vaults[$configData.vaults.length - 1].name,
			importedDevices: $configData.vaults[$configData.vaults.length - 1].extendedPublicKeys,
		});

		microSDColdcardExportOverlayStep = 1;
	};

	const handleBackColdcardOverlay = () => {
		microSDColdcardExportOverlayStep = 0;
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
				<h1 class="title has-subtitle-margin">{$_('creation.choice.headline', { default: 'Pick what works for you' })}</h1>
				<p class="subtitle is-5">{$_('creation.choice.subtitle', { default: 'Either way, hold your own keys' })}</p>
			{:else if step === 1}
				{#if newAdded && $withCustomUserPassword}
					<h1 class="title has-subtitle-margin">{$_('creation.user_password.headline_confirm_password', { default: 'Confirm your password' })}</h1>
					<p class="subtitle is-5">{$_('creation.user_password.subtitle_confirm_password', { default: 'Required to add a new account' })}</p>
				{:else}
					<h1 class="title has-subtitle-margin">{$_('creation.user_password.headline_new_password', { default: 'Create your password' })}</h1>
					<p class="subtitle is-5">{$_('creation.user_password.subtitle_new_password', { default: 'Secure the access to your dashboard' })}</p>
				{/if}
			{:else if walletType === 'single'}
				{#if step === 2}
					<h1 class="title has-subtitle-margin">{$_('creation.wallet_details.headline', { default: 'Creating your wallet' })}</h1>
					<p class="subtitle is-5">{$_('creation.wallet_details.subtitle', { default: 'Let’s add some details' })}</p>
				{:else if step === 3}
					<h1 class="title has-subtitle-margin">{$_('creation.wallet_details.headline', { default: 'Creating your wallet' })}</h1>
					<p class="subtitle is-5">{$_('creation.extraction.subtitle_single_1', { default: "It's time to connect your hardware device" })}</p>
				{:else if step === 4}
					<h1 class="title has-subtitle-margin">{$_('creation.extraction.headline_single_2', { default: 'Creating your wallet' })}</h1>
					{#if extractedXpub}
						<p class="subtitle is-5">{$_('creation.extraction.subtitle_single_2_extracted', { default: 'Hardware device successfully added' })}</p>
					{:else}
						<p class="subtitle is-5">{$_('creation.extraction.subtitle_single_2', { default: 'About to read the key from your hardware device' })}</p>
					{/if}
				{:else if step === 5}
					<h1 class="title has-subtitle-margin">
						{$_('creation.confirm_config.headline_your', { default: 'Your' })}
						{$_('creation.confirm_config.vault', { default: 'vault' })}
						{$_('creation.confirm_config.headline_single', { default: 'is now created' })}
					</h1>
					<p class="subtitle is-5">{$_('creation.confirm_config.subtitle_single', { default: 'Just one last thing before you’re done' })}</p>
				{/if}
			{:else if walletType === 'multi'}
				{#if step === 2}
					<h1 class="title has-subtitle-margin">{$_('creation.extraction.headline_multi_1', { default: 'Pick your multisig vault' })}</h1>
					<p class="subtitle is-5">{$_('creation.extraction.subtitle_multi_1', { default: 'Use as many keys as you want' })}</p>
				{:else if step === 3}
					<h1 class="title has-subtitle-margin">
						{$_('creation.extraction.headline_multi_2', { default: 'Creating your' })}
						{#if $applicationSettings.interfaceLanguage === 'en'}
							{requiredSigners}
							{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
							{totalSigners}
							{$_('creation.extraction.vault', { default: 'vault' })}
						{:else if $applicationSettings.interfaceLanguage === 'fr'}
							{$_('creation.extraction.vault', { default: 'vault' })}
							{requiredSigners}
							{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
							{totalSigners}
						{/if}
					</h1>
					<p class="subtitle is-5">{$_('creation.vault_details.subtitle', { default: 'Let’s add some details' })}</p>
				{:else if step === 4 || step === 5}
					{#if vaultCompletedKeys < totalSigners}
						<h1 class="title has-subtitle-margin">
							{$_('creation.extraction.headline_multi_2', { default: 'Creating your' })}
							{#if $applicationSettings.interfaceLanguage === 'en'}
								{requiredSigners}
								{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
								{totalSigners}
								{$_('creation.extraction.vault', { default: 'vault' })}
							{:else if $applicationSettings.interfaceLanguage === 'fr'}
								{$_('creation.extraction.vault', { default: 'vault' })}
								{requiredSigners}
								{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
								{totalSigners}
							{/if}
						</h1>
						<p class="subtitle is-5">
							{$_('creation.key_choice.subtitle', { default: "It's time connect your" })}
							{$applicationSettings.interfaceLanguage === 'fr'
								? numberToOrdinalFrenchLabel(vaultCompletedKeys + 1)
								: numberToOrdinalEnglishLabel(vaultCompletedKeys + 1)}
							{$_('creation.key_choice.subtitle_device', { default: 'hardware device' })}
						</p>
					{:else}
						<h1 class="title has-subtitle-margin">
							{$_('creation.extraction.subtitle_multi_2_your', { default: 'Your' })}
							{#if $applicationSettings.interfaceLanguage === 'en'}
								{requiredSigners}
								{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
								{totalSigners}
								{$_('creation.extraction.vault', { default: 'vault' })}
								{$_('creation.extraction.subtitle_multi_2_vault_ready', { default: 'is ready' })}
							{:else if $applicationSettings.interfaceLanguage === 'fr'}
								{$_('creation.extraction.vault', { default: 'vault' })}
								{requiredSigners}
								{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
								{totalSigners}
								{$_('creation.extraction.subtitle_multi_2_vault_ready', { default: 'is ready' })}
							{/if}!
						</h1>
						<p class="subtitle is-5">{$_('creation.extraction.review_details', { default: 'Review details' })}</p>
					{/if}
				{:else if step === 6}
					<h1 class="title has-subtitle-margin">
						{#if $applicationSettings.interfaceLanguage === 'en'}
							{$_('creation.extraction.subtitle_multi_2_your', { default: 'Your' })}
							{requiredSigners}
							{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
							{totalSigners}
							{$_('creation.extraction.vault', { default: 'vault' })}
						{:else if $applicationSettings.interfaceLanguage === 'fr'}
							{$_('creation.extraction.subtitle_multi_2_your', { default: 'Your' })}
							{$_('creation.extraction.vault', { default: 'vault' })}
							{requiredSigners}
							{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
							{totalSigners}
						{/if}
					</h1>
					{#if extractedXpub}
						<p class="subtitle is-5">{$_('creation.extraction.subtitle_multi_2_vault_extracted', { default: 'Hardware device successfully added' })}</p>
					{:else}
						<p class="subtitle is-5">{$_('creation.extraction.subtitle_multi_2', { default: 'About to read the key from your hardware device' })}</p>
					{/if}
				{:else if step === 7}
					<h1 class="title has-subtitle-margin">
						{#if $applicationSettings.interfaceLanguage === 'en'}
							{$_('creation.extraction.subtitle_multi_2_your', { default: 'Your' })}
							{requiredSigners}
							{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
							{totalSigners}
							{$_('creation.confirm_config.vault', { default: 'vault' })}
							{$_('creation.confirm_config.vault', { default: 'is now complete' })}
							{$_('creation.extraction.vault', { default: 'vault' })}
						{:else if $applicationSettings.interfaceLanguage === 'fr'}
							{$_('creation.extraction.subtitle_multi_2_your', { default: 'Your' })}
							{$_('creation.confirm_config.vault', { default: 'vault' })}
							{requiredSigners}
							{$_('creation.extraction.subtitle_multi_2_of', { default: 'of' })}
							{totalSigners}
							{$_('creation.confirm_config.vault', { default: 'is now complete' })}
						{/if}
					</h1>
					<p class="subtitle is-5">{$_('creation.confirm_config.subtitle_multi', { default: 'Just one last thing before you’re done' })}</p>
				{/if}
			{/if}
		</div>
	</div>

	<div class="cards">
		{#if step === 0}
			<div class="card-action">
				<ConfigTypeChoice on:walletSelected={handleWalletSelected} on:vaultSelected={handleVaultSelected} />
			</div>
		{:else if step === 1}
			<div class="card-action">
				<UserPassword
					on:createPassword={handleCreatedUserPassword}
					on:skipPassword={handleSkipPasswordCreation}
					on:confirmPassword={handleCreatedUserPassword}
					{userPassword}
					{newAdded}
				/>
			</div>
		{:else if walletType === 'single' && step !== 5}
			{#if step === 2}
				<div class="card-action">
					<WalletDetailsSingleSig
						{selectedWalletBrand}
						exportedName={configName}
						on:walletDeviceChange={updateWalletSelected}
						on:walletNameChange={updateWalletName}
					/>
				</div>
			{:else if !showMicroSDModel && (step === 3 || step === 4)}
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
			{:else if showMicroSDModel && step === 3}
				<div class="card-action">
					<ColdCardMicroSD {walletType} on:uploadFromMicroSD={handleExtractFromMicroSD} />
				</div>
			{/if}
		{:else if walletType === 'multi' && step !== 7}
			{#if step === 2}
				<div class="card-action">
					<QuorumChoiceMultiSig on:userSelect2of3={handle2of3Selected} />
				</div>
			{:else if step === 3}
				<div class="card-action">
					<VaultConfigDetailsMultiSig on:walletNameChange={updateWalletName} exportedName={configName} />
				</div>
			{:else if step === 4}
				<div class="card-action">
					<KeysChoice2of3MultiSig {importedDevices} {selectedWalletBrand} on:walletDeviceChange={updateWalletSelected} />
				</div>
			{:else if !showMicroSDModel && (step === 5 || step === 6)}
				<div class="card-action">
					<Extraction
						{deviceScanning}
						{exportingInProgress}
						{extractedFromMicroSD}
						{extractedXpub}
						{retryXpubExtration}
						{scannedWalletData}
						{selectedWalletBrand}
						{showPinOverlay}
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
			{:else if showMicroSDModel && step === 5}
				<div class="card-action">
					<ColdCardMicroSD
						{walletType}
						on:uploadFromMicroSD={handleExtractFromMicroSD}
						on:cancelImportingFromMicroSD={handleCancelImportingFromMicroSD}
						on:retryImportingFromMicroSD={handleShowExtractFromMicroSD}
					/>
				</div>
			{/if}
		{:else if (walletType === 'single' && step === 5) || (walletType === 'multi' && step === 7)}
			<div class="card-action">
				<ConfirmConfig {importedDevices} {configName} {walletType} />
			</div>
		{/if}
	</div>

	<div class="container-action">
		<div class="buttons">
			<!-- Back Button -->
			{#if step === 0 || step === 1}
				<Button
					text={$_('creation.buttons.back', { default: 'Back' })}
					buttonClass="is-primary is-outlined"
					icon="arrowBack"
					on:buttonClicked={handleBackButton}
				/>
			{:else if walletType === 'single' && step !== 5}
				{#if extractedXpub && step !== 2}
					<Button
						text={$_('creation.buttons.cancel', { default: 'Cancel' })}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleShowCancelConfirmationAlert}
					/>
				{:else}
					<Button
						text={newAdded && step === 2
							? $_('creation.buttons.cancel_new_wallet', { default: 'Cancel new wallet' })
							: $_('creation.buttons.back', { default: 'Back' })}
						icon={newAdded && step === 2 ? '' : 'arrowBack'}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleBackButton}
					/>
				{/if}
			{:else if walletType === 'multi' && step !== 7}
				{#if extractedXpub && step >= 5 && step !== 3}
					<Button
						text={$_('creation.buttons.cancel', { default: 'Cancel' })}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleShowCancelConfirmationAlert}
					/>
				{:else if vaultCompletedKeys >= 2 && step === 4}
					<Button
						text={$_('creation.buttons.cancel', { default: 'Cancel' })}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleShowCancelConfirmationAlert}
					/>
				{:else}
					<Button
						text={newAdded && step === 2
							? $_('creation.buttons.cancel_new_vault', { default: 'Cancel new vault' })
							: $_('creation.buttons.back', { default: 'Back' })}
						icon={newAdded && step === 2 ? '' : 'arrowBack'}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleBackButton}
					/>
				{/if}
			{/if}

			{#if walletType === 'single' && step !== 5}
				{#if step === 2}
					<Button
						text={$_('creation.buttons.create_wallet', { default: 'Create wallet' })}
						title={!configName
							? $_('creation.buttons.create_wallet_title', { default: 'Enter a name for your wallet and selected the hardware device to continue' })
							: ''}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={handleInitSingleKey}
						buttonDisabled={!configName || !selectedWalletBrand}
					/>
				{:else if (step === 3 || step === 4) && !showMicroSDModel}
					<Button
						text={$_('creation.buttons.confirm_wallet', { default: 'Confirm your wallet' })}
						title={extractedXpub ? $_('creation.buttons.confirm_wallet_title', { default: 'Please wait for the extraction to be completed' }) : ''}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={confirmSingleWallet}
						buttonDisabled={!extractedXpub}
					/>
				{/if}
			{:else if walletType === 'multi' && step !== 7}
				{#if step === 3}
					<Button
						text={$_('creation.buttons.create_vault', { default: 'Create vault' })}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={handleCreateVault}
						title={configName ? '' : $_('creation.buttons.create_vault_title', { default: 'Enter a name for your vault to continue' })}
						buttonDisabled={!configName}
					/>
				{:else if step === 4 && vaultCompletedKeys !== totalSigners}
					<Button
						text={`${$_('creation.buttons.add_key', { default: 'Add' })} ${
							$applicationSettings.interfaceLanguage === 'fr'
								? numberToOrdinalFrenchLabel(vaultCompletedKeys + 1, true)
								: numberToOrdinalEnglishLabel(vaultCompletedKeys + 1)
						} ${$_('creation.buttons.add_key_vault', { default: 'key to your vault' })}`}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={handleInitMultiSigKey}
						title={selectedWalletBrand ? '' : $_('creation.buttons.add_key_title', { default: 'Select a hardware device to continue' })}
						buttonDisabled={!selectedWalletBrand}
					/>
				{:else if step === 4 && vaultCompletedKeys === totalSigners}
					<Button
						text={$_('creation.buttons.confirm_vault', { default: 'Confirm your vault' })}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={setupMultiSig}
						buttonDisabled={vaultCompletedKeys !== totalSigners}
					/>
				{:else if (step === 5 || step === 6) && !showMicroSDModel}
					<Button
						text={$_('creation.buttons.confirm_hardware_device', { default: 'Confirm this hardware device' })}
						buttonClass="is-primary"
						icon="arrowRight"
						on:buttonClicked={confirmAddedKeyToVault}
						buttonDisabled={!extractedXpub}
						title={!extractedXpub ? $_('creation.buttons.confirm_hardware_device_title', { default: 'Please wait for the extraction to be completed' }) : ''}
					/>
				{/if}
			{/if}

			{#if (walletType === 'single' && step === 5) || (walletType === 'multi' && step === 7)}
				<Button
					text={$_('creation.buttons.cancel', { default: 'Cancel' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleShowCancelConfirmationAlert}
				/>
				<Button
					text={`${$_('creation.buttons.download', { default: 'Download' })} ${
						newAdded ? $_('creation.buttons.download_updated', { default: 'updated' }) : ''
					} ${$_('creation.buttons.download_config', { default: 'config file and access dashboard' })}`}
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
	{#if walletType === 'multi' && step !== 7 && (step === 5 || step === 6)}
		<Overlay title={$_('creation.overlay.cancel_confirmation.title_hardware_device', { default: 'Hardware device was not added' })} titleIsLeft disableClosing>
			<p class="mt-2 mb-6">
				{$_('creation.overlay.cancel_confirmation.paragraph_hardware_device_1', {
					default: 'Are you sure you want to cancel? You will have to add another hardware device once again',
				})}.<br />{$_('creation.overlay.cancel_confirmation.paragraph_hardware_device_2', { default: 'This one will not be saved to your vault' })}.
			</p>
			<div class="buttons is-centered mt-6">
				<Button
					text={$_('creation.overlay.cancel_confirmation.button_back', { default: 'Back' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleContinueConfirmation}
				/>
				<Button
					text={$_('creation.overlay.cancel_confirmation.button_yes_cancel', { default: 'Yes, cancel' })}
					buttonClass="is-primary"
					on:buttonClicked={handleCancelConfirmation}
				/>
			</div>
		</Overlay>
	{:else if walletType === 'multi' && vaultCompletedKeys >= 1}
		<Overlay title="Vault was not created just yet" titleIsLeft disableClosing>
			<p class="mt-2 mb-6">
				{$_('creation.overlay.cancel_confirmation.paragraph_vault_1', { default: 'Are you sure you want to cancel? Your current vault will not be saved' })}.<br
				/>{$_('creation.overlay.cancel_confirmation.paragraph_vault_2', { default: 'You will have to add your hardware devices all over again' })}.
			</p>
			<div class="buttons is-centered mt-6">
				<Button
					text={$_('creation.overlay.cancel_confirmation.button_back', { default: 'Back' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleContinueConfirmation}
				/>
				<Button
					text={$_('creation.overlay.cancel_confirmation.button_yes_cancel', { default: 'Yes, cancel' })}
					buttonClass="is-primary"
					on:buttonClicked={handleCancelConfirmation}
				/>
			</div>
		</Overlay>
	{:else}
		<Overlay title="Wallet was not created just yet" titleIsLeft disableClosing>
			<p class="mt-2 mb-6">
				{$_('creation.overlay.cancel_confirmation.paragraph_wallet_1', {
					default: 'Are you sure you want to cancel? You will have to add another hardware device once again',
				})}.<br />{$_('creation.overlay.cancel_confirmation.paragraph_wallet_2', { default: 'This one will not be saved' })}.
			</p>
			<div class="buttons is-centered mt-6">
				<Button
					text={$_('creation.overlay.cancel_confirmation.button_back', { default: 'Back' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleContinueConfirmation}
				/>
				<Button
					text={$_('creation.overlay.cancel_confirmation.button_yes_cancel', { default: 'Yes, cancel' })}
					buttonClass="is-primary"
					on:buttonClicked={handleCancelConfirmation}
				/>
			</div>
		</Overlay>
	{/if}
{/if}

{#if deviceNotInitialized}
	<Overlay
		title={$_('creation.overlay.device_not_initialized.title', { default: 'Hardware device not active yet' })}
		subtitle={`${$_('creation.overlay.device_not_initialized.subtitle', { default: 'You need to initialize your' })} ${scannedWalletData.model
			.split('_')
			.join(' ')}`}
		titleIsLeft
		disableClosing
	>
		<p class="mt-2">
			{$_('creation.overlay.device_not_initialized.paragraph_1', { default: 'We recommend that you read the official documentation from' })}
			<span class="is-capitalized">{scannedWalletData.model.split('_')[0]}</span>
			{$_('creation.overlay.device_not_initialized.paragraph_2', { default: 'available on' })}
			<span
				class="is-link has-text-weight-semibold"
				on:click={() =>
					openUrl(
						scannedWalletData.model.toLowerCase().split('_')[0] === 'coldcard'
							? 'coldcard-docs'
							: scannedWalletData.model.toLowerCase().split('_')[0] === 'ledger'
							? 'ledger-doc'
							: 'trezor-docs',
					)}>{$_('creation.overlay.device_not_initialized.paragraph_3', { default: 'website' })}</span
			>.<br />{$_('creation.overlay.device_not_initialized.paragraph_4', { default: 'Reach out to us on our' })}
			<span class="is-link has-text-weight-semibold" on:click={() => openUrl('telegram')}>Telegram</span>
			{$_('creation.overlay.device_not_initialized.paragraph_5', { default: 'if you have any questions' })}.
		</p>
		<div class="buttons is-right mt-6">
			<Button
				text={$_('creation.overlay.device_not_initialized.button_cancel', { default: 'Cancel' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleCancelCreation}
			/>
			<Button
				text={$_('creation.overlay.device_not_initialized.button_retry', { default: 'Retry scanning' })}
				buttonClass="is-primary"
				on:buttonClicked={initFirstScanning}
			/>
		</div>
	</Overlay>
{/if}

<!-- TODO: brand is-capitalized button and title -->
{#if wrongDeviceDetected}
	<Overlay
		title={$_('creation.overlay.wrong_device_detected.title', { default: 'Wrong device detected' })}
		subtitle={`${$_('creation.overlay.wrong_device_detected.subtitle', { default: 'Do you want to switch for' })} ${scannedWalletData.model
			.split('_')
			.join(' ')} ?`}
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
			<Button
				text={$_('creation.overlay.wrong_device_detected.retry', { default: 'Retry scanning' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={initFirstScanning}
			/>
			<Button
				text={`${$_('creation.overlay.wrong_device_detected.switch', { default: 'Switch for' })} ${scannedWalletData.model.split('_').join(' ')}`}
				buttonClass="is-primary"
				on:buttonClicked={handleSwitchDevice}
			/>
		</div>
	</Overlay>
{/if}

{#if microSDUploadError}
	<Overlay title={$_('creation.overlay.micro_sd_error.title', { default: "Couldn't import via Micro SD" })} titleIsLeft disableClosing>
		<p class="mt-2">{$_('creation.overlay.micro_sd_error.paragraph_1', { default: 'Make sure the proper file was selected' })}.</p>
		<p class="mb-5">
			{$_('creation.overlay.micro_sd_error.paragraph_2', { default: 'The default file name may be' })}: "<span class="has-text-weight-medium">
				{#if walletType === 'single'}coldcard-export.json{:else}ccxp-XXXXXXXX.json{/if}</span
			>".
		</p>
		<div class="buttons is-right mt-6">
			<Button
				text={$_('creation.overlay.micro_sd_error.cancel', { default: 'Cancel' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleCancelImportingFromMicroSD}
			/>
			<Button
				text={$_('creation.overlay.micro_sd_error.retry', { default: 'Retry Micro SD import' })}
				buttonClass="is-primary"
				on:buttonClicked={handleExtractFromMicroSD}
			/>
		</div>
	</Overlay>
{/if}

{#if extractedXpubWrongNetwork}
	<Overlay
		title={$_('creation.overlay.extracted_xpub_wrong_network.title', { default: 'Coldcard is not set on the proper network' })}
		titleIsLeft
		disableClosing
	>
		<p class="mt-2">
			{$_('creation.overlay.extracted_xpub_wrong_network.paragraph_1', { default: 'Your Coldcard is currently on' })}
			{$bitcoinTestnetNetwork ? 'Mainnet' : 'Testnet'}. {$_('creation.overlay.extracted_xpub_wrong_network.paragraph_2', {
				default: 'You need to change this to',
			})}
			{$bitcoinTestnetNetwork ? 'Testnet' : 'Mainnet'}
			{$_('creation.overlay.extracted_xpub_wrong_network.paragraph_3', { default: 'to added to your' })}
			{walletType === 'single'
				? $_('creation.overlay.extracted_xpub_wrong_network.wallet', { default: 'wallet' })
				: $_('creation.overlay.extracted_xpub_wrong_network.vault', { default: 'vault' })}.
		</p>
		<p class="mb-5">
			{$_('creation.overlay.extracted_xpub_wrong_network.paragraph_4', { default: 'To do so, go to' })}:
			<span class="has-text-weight-normal"
				>{$_('creation.overlay.extracted_xpub_wrong_network.paragraph_5', { default: 'Advanced > Danger Zone > Testnet mode > Select' })}: {$bitcoinTestnetNetwork
					? 'Testnet: BTC'
					: 'Bitcoin'}</span
			>.
		</p>
		<div class="buttons is-right mt-6">
			<!-- <Button text={$_('creation.overlay.extracted_xpub_wrong_network.cancel', { default: 'Cancel' })} buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelCreation} /> -->
			<Button
				text={$_('creation.overlay.extracted_xpub_wrong_network.retry', { default: 'Retry' })}
				buttonClass="is-primary"
				on:buttonClicked={handleRetryExtraction}
			/>
		</div>
	</Overlay>
{/if}

{#if deviceAlreadyAdded}
	<Overlay title={$_('creation.overlay.device_already_added.title', { default: 'Device already added' })} titleIsLeft disableClosing>
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
			<Button
				text={$_('creation.overlay.device_already_added.retry', { default: 'Retry scanning' })}
				buttonClass="is-primary"
				on:buttonClicked={initFirstScanning}
			/>
		</div>
	</Overlay>
{/if}

{#if showPinOverlay}
	<Overlay
		title={$_('creation.overlay.trezor_pin.title', { default: 'Unlock your Trezor' })}
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

{#if microSDColdcardExportOverlay && step === 7}
	<Overlay
		title={microSDColdcardExportOverlayStep === 0
			? $_('creation.overlay.micro_sd_coldcard_export.title_1', { default: '1/2. Add vault setup file to your Coldcard' })
			: $_('creation.overlay.micro_sd_coldcard_export.title_2', { default: '2/2. Add vault setup file to your Coldcard' })}
		titleIsLeft
		disableClosing
		on:closeOverlayClicked={handleHideColdcardExportOverlay}
	>
		{#if microSDColdcardExportOverlayStep === 0}
			<div class="overlay-coldcard-export">
				<p class="has-text-justified">
					{$_('creation.overlay.micro_sd_coldcard_export.paragraph_1', {
						default:
							'Using that file, your Coldcard can sign transactions along with other hardware devices from the same mutisig vault. If you don’t do it, your Coldcard won’t work within your vault.',
					})}
				</p>

				<p class="mt-3">
					1. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_2_1', { default: 'Insert a Micro SD card into your computer (max 32 GB)' })}.<br />
					2. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_2_2', {
						default: "Click the 'Export Coldcard multisig setup' button and save the file into the Micro SD",
					})}.<br />
					3. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_2_3', { default: 'You can now unplug your Micro SD card' })}.<br />
				</p>
				<div class="buttons is-right mt-6">
					<Button
						text={$_('creation.overlay.micro_sd_coldcard_export.button_skip', { default: 'Skip, for now' })}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleHideColdcardExportOverlay}
					/>
					<Button
						text={$_('creation.overlay.micro_sd_coldcard_export.button_export', { default: 'Export Coldcard multisig setup' })}
						buttonClass="is-primary"
						on:buttonClicked={handleExportColdCardBlob}
					/>
				</div>
			</div>
		{:else}
			<div class="overlay-coldcard-export">
				<p class="has-text-justified">
					{$_('creation.overlay.micro_sd_coldcard_export.paragraph_3', {
						default:
							'Using that file, your Coldcard can sign transactions along with other hardware devices from the same mutisig vault.If you don’t do it, your Coldcard won’t work within your vault.',
					})}
				</p>
				<p class="mt-3">
					4. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_4_1', { default: 'Power up your Coldcard and unlock it' })}.<br />
					5. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_4_2', { default: 'On your Coldcard, go to' })}
					<span class="has-text-weight-normal"
						>{$_('creation.overlay.micro_sd_coldcard_export.paragraph_4_3', { default: 'Settings > Multisig Wallets > Import from SD' })}</span
					>.<br />
					6. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_4_4', {
						default: 'Before you accept, you can review the details of your vault before',
					})}.<br />
					7. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_4_5', { default: 'Confirm your vault setup. Your Coldcard is now ready to sign' })}.<br />
					8. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_4_6', {
						default: 'You must do the same with all Coldcard hardware devices used in this multisig vault',
					})}.<br />
					9. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_4_7', {
						default: 'You can now delete the exported vault setup file from your computer',
					})}.<br />
					10. {$_('creation.overlay.micro_sd_coldcard_export.paragraph_4_8', { default: 'Review your vault now' })}.
				</p>
				<div class="buttons is-right mt-6">
					<Button
						text={$_('creation.overlay.micro_sd_coldcard_export.button_back', { default: 'Back' })}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleBackColdcardOverlay}
					/>
					<Button
						text={$_('creation.overlay.micro_sd_coldcard_export.button_review', { default: 'Review vault' })}
						buttonClass="is-primary"
						on:buttonClicked={handleHideColdcardExportOverlay}
					/>
				</div>
			</div>
		{/if}
	</Overlay>
{/if}

{#if showXpubOverlay && !showPinOverlay}
	<OverlayV2 on:closeOverlayClicked={handleHideXpubOverlay}>
		<span slot="title"
			>{$_('creation.overlay.show_xpub.title', { default: 'Extended public key from your' })}
			{selectedWalletBrand === 'ledger' ? 'Ledger' : selectedWalletBrand === 'coldcard' ? 'Coldcard' : selectedWalletBrand === 'trezor' ? 'Trezor' : 'wallet'}
			<span class="is-uppercase">({scannedWalletData.fingerprint})</span></span
		>
		<div class="xpub-overlay">
			<div class="qrcode-img mt-6 has-text-centered">
				<QrCode value={overlayXpub} background={'#fefefe'} />
			</div>
			<p class="subtitle is-5 is-selectable">{overlayXpub}</p>
		</div>
	</OverlayV2>
{/if}
<!-- {$_('creation.overlay.config_file.title_hardware_device', { default: 'Hardware' })} -->
{#if showConfigFileOverlay}
	<Overlay
		title={exportingDone
			? $_('creation.overlay.config_file.title_done', { default: 'Config file exported  ✓' })
			: newAdded
			? $_('creation.overlay.config_file.title_new_added', { default: 'Download your updated config file' })
			: $_('creation.overlay.config_file.title_download', { default: 'Download config file' })}
		subtitle={exportingDone ? '' : `${$_('creation.overlay.config_file.subtitle', { default: 'Your config file explains where to find your bitcoin' })}.`}
		titleIsLeft
		disableClosing
	>
		<div class="overlay-configfile">
			{#if exportingDone}
				<p class="mt-3 mb-2">
					{$_('creation.overlay.config_file.paragraph_done', {
						default:
							"It's important to store your config file in a secure place with your key backups, for instance. It doesn't hold any private key, but is enough to give access to all account balances and transaction history",
					})}.
				</p>
			{:else if newAdded}
				<p class="mt-3 mb-2">
					{$_('creation.overlay.config_file.paragraph_new_added_1', {
						default:
							"It's important to store your config file in a secure place with your key backups, for instance. It doesn't hold any private key, but is enough to give access to all account balances and transaction history. Your config file was updated with your new vault. Make sure that you download and securely  store your updated config file, which includes details from your previous setup with the new wallet or vault that you have just created",
					})}.
				</p>
				<p class="mt-3 mb-2">
					{$_('creation.overlay.config_file.paragraph_new_added_2', {
						default:
							'No account will be created with Dux Reserve for now, which means that you are 100% responsible for taking care of your config file. We do not keep any copy of it. For now, you will have to upload this file anytime you want to access your wallet(s) or vault(s)',
					})}.
				</p>
			{:else}
				<p class="mt-3 mb-2">
					{$_('creation.overlay.config_file.paragraph_new_1', {
						default:
							"It's important to store your config file in a secure place with your key backups, for instance. It doesn't hold any private key, but is enough to give access to all account balances and transaction history",
					})}.
				</p>
				<p class="mt-3 mb-2">
					{$_('creation.overlay.config_file.paragraph_new_2_1', { default: 'You are only exporting your' })}
					{walletType === 'single'
						? $_('creation.overlay.config_file.wallet', { default: 'wallet' })
						: $_('creation.overlay.config_file.vault', { default: 'vault' })}
					{$_('creation.overlay.config_file.paragraph_new_2_2', {
						default:
							'details. No account will be created with Dux Reserve for now, which means that you are 100% responsible for taking care of your config file. We do not keep any copy of it',
					})}.
				</p>
			{/if}
			<div class="buttons is-right mt-6">
				{#if exportingDone}
					<Button
						text={$_('creation.overlay.config_file.button_access', { default: 'Access my dashboard' })}
						buttonClass="is-primary"
						on:buttonClicked={handleExportConfigDone}
					/>
				{:else}
					<Button
						text={$_('creation.overlay.config_file.button_back', { default: 'Back' })}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleHideConfigFileAlert}
					/>
					<Button
						text={$_('creation.overlay.config_file.button_yes', { default: 'Yes, export config file' })}
						buttonClass="is-primary"
						on:buttonClicked={handleExportConfigFile}
					/>
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
