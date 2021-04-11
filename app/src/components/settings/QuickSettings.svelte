<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { applicationSettings, bitcoinTestnetNetwork, disableNetworkQuickSettings, disableScroll, saveSettings, selectedCurrency } from '../../store';
	import Button from '../ui/Button.svelte';
	import SelectionDropDown from '../ui/SelectionDropDown.svelte';

	const dispatch = createEventDispatcher();

	const Close = './img/icons/ui/close.svg';

	let languageName = 'US - English';
	let currencyName = 'USD - US Dollar';
	let testnetEnable = $bitcoinTestnetNetwork;

	const handleCloseOverlay = () => {
		dispatch('closeOverlayClicked');
	};

	const getLanguageName = () => {
		if ($applicationSettings.interfaceLanguage === 'en') languageName = 'EN - English';
		else if ($applicationSettings.interfaceLanguage === 'fr') languageName = 'FR - Français';
	};

	const handleLanguageChange = ({ detail }) => {
		const currencyChoice = ['en', 'fr'];
		$applicationSettings.interfaceLanguage = currencyChoice[detail];
		getLanguageName();
	};

	const getCurrencyName = () => {
		// Australian Dollar - AUD $, Canadian Dollar - CAD $, US Dollar - USD $, Euro - EUR €, British Pound Sterling - GBP ₤, Japanese Yen - JPY ¥,
		// Silver Troy Ounce - XAG, Gold Troy Ounce - XAU
		if ($selectedCurrency === 'USD') currencyName = `${$_('settings.currency_dropdown.USD', { default: 'USD - US Dollar' })}`;
		else if ($selectedCurrency === 'AUD') currencyName = `${$_('settings.currency_dropdown.AUD', { default: 'AUD - Australian Dollar' })}`;
		else if ($selectedCurrency === 'CAD') currencyName = `${$_('settings.currency_dropdown.CAD', { default: 'CAD - Canadian Dollar' })}`;
		else if ($selectedCurrency === 'EUR') currencyName = `${$_('settings.currency_dropdown.EUR', { default: 'EUR - Euro' })}`;
		else if ($selectedCurrency === 'GBP') currencyName = `${$_('settings.currency_dropdown.GBP', { default: 'GBP - British Pound Sterling' })}`;
		else if ($selectedCurrency === 'JPY') currencyName = `${$_('settings.currency_dropdown.JPY', { default: 'JPY - Japanese Yen' })}`;
		else if ($selectedCurrency === 'XAG') currencyName = `${$_('settings.currency_dropdown.XAG', { default: 'XAG - Silver Troy Ounce' })}`;
		else if ($selectedCurrency === 'XAU') currencyName = `${$_('settings.currency_dropdown.XAU', { default: 'XAU - Gold Troy Ounce' })}`;
	};

	const handleCurrencyChange = ({ detail }) => {
		const currencyChoice = ['USD', 'AUD', 'CAD', 'EUR', 'GBP', 'JPY', 'XAG', 'XAU'];
		$selectedCurrency = currencyChoice[detail];
		getCurrencyName();
	};

	const switchNetwork = () => {
		if (!$disableNetworkQuickSettings) {
			$bitcoinTestnetNetwork = !$bitcoinTestnetNetwork;
			testnetEnable = $bitcoinTestnetNetwork;
		}
	};

	onMount(() => {
		$disableScroll = true;
		getLanguageName();
		getCurrencyName();
	});

	onDestroy(() => {
		$disableScroll = false;
		$saveSettings = true;
	});
</script>

<div class="overlay">
	<div class="background" />
	<div class="card">
		<div class="card-content">
			<div>
				<div class="card-title has-text-left">
					<h2 class="title is-5 mb-3 is-family-primary">{$_('settings.title', { default: 'Settings' })}</h2>
					<div class="icon" on:click={handleCloseOverlay}>
						<img src={Close} alt="Close overlay icon" title={$_('overlay.icon_title', { default: 'Close overlay' })} />
					</div>
				</div>
			</div>
			<div>
				<div class="field language">
					<label class="line-height" for="languageDropdown">{$_('settings.language', { default: 'Language' })}</label>
					<span class="currency-selector has-text-weight-medium" id="languageDropdown">
						<SelectionDropDown
							dropdownText={languageName}
							dropdownClass={'is-primary'}
							on:dropdownSelected={handleLanguageChange}
							options={[
								{ name: 'EN - English', selected: $applicationSettings.interfaceLanguage === 'en' },
								{ name: 'FR - Français', selected: $applicationSettings.interfaceLanguage === 'fr' },
							]}
						/>
					</span>
				</div>

				<div class="field currency">
					<label class="line-height" for="currencyDropdown">{$_('settings.currency', { default: 'Currency' })}</label>
					<span class="currency-selector has-text-weight-medium" id="currencyDropdown">
						<SelectionDropDown
							dropdownText={currencyName}
							dropdownClass={'is-primary'}
							on:dropdownSelected={handleCurrencyChange}
							options={[
								{ name: `${$_('settings.currency_dropdown.USD', { default: 'USD - US Dollar' })}`, selected: $selectedCurrency === 'USD' },
								{ name: `${$_('settings.currency_dropdown.AUD', { default: 'AUD - Australian Dollar' })}`, selected: $selectedCurrency === 'AUD' },
								{ name: `${$_('settings.currency_dropdown.CAD', { default: 'CAD - Canadian Dollar' })}`, selected: $selectedCurrency === 'CAD' },
								{ name: `${$_('settings.currency_dropdown.EUR', { default: 'EUR - Euro' })}`, selected: $selectedCurrency === 'EUR' },
								{ name: `${$_('settings.currency_dropdown.GBP', { default: 'GBP - British Pound Sterling' })}`, selected: $selectedCurrency === 'GBP' },
								{ name: `${$_('settings.currency_dropdown.JPY', { default: 'JPY - Japanese Yen' })}`, selected: $selectedCurrency === 'JPY' },
								{ name: `${$_('settings.currency_dropdown.XAG', { default: 'XAG - Silver Troy Ounce' })}`, selected: $selectedCurrency === 'XAG' },
								{ name: `${$_('settings.currency_dropdown.XAU', { default: 'XAU - Gold Troy Ounce' })}`, selected: $selectedCurrency === 'XAU' },
							]}
						/>
					</span>
				</div>

				<div class="field">
					<input
						id="switchSatoshiUnit"
						type="checkbox"
						name="switchSatoshiUnit"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.satoshiUnit}
					/>
					<label for="switchSatoshiUnit">{$_('settings.convert', { default: 'Convert to Satoshi' })}</label>
				</div>

				<div
					class="field"
					title={$disableNetworkQuickSettings
						? $_('settings.testnet_title_disabled', {
								default: 'Temporary disabled',
						  })
						: $_('settings.testnet_title', {
								default: 'Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin (BTC). Compatible with all hardware devices',
						  })}
				>
					<input
						id="switchTestnet"
						type="checkbox"
						name="switchTestnet"
						class="switch is-small is-rtl"
						bind:checked={testnetEnable}
						on:change={switchNetwork}
						disabled={$disableNetworkQuickSettings}
					/>
					<label for="switchTestnet">{$_('settings.testnet', { default: 'Use Testnet' })}</label>
				</div>
			</div>
			<div class="buttons is-right mt-6">
				<Button text={$_('settings.quick_settings_cta', { default: 'Done' })} buttonClass="is-primary" on:buttonClicked={handleCloseOverlay} />
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.overlay {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 10;
		display: flex;
		justify-content: center;
		align-items: center;

		.background {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 100;
			width: 100vw;
			height: 100vh;
			// background-color: rgba(0, 0, 0, 0.5);
			background-color: rgba(0, 0, 0, 0.42);
			background-size: cover;
			backdrop-filter: blur(3px);
		}

		.card {
			position: fixed;
			z-index: 1000;
			overflow-x: hidden;
			overflow-y: auto;
			width: 500px;
			max-width: 98vw;
			height: 542px;
			max-height: 85vh !important;

			.card-title {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;

				.icon {
					width: 1.25rem;
					height: auto;
					margin-left: 1rem;
				}
			}

			.card-content {
				display: flex;
				flex-direction: column;
				justify-content: space-between;
				height: 100%;
				padding: 2rem;
			}

			.field {
				margin-left: 0.75rem;

				&.language,
				&.currency {
					display: flex;
					justify-content: space-between;
					align-items: center;
					width: 414px;
				}
			}

			label {
				width: 410px;

				&.line-height {
					display: inline-flex;
					justify-content: flex-start;
					align-items: center;
					height: 2.5em;
					line-height: 1.5;
				}
			}

			&::-webkit-scrollbar {
				width: 7.2px;
			}
			&::-webkit-scrollbar-track {
				border-top-right-radius: 10px;
				border-bottom-right-radius: 10px;
				background: transparent;
			}
			&::-webkit-scrollbar-thumb {
				border-radius: 10px;
				background: #4b4b4b;
			}
		}
	}
</style>
