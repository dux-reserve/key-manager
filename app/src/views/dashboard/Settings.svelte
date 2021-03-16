<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import { timer } from '../../utils/helpers';
	import { bitcoinTestnetNetwork, configData, currentNetworkConfigData, configSelectedCurrentData, selectedCurrency, userSettings } from '../../store';
	import Overlay from '../../components/ui/Overlay.svelte';
	import Button from '../../components/ui/Button.svelte';
	import SelectionDropDown from '../../components/ui/SelectionDropDown.svelte';
	import ImportConfigFile from '../../components/config/ImportConfigFile.svelte';

	const configWarning = './img/icons/ui/error.svg';

	const dispatch = createEventDispatcher();

	let cannotSwitchNetworkOverlay = false;
	let configDialogError = false;
	let configFileData = {};
	let currencyName = 'USD - US Dollar';
	let exportingDone = false;
	let exportingFailed = false;
	let exportingInProgress = false;
	let isSaving = false;
	let isSavingNotification = false;
	let showConfigFileOverlay = false;
	let switchNetworkOverlay = false;
	let testnetEnable = $bitcoinTestnetNetwork;

	const handleExportEncryptedConfigFile = async () => {
		const exported_config = {
			...$configData,
		};

		exportingInProgress = true;

		try {
			await window.api.ipcRenderer.invoke('config:export-encrypted-config-file-dialog', { exported_config });
			exportingInProgress = false;
			exportingDone = true;
			await timer(2100);
			exportingDone = false;
		} catch (error) {
			exportingFailed = true;
			await timer(2100);
			exportingFailed = false;
		}
	};

	const handleSaving = () => {
		if (!isSaving) {
			isSaving = true;
			setTimeout(() => {
				isSaving = false;
			}, 2100);
			// TODO: dont use a setTimeout for this, lazy hack
		}
	};

	const handleSettingsChangeNotification = () => {
		if (!isSavingNotification) {
			isSavingNotification = true;
			setTimeout(() => {
				isSavingNotification = false;
			}, 2100);
			// TODO: dont use a setTimeout for this, lazy hack
		}
	};

	const handleSettingsChange = () => {
		handleSaving();
	};

	const handleCurrencyChange = ({ detail }) => {
		const currencyChoice = ['USD', 'AUD', 'CAD', 'EUR', 'GBP', 'JPY', 'XAG', 'XAU'];
		$selectedCurrency = currencyChoice[detail];
		getCurrencyName();
		dispatch('currencyChanged');
		handleSaving();
	};

	const getCurrencyName = () => {
		// Australian Dollar - AUD $, Canadian Dollar - CAD $, US Dollar - USD $, Euro - EUR €, British Pound Sterling - GBP ₤, Japanese Yen - JPY ¥,
		// Silver Troy Ounce - XAG, Gold Troy Ounce - XAU
		if ($selectedCurrency === 'USD') currencyName = 'USD - US Dollar';
		else if ($selectedCurrency === 'AUD') currencyName = 'AUD - Australian Dollar';
		else if ($selectedCurrency === 'CAD') currencyName = 'CAD - Canadian Dollar';
		else if ($selectedCurrency === 'EUR') currencyName = 'EUR - Euro';
		else if ($selectedCurrency === 'GBP') currencyName = 'GBP - British Pound Sterling';
		else if ($selectedCurrency === 'JPY') currencyName = 'JPY - Japanese Yen';
		else if ($selectedCurrency === 'XAG') currencyName = 'XAG - Silver Troy Ounce';
		else if ($selectedCurrency === 'XAU') currencyName = 'XAU - Gold Troy Ounce';
	};

	const openFileDialog = async () => {
		try {
			configFileData = await window.api.ipcRenderer.invoke('config:import-config-file-dialog');

			configDialogError = false;
			showConfigFileOverlay = true;
		} catch (error) {
			configFileData = {};
			configDialogError = true;

			// REDO ERROR HANDLING FOR FILE DIALOG
			if (error.message.includes('Canceled')) {
				showConfigFileOverlay = false;
			} else {
				showConfigFileOverlay = true;
			}
		}
	};

	const handleCloseConfigFileOverlay = async () => {
		configFileData = {};
		showConfigFileOverlay = false;
		dispatch('configFileChanged');
	};

	const handleExportColdCardBlob = async () => {
		await window.api.ipcRenderer.invoke('config:export-coldcard-multisig-setup', {
			// use current config check config data on other files
			requiredSigners: $configSelectedCurrentData.config.quorum.requiredSigners,
			totalSigners: $configSelectedCurrentData.config.quorum.totalSigners,
			accountName: $configSelectedCurrentData.config.name,
			importedDevices: $configSelectedCurrentData.config.extendedPublicKeys,
		});
	};

	const handleChangeNetwork = async () => {
		testnetEnable = $bitcoinTestnetNetwork;
		if (
			($bitcoinTestnetNetwork && $configData.wallets.some(wallet => wallet.network === 'mainnet')) ||
			(!$bitcoinTestnetNetwork && $configData.wallets.some(wallet => wallet.network === 'testnet')) ||
			($bitcoinTestnetNetwork && $configData.vaults.some(vault => vault.network === 'mainnet')) ||
			(!$bitcoinTestnetNetwork && $configData.vaults.some(vault => vault.network === 'testnet'))
		) {
			switchNetworkOverlay = true;
		} else {
			cannotSwitchNetworkOverlay = true;
		}
	};

	const handleCloseCannotSwitchNetworkOverlay = () => {
		cannotSwitchNetworkOverlay = false;
	};

	const handleCloseswitchNetworkOverlay = () => {
		testnetEnable = $bitcoinTestnetNetwork;
		switchNetworkOverlay = false;
	};

	const switchNetwork = () => {
		testnetEnable = !$bitcoinTestnetNetwork;
		switchNetworkOverlay = false;
		dispatch('networkChanged');
	};

	onMount(async () => {
		animateScroll.scrollToTop();
		getCurrencyName();
	});
</script>

<div class="columns">
	<div class="column is-12">
		<div class="card">
			<div class="card-content has-text-left">
				<div class="main-title">
					<h5 class="subtitle is-5 has-text-weight-bold mb-0">Application</h5>
					{#if isSaving}
						<p class="title is-6 has-text-weight-medium is-primary">Saved ✓</p>
					{/if}
				</div>

				<div class="field currency">
					<label class="line-height" for="currencyDropdown">Currency</label>
					<span class="currency-selector has-text-weight-medium" id="currencyDropdown">
						<SelectionDropDown
							dropdownText={currencyName}
							dropdownClass={'is-primary'}
							on:dropdownSelected={handleCurrencyChange}
							options={[
								{ name: 'USD - US Dollar', selected: $selectedCurrency === 'USD' },
								{ name: 'AUD - Australian Dollar', selected: $selectedCurrency === 'AUD' },
								{ name: 'CAD - Canadian Dollar', selected: $selectedCurrency === 'CAD' },
								{ name: 'EUR - Euro', selected: $selectedCurrency === 'EUR' },
								{ name: 'GBP - British Pound Sterling', selected: $selectedCurrency === 'GBP' },
								{ name: 'JPY - Japanese Yen', selected: $selectedCurrency === 'JPY' },
								{ name: 'XAG - Silver Troy Ounce', selected: $selectedCurrency === 'XAG' },
								{ name: 'XAU - Gold Troy Ounce', selected: $selectedCurrency === 'XAU' },
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
						bind:checked={$userSettings.satoshiUnit}
						on:change={handleSettingsChange}
					/>
					<label for="switchSatoshiUnit">Convert to Satoshi</label>
				</div>

				<div
					class="field"
					title="Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin (BTC). Compatible with all hardware devices"
				>
					<input
						id="switchTestnet"
						type="checkbox"
						name="switchTestnet"
						class="switch is-small is-rtl"
						bind:checked={testnetEnable}
						on:change={handleChangeNetwork}
					/>
					<label for="switchTestnet">Use Testnet</label>
				</div>

				<div class="field" title="By turning off the auto-refresh, you will need click on the refresh top button to resync your config data">
					<input
						id="switchAutorefresh"
						type="checkbox"
						name="switchAutorefresh"
						class="switch is-small is-rtl"
						bind:checked={$userSettings.autoRefresh}
						on:change={handleSettingsChange}
					/>
					<label for="switchAutorefresh">Auto-refresh config data</label>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="columns">
	<div class="column is-12">
		<div class="card">
			<div class="card-content has-text-left">
				<div class="main-title">
					<h5 class="subtitle is-5 has-text-weight-bold mb-0">Notifications <span class="is-size-7">(experimental)</span></h5>
					{#if isSavingNotification}
						<p class="title is-6 has-text-weight-medium is-primary">Saved ✓</p>
					{/if}
				</div>

				<div class="field">
					<input
						id="switchNotification"
						type="checkbox"
						name="switchNotification"
						class="switch is-small is-rtl"
						bind:checked={$userSettings.notification}
						on:change={handleSettingsChangeNotification}
					/>
					<label for="switchNotification">Enable notifications</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationSound"
						type="checkbox"
						name="switchNotificationSound"
						class="switch is-small is-rtl"
						bind:checked={$userSettings.notificationSound}
						on:change={handleSettingsChangeNotification}
						disabled={!$userSettings.notification}
					/>
					<label for="switchNotificationSound">Play sound for notifications</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationTxReceived"
						type="checkbox"
						name="switchNotificationTxReceived"
						class="switch is-small is-rtl"
						bind:checked={$userSettings.notificationReceive}
						on:change={handleSettingsChangeNotification}
						disabled={!$userSettings.notification}
					/>
					<label for="switchNotificationTxReceived">New transaction received</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationReceivedTxConfirmed"
						type="checkbox"
						name="switchNotificationReceivedTxConfirmed"
						class="switch is-small is-rtl"
						bind:checked={$userSettings.notificationReceiveConfirm}
						on:change={handleSettingsChangeNotification}
						disabled={!$userSettings.notification}
					/>
					<label for="switchNotificationReceivedTxConfirmed">Received transaction confirmed</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationWithdrawTxConfirmed"
						type="checkbox"
						name="switchNotificationWithdrawTxConfirmed"
						class="switch is-small is-rtl"
						bind:checked={$userSettings.notificationWithdrawConfirm}
						on:change={handleSettingsChangeNotification}
						disabled={!$userSettings.notification}
					/>
					<label for="switchNotificationWithdrawTxConfirmed">Withdraw transaction confirmed</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationNewBlock"
						type="checkbox"
						name="switchNotificationNewBlock"
						class="switch is-small is-rtl"
						bind:checked={$userSettings.notificationBlockfound}
						on:change={handleSettingsChangeNotification}
						disabled={!$userSettings.notification}
					/>
					<label for="switchNotificationNewBlock">New block found</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationIncognito"
						type="checkbox"
						name="switchNotificationIncognito"
						class="switch is-small is-rtl"
						bind:checked={$userSettings.notificationIncognito}
						on:change={handleSettingsChangeNotification}
						disabled={!$userSettings.notification}
					/>
					<label for="switchNotificationIncognito" title={$userSettings.notification ? 'Notifactions are still enable but no information is shown' : ''}
						>Enable incognito notifications</label
					>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="mb-3" />

<div class="columns">
	<div class="column is-12">
		<div class="card config">
			<div class="card-content has-text-left">
				<h5 class="subtitle is-5 has-text-weight-bold config-subtitle">
					<span class="icon is-prussian-blue has-no-hover"><img src={configWarning} alt="Warning" /></span>
					Secure your config file
				</h5>
				<div>
					<p class="has-text-justified">
						It's important to store your config file in a secure place with your key backups, for instance. It doesn't hold any private key, but is enough to
						give access to all account balances and transaction history. Your config file was updated with your new vault. Make sure that you download and
						securely store your updated config file, which includes details from your previous setup with the new wallet or vault that you have just created.
					</p>
					<br />
					<p class="has-text-justified">
						You are only exporting your config details. No account will be created with Dux Reserve for now, which means that you are 100% responsible for
						taking care of your config file. We do not keep any copy of it.
					</p>
					<p>You will have to upload this file anytime you want to access your wallet(s) or vault(s).</p>
				</div>

				<div class="buttons mt-6">
					<Button
						text="Change config file"
						buttonClass="is-primary is-outlined"
						title="Import another config file & reload the dashboard"
						on:buttonClicked={openFileDialog}
					/>
					<Button
						text={exportingFailed ? 'Exporting fail' : exportingDone ? 'Export completed' : 'Export my config file'}
						icon="unarchive-left"
						buttonClass={exportingInProgress ? 'is-primary is-loading button-export' : 'is-primary button-export'}
						on:buttonClicked={handleExportEncryptedConfigFile}
					/>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="mb-3" />

<!-- TODO: multi vault with coldcards -->
{#if $currentNetworkConfigData.vaults && $currentNetworkConfigData.vaults.length >= 1 && $configSelectedCurrentData.config && $configSelectedCurrentData.config.extendedPublicKeys.length > 1}
	<div class="columns">
		<div class="column is-12">
			<div class="card config">
				<div class="card-content has-text-left">
					<h5 class="subtitle is-5 has-text-weight-bold config-subtitle">Coldcard multisig setup file</h5>
					<div>
						<p class="has-text-justified">
							Import that file into the Coldcard via a Micro SD card so that it can sign transactions along with the other hardware devices from the same vault.
							On the Coldcard, go to "Settings > Multisig Wallets > Import from SD". You'll have a chance to view the details of the wallet before accepting it.
						</p>

						<div class="buttons mt-6">
							<Button text="Export Coldcard multisig setup" buttonClass="is-primary" on:buttonClicked={handleExportColdCardBlob} />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showConfigFileOverlay}
	<ImportConfigFile {configFileData} {configDialogError} on:closeConfigFileOverlay={handleCloseConfigFileOverlay} hideTestnetSwitch/>
{/if}

{#if switchNetworkOverlay}
	<Overlay title={`Switching to ${$bitcoinTestnetNetwork ? 'Mainnet' : 'Testnet'}`} titleIsLeft disableClosing>
		<p class="testnet-overlay has-text-justified">
			{#if !$bitcoinTestnetNetwork}
				You are about to switch to Testnet the test network of Bitcoin. Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin
				(BTC). Compatible with all hardware devices.
			{:else}
				You are about to switch to the Bitcoin network (also called mainnet), do you want to continue? Only use with small amounts of bitcoin. Our software is
				still in early beta.
			{/if}
		</p>
		<div class="buttons is-right mt-6">
			<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCloseswitchNetworkOverlay} />
			<Button text="Confirm" buttonClass="is-primary" on:buttonClicked={switchNetwork} />
		</div>
	</Overlay>
{/if}

{#if cannotSwitchNetworkOverlay}
	<Overlay title="Cannot switch to Testnet" titleIsLeft disableClosing>
		<p>
			Your current config file doesn't allow you to switch to Testnet. Some of your hardware devices may not be compatible (i.e. Coldcard).
			<br />
			Change your hardware device network settings to Testnet and try again.
		</p>
		<div class="buttons is-right mt-6">
			<Button text="Ok" buttonClass="is-primary" on:buttonClicked={handleCloseCannotSwitchNetworkOverlay} />
		</div>
	</Overlay>
{/if}

<style lang="scss">
	.config-subtitle {
		display: flex;
		align-items: center;

		.icon {
			margin-top: 0.1rem;
			margin-right: 0.625rem;
		}
	}

	.card.config p {
		margin-right: 0.75rem;
		margin-left: 0.75rem;
	}

	.field {
		margin-left: 0.75rem;

		&.currency {
			display: flex;
			justify-content: space-between;
			align-items: center;
			width: 392px;
		}
	}

	.main-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.42rem;
	}

	.testnet-overlay {
		max-width: 646px;
	}

	label {
		width: 383px;

		&.line-height {
			display: inline-flex;
			justify-content: flex-start;
			align-items: center;
			height: 2.5em;
			line-height: 1.5;
		}
	}
</style>
