<script>
	import { onMount } from 'svelte';
	import dayjs from 'dayjs';
	import { _ } from 'svelte-i18n';
	import Router, { location, querystring, replace } from 'svelte-spa-router';
	import { addMessages, getLocaleFromNavigator, init, locale } from 'svelte-i18n';
	import { isObjectEmpty } from './utils/helpers';
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
		disableScroll,
		saveData,
		saveSettings,
		selectedCurrency,
		timeNow,
		withCustomUserPassword,
	} from './store';
	import { routes } from './routes';
	import FeedbackOverlay from './components/ui/FeedbackOverlay.svelte';
	import Loading from './components/ui/Loading.svelte';
	import QuickSettings from './components/settings/QuickSettings.svelte';

	// Set local time in the global store
	$timeNow = dayjs();

	const feedbackIcon = './img/icons/ui/feedback.svg';
	const settingsIcon = './img/icons/ui/settings.svg';

	$: title = $bitcoinTestnetNetwork
		? `Dux Reserve ${isDevelopment ? '— DEV TESTNET — 0.4.2-beta' : 'Beta'}`
		: `Dux Reserve ${isDevelopment ? '— DEV MAINNET — 0.4.2-beta' : 'Beta'}`;

	$: scrollable = !$disableScroll;

	const isDevelopment = process.env.NODE_ENV === 'development'; // Production UI by default
	let showFeedbackOverlay = false;
	let showQuickSettingsOverlay = false;
	let languagesJson = {};
	let langagueInit = false;
	let loaded = false;
	let settings = {
		applicationSettings: $applicationSettings,
		selectedCurrency: $selectedCurrency,
		chartTimeScale: $chartTimeScale,
		chartLogarithmic: $chartLogarithmic,
		bitcoinTestnetNetwork: $bitcoinTestnetNetwork,
	};

	let data = {
		bitcoinChartArrayData: $bitcoinChartArrayData,
		bitcoinCurrentPrices: $bitcoinCurrentPrices,
		bitcoinMarketData: $bitcoinMarketData,
		bitcoinNetworkBlockHeight: $bitcoinNetworkBlockHeight,
		timeNow: dayjs($timeNow).format(),
	};

	// Set langue from $applicationSettings, On first launch it use the locale language
	$: if (langagueInit && $applicationSettings.interfaceLanguage && $applicationSettings.interfaceLanguage.length > 1) {
		locale.set($applicationSettings.interfaceLanguage);
	}

	// Disable scrolling when there's an overlay
	// https://github.com/sveltejs/svelte/issues/3105
	const mouseWheel = (node, options) => {
		let { scrollable } = options;

		const handler = e => {
			if (!scrollable && $location === '/dashboard') e.preventDefault();
		};

		node.addEventListener('wheel', handler, { passive: false });

		return {
			update(options) {
				scrollable = options.scrollable;
			},
			destroy() {
				node.removeEventListener('wheel', handler, { passive: false });
			},
		};
	};

	const handleShowFeedbackOverlay = () => {
		showFeedbackOverlay = true;
	};

	const handleHideFeedbackOverlay = () => {
		showFeedbackOverlay = false;
	};

	const handleShowQuickSettingsOverlay = () => {
		showQuickSettingsOverlay = true;
	};

	const handleHideQuickSettingsOverlay = () => {
		showQuickSettingsOverlay = false;
	};

	const handleSwitchNetwork = async () => {
		await window.api.ipcRenderer.invoke('config:switch-network', {
			testnet: $bitcoinTestnetNetwork,
		});
	};

	$: if ($saveSettings) {
		$saveSettings = false;
		setTimeout(() => {
			createSettingsFile();
		}, 150);
	}

	$: if ($saveData) {
		$saveData = false;
		setTimeout(() => {
			createDataFile();
		}, 150);
	}

	const createSettingsFile = async () => {
		try {
			settings = {
				applicationSettings: $applicationSettings,
				selectedCurrency: $selectedCurrency,
				chartTimeScale: $chartTimeScale,
				chartLogarithmic: $chartLogarithmic,
				bitcoinTestnetNetwork: $bitcoinTestnetNetwork,
			};

			if (!isObjectEmpty($applicationSettings)) {
				await window.api.ipcRenderer.invoke('settings:create-file', {
					settings: settings,
				});
			}
		} catch (error) {
			console.log('error on creating settings file');
		}
	};

	const initSettingsfile = async () => {
		try {
			const fileExist = await window.api.ipcRenderer.invoke('settings:check-for-file');
			if (fileExist) {
				const settingsFromFile = await window.api.ipcRenderer.invoke('settings:read-file');

				settings = settingsFromFile;
				$applicationSettings = settingsFromFile.applicationSettings;
				$selectedCurrency = settingsFromFile.selectedCurrency;
				$chartTimeScale = settingsFromFile.chartTimeScale;
				$chartLogarithmic = settingsFromFile.chartLogarithmic;
				$bitcoinTestnetNetwork = settingsFromFile.bitcoinTestnetNetwork;

				handleSwitchNetwork();
			} else {
				createSettingsFile();
			}
		} catch (error) {
			createSettingsFile();
		}
	};

	const createDataFile = async () => {
		try {
			data = {
				bitcoinChartArrayData: $bitcoinChartArrayData,
				bitcoinCurrentPrices: $bitcoinCurrentPrices,
				bitcoinMarketData: $bitcoinMarketData,
				bitcoinNetworkBlockHeight: $bitcoinNetworkBlockHeight,
				timeNow: dayjs($timeNow).format(),
			};

			if (!isObjectEmpty($applicationSettings)) {
				await window.api.ipcRenderer.invoke('data:create-file', {
					data: data,
				});
			}
		} catch (error) {
			console.log('error on creating data file');
		}
	};

	const initDatafile = async () => {
		try {
			const fileExist = await window.api.ipcRenderer.invoke('data:check-for-file');
			if (fileExist) {
				const dataFromFile = await window.api.ipcRenderer.invoke('data:read-file');

				data = dataFromFile;
				$bitcoinChartArrayData = dataFromFile.bitcoinChartArrayData;
				$bitcoinCurrentPrices = dataFromFile.bitcoinCurrentPrices;
				$bitcoinMarketData = dataFromFile.bitcoinMarketData;
				$bitcoinNetworkBlockHeight = dataFromFile.bitcoinNetworkBlockHeight;
				if (!isObjectEmpty(dataFromFile.timeNow)) {
					$timeNow = dayjs(dataFromFile.timeNow);
				}
			} else {
				createDataFile();
			}
		} catch (error) {
			createDataFile();
		}
	};

	const checkConfigfile = async () => {
		try {
			const fileExist = await window.api.ipcRenderer.invoke('config:check-for-file');
			if (fileExist && fileExist.exist) {
				if (fileExist.withCustomPassword) {
					$withCustomUserPassword = true;
					const dataFromFile = await window.api.ipcRenderer.invoke('config:read-file', { userPassword: true });
					$configData = dataFromFile;
				} else {
					$withCustomUserPassword = false;
					const dataFromFile = await window.api.ipcRenderer.invoke('config:read-file', { userPassword: false });
					$configData = dataFromFile;
				}

				replace('/lockscreen');
			} else {
				replace('/');
			}
		} catch (error) {
			replace('/');
			console.log('error on extracting local config file');
		}
	};

	const getLanguageJson = async () => {
		try {
			languagesJson = await window.api.ipcRenderer.invoke('language:get-i18n-json-data');

			addMessages('en', languagesJson.en);
			addMessages('fr', languagesJson.fr);
		} catch (error) {
			console.log('Error on getting languages json data');
		}
	};

	const initLanguage = () => {
		const navigatorLanguage = getLocaleFromNavigator().split('-')[0].toLowerCase() || 'en';

		init({
			fallbackLocale: 'en',
			initialLocale: navigatorLanguage,
		});

		if (navigatorLanguage === 'en' || navigatorLanguage === 'fr') {
			$applicationSettings.interfaceLanguage = $applicationSettings.interfaceLanguage.length > 1 ? $applicationSettings.interfaceLanguage : navigatorLanguage;
		} else {
			$applicationSettings.interfaceLanguage = 'en';
		}

		langagueInit = true;
	};

	initLanguage();

	onMount(async () => {
		await getLanguageJson();
		await initSettingsfile();
		await checkConfigfile();
		await initDatafile();
		setTimeout(() => {
			loaded = true;
		}, 0);
	});

	// !! COMMENT FOR PRODUCTION !!
	// Allow the developer to refresh the app with the testnet switch
	if (isDevelopment) {
		handleSwitchNetwork();
	}
</script>

<svelte:window use:mouseWheel={{ scrollable }} />

<svelte:head>
	<title>{title}</title>

	{#if !scrollable}
		<style>
			html,
			body {
				overflow: hidden !important;
				overflow-x: hidden !important;
				overflow-y: hidden !important;
			}
		</style>
	{/if}
</svelte:head>

<main class:disable-scroll={!scrollable}>
	{#if loaded}
		<Router {routes} />
	{:else}
		<div class="loading-container-init">
			<div class="loading">
				<Loading text={`${$_('home.loading_init', { default: 'Initializing' })}...`} />
			</div>
		</div>
	{/if}
</main>

{#if $bitcoinTestnetNetwork || isDevelopment}
	<div class="application-info">
		{#if $bitcoinTestnetNetwork && $location !== '/dashboard'}
			<div class="subtitle is-5 is-primary is-uppercase has-text-weight-normal to-the-moon" class:is-hidden={$location === '/dashboard'}>TESTNET</div>
		{/if}

		<!-- !! COMMENT FOR PRODUCTION !! -->
		{#if isDevelopment && $location !== '/'}
			<div class="dev-infos is-size-7">
				<div><strong class="mr-1">Present Path:</strong>{$location}</div>
				{#if $querystring}
					<div><strong class="ml-2 mr-1">Querystring:</strong>{$querystring}</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

{#if $location !== '/dashboard' && $location !== '/lockscreen'}
	<div class="quick-settings" class:is-hidden={$location === '/dashboard'} title="Quick Settings" on:click={handleShowQuickSettingsOverlay}>
		<span class="icon is-prussian-blue"><img src={settingsIcon} alt="Quick Settings icon" /></span>
	</div>
{/if}

{#if process.env.FEEDBACK_BOX}
	<div class="overlay-circle is-rounded" title="Feedback" on:click={handleShowFeedbackOverlay}>
		<span class="icon is-white has-no-hover"><img src={feedbackIcon} alt="Feedback icon" /></span>
	</div>
{/if}

{#if showQuickSettingsOverlay && $location !== '/dashboard'}
	<QuickSettings on:closeOverlayClicked={handleHideQuickSettingsOverlay} />
{/if}

{#if showFeedbackOverlay && process.env.FEEDBACK_BOX}
	<FeedbackOverlay on:closeOverlayClicked={handleHideFeedbackOverlay} />
{/if}

<style lang="sass" global>
	@import 'app.sass'

	.loading-container-init
		width: 100%
		height: 99vh

		.loading
			display: flex
			flex-direction: column
			justify-content: center
			align-items: center
			height: 100%

	.quick-settings
		position: fixed
		top: 29px
		right: 32px

	.application-info
		position: fixed
		bottom: 8px
		left: 9px
		z-index: 20
		.dev-infos
			display: flex
		.to-the-moon
			position: fixed
			top: 8px
</style>
