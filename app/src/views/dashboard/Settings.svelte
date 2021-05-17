<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import { timer } from '../../utils/helpers';
	import {
		applicationSettings,
		bitcoinTestnetNetwork,
		configData,
		configsCurrentDataVaultsArray,
		saveSettings,
		selectedCurrency,
		withCustomUserPassword,
	} from '../../store';
	import Overlay from '../../components/ui/Overlay.svelte';
	import OverlayV2 from '../../components/ui/OverlayV2.svelte';
	import Button from '../../components/ui/Button.svelte';
	import SelectionDropDown from '../../components/ui/SelectionDropDown.svelte';
	import ImportConfigFile from '../../components/config/ImportConfigFile.svelte';
	import VerifyConfigPasswordOverlay from '../../components/settings/VerifyConfigPasswordOverlay.svelte';
	import ChangePasswordOverlay from '../../components/settings/ChangePasswordOverlay.svelte';
	import AddPasswordOverlay from '../../components/settings/addPasswordOverlay.svelte';

	const errorIcon = './img/icons/ui/error.svg';
	const warningIcon = './img/icons/ui/warning.svg';

	const dispatch = createEventDispatcher();

	let cannotSwitchNetworkOverlay = false;
	let configDialogError = false;
	let configFileData = {};
	let currencyName = 'USD - US Dollar';
	let languageName = 'US - English';
	let exportingDone = false;
	let exportingFailed = false;
	let showForgetOverlay = false;
	let exportingInProgress = false;
	let exportingUnsecureDone = false;
	let exportingUnsecureFailed = false;
	let exportingUnsecureInProgress = false;
	let isSaving = false;
	let isSavingNotification = false;
	let showConfigFileOverlay = false;
	let switchNetworkOverlay = false;
	let coldcardVaultSelection = 0;
	let testnetEnable = $bitcoinTestnetNetwork;
	let showPasswordOverlay = false;
	let showVerifyPasswordConfigFileOverlay = false;
	let showAddPasswordConfigFileOverlay = false;
	let exportingSecureFile = false;

	$: dropdownColdcard =
		$configsCurrentDataVaultsArray.length >= 1
			? $configsCurrentDataVaultsArray.filter(vault => vault.config.extendedPublicKeys.some(key => key.device.type === 'coldcard'))
			: [];

	$: dropdownColdcardOptions = dropdownColdcard.map((vault, i) => ({
		name: vault.config.name,
		selected: i === coldcardVaultSelection,
	}));

	const handleExportUnsecureConfigFile = async () => {
		const exported_config = {
			...$configData,
		};

		if (showVerifyPasswordConfigFileOverlay) {
			showVerifyPasswordConfigFileOverlay = false;
		}

		exportingUnsecureInProgress = true;

		try {
			await window.api.ipcRenderer.invoke('config:export-unsecure-config-file-dialog', { exported_config });
			exportingUnsecureInProgress = false;
			exportingUnsecureDone = true;
			await timer(2100);
			exportingUnsecureDone = false;
		} catch (error) {
			exportingUnsecureFailed = true;
			await timer(2100);
			exportingUnsecureFailed = false;
		}
	};

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

	const handleExportEncryptedConfigFileWithUserPassword = async password => {
		const exported_config = {
			...$configData,
		};

		if (showVerifyPasswordConfigFileOverlay) {
			showVerifyPasswordConfigFileOverlay = false;
		}

		exportingInProgress = true;

		try {
			await window.api.ipcRenderer.invoke('config:export-encrypted-config-file-dialog', { exported_config, userPassword: password });
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
		$saveSettings = true;
		if (!isSaving) {
			isSaving = true;
			setTimeout(() => {
				isSaving = false;
			}, 2100);
			// TODO: dont use a setTimeout for this, lazy hack
		}
	};

	const handleSettingsChangeNotification = () => {
		$saveSettings = true;
		if (!isSavingNotification) {
			isSavingNotification = true;
			setTimeout(() => {
				isSavingNotification = false;
			}, 2100);
			// TODO: dont use a setTimeout for this, lazy hack
		}
	};

	const handleColdCardVaultSelected = ({ detail }) => {
		coldcardVaultSelection = detail;
	};

	const handleSettingsChange = () => {
		handleSaving();
	};

	const getLanguageName = () => {
		if ($applicationSettings.interfaceLanguage === 'en') languageName = 'EN - English';
		else if ($applicationSettings.interfaceLanguage === 'fr') languageName = 'FR - Français';
	};

	const handleLanguageChange = ({ detail }) => {
		const languageChoice = ['en', 'fr'];
		$applicationSettings.interfaceLanguage = languageChoice[detail];
		getLanguageName();
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
		if ($selectedCurrency === 'USD') currencyName = `${$_('settings.currency_dropdown.USD', { default: 'USD - US Dollar' })}`;
		else if ($selectedCurrency === 'AUD') currencyName = `${$_('settings.currency_dropdown.AUD', { default: 'AUD - Australian Dollar' })}`;
		else if ($selectedCurrency === 'CAD') currencyName = `${$_('settings.currency_dropdown.CAD', { default: 'CAD - Canadian Dollar' })}`;
		else if ($selectedCurrency === 'EUR') currencyName = `${$_('settings.currency_dropdown.EUR', { default: 'EUR - Euro' })}`;
		else if ($selectedCurrency === 'GBP') currencyName = `${$_('settings.currency_dropdown.GBP', { default: 'GBP - British Pound Sterling' })}`;
		else if ($selectedCurrency === 'JPY') currencyName = `${$_('settings.currency_dropdown.JPY', { default: 'JPY - Japanese Yen' })}`;
		else if ($selectedCurrency === 'XAG') currencyName = `${$_('settings.currency_dropdown.XAG', { default: 'XAG - Silver Troy Ounce' })}`;
		else if ($selectedCurrency === 'XAU') currencyName = `${$_('settings.currency_dropdown.XAU', { default: 'XAU - Gold Troy Ounce' })}`;
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
			requiredSigners: dropdownColdcard[coldcardVaultSelection].config.quorum.requiredSigners,
			totalSigners: dropdownColdcard[coldcardVaultSelection].config.quorum.totalSigners,
			accountName: dropdownColdcard[coldcardVaultSelection].config.name,
			importedDevices: dropdownColdcard[coldcardVaultSelection].config.extendedPublicKeys,
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

	const handleShowExportEncryptedConfigFileOverlay = isSecure => {
		exportingSecureFile = isSecure;
		showVerifyPasswordConfigFileOverlay = true;
	};

	const handleHideExportEncryptedConfigFileOverlay = () => {
		showVerifyPasswordConfigFileOverlay = false;
		exportingSecureFile = false;
	};

	const handleShowAddPasswordToConfigFileOverlay = () => {
		showAddPasswordConfigFileOverlay = true;
	};

	const handleHideAddPasswordToConfigFileOverlay = () => {
		showAddPasswordConfigFileOverlay = false;
	};

	const handleShowPasswordOverlay = () => {
		showPasswordOverlay = true;
	};

	const handlehidePasswordOverlay = () => {
		showPasswordOverlay = false;
	};

	const handlePasswordIsValid = ({ detail }) => {
		if (exportingSecureFile) {
			handleExportEncryptedConfigFileWithUserPassword(detail);
		} else {
			handleExportUnsecureConfigFile();
		}
	};

	const handleShowForgetOverlay = () => {
		showForgetOverlay = true;
	};

	const handleHideForgetOverlay = () => {
		showForgetOverlay = false;
	};

	const handleResetApp = () => {
		showForgetOverlay = false;
		dispatch('resetApp');
	};

	onMount(async () => {
		animateScroll.scrollToTop();
		getLanguageName();
		getCurrencyName();
	});
</script>

<div class="columns">
	<div class="column is-12">
		<div class="card">
			<div class="card-content has-text-left">
				<div class="main-title">
					<h5 class="subtitle is-5 has-text-weight-bold mb-0">{$_('settings.subtitle', { default: 'Application' })}</h5>
					{#if isSaving}
						<p class="title is-6 has-text-weight-medium is-primary">{$_('settings.saved', { default: 'Saved' })} ✓</p>
					{/if}
				</div>

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
						on:change={handleSettingsChange}
					/>
					<label for="switchSatoshiUnit">{$_('settings.convert', { default: 'Convert to Satoshi' })}</label>
				</div>

				<div
					class="field"
					title={$_('settings.testnet_title', {
						default: 'Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin (BTC). Compatible with all hardware devices',
					})}
				>
					<input
						id="switchTestnet"
						type="checkbox"
						name="switchTestnet"
						class="switch is-small is-rtl"
						bind:checked={testnetEnable}
						on:change={handleChangeNetwork}
					/>
					<label for="switchTestnet">{$_('settings.testnet', { default: 'Use Testnet' })}</label>
				</div>

				<div
					class="field"
					title={$_('settings.auto_refresh_title', {
						default: 'By turning off the auto-refresh, you will need click on the refresh top button to resync your config data',
					})}
				>
					<input
						id="switchAutorefresh"
						type="checkbox"
						name="switchAutorefresh"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.autoRefresh}
						on:change={handleSettingsChange}
					/>
					<label for="switchAutorefresh">{$_('settings.auto_refresh', { default: 'Auto-refresh config data' })}</label>
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
					<h5 class="subtitle is-5 has-text-weight-bold mb-0">
						{$_('settings.notification', { default: 'Notifications' })}
						<span class="is-size-7">({$_('settings.notification_experimental', { default: 'experimental' })})</span>
					</h5>
					{#if isSavingNotification}
						<p class="title is-6 has-text-weight-medium is-primary">{$_('settings.saved', { default: 'Saved' })} ✓</p>
					{/if}
				</div>

				<div class="field">
					<input
						id="switchNotification"
						type="checkbox"
						name="switchNotification"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.notification}
						on:change={handleSettingsChangeNotification}
					/>
					<label for="switchNotification">{$_('settings.enable_notification', { default: 'Enable notifications' })}</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationSound"
						type="checkbox"
						name="switchNotificationSound"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.notificationSound}
						on:change={handleSettingsChangeNotification}
						disabled={!$applicationSettings.notification}
					/>
					<label for="switchNotificationSound">{$_('settings.notification_sound', { default: 'Play sound for notifications' })}</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationTxReceived"
						type="checkbox"
						name="switchNotificationTxReceived"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.notificationReceive}
						on:change={handleSettingsChangeNotification}
						disabled={!$applicationSettings.notification}
					/>
					<label for="switchNotificationTxReceived">{$_('settings.new_transaction_received', { default: 'New transaction received' })}</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationReceivedTxConfirmed"
						type="checkbox"
						name="switchNotificationReceivedTxConfirmed"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.notificationReceiveConfirm}
						on:change={handleSettingsChangeNotification}
						disabled={!$applicationSettings.notification}
					/>
					<label for="switchNotificationReceivedTxConfirmed">{$_('settings.transaction_received_confirmed', { default: 'Received transaction confirmed' })}</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationWithdrawTxConfirmed"
						type="checkbox"
						name="switchNotificationWithdrawTxConfirmed"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.notificationWithdrawConfirm}
						on:change={handleSettingsChangeNotification}
						disabled={!$applicationSettings.notification}
					/>
					<label for="switchNotificationWithdrawTxConfirmed">{$_('settings.transaction_withdraw_confirmed', { default: 'Withdraw transaction confirmed' })}</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationNewBlock"
						type="checkbox"
						name="switchNotificationNewBlock"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.notificationBlockfound}
						on:change={handleSettingsChangeNotification}
						disabled={!$applicationSettings.notification}
					/>
					<label for="switchNotificationNewBlock">{$_('settings.new_block_found', { default: 'New block found' })}</label>
				</div>

				<div class="field">
					<input
						id="switchNotificationIncognito"
						type="checkbox"
						name="switchNotificationIncognito"
						class="switch is-small is-rtl"
						bind:checked={$applicationSettings.notificationIncognito}
						on:change={handleSettingsChangeNotification}
						disabled={!$applicationSettings.notification}
					/>
					<label
						for="switchNotificationIncognito"
						title={$_('settings.notification_incognito_title', { default: 'Notifications are still enable but no information is shown' })}
						>{$_('settings.notification_incognito', { default: 'Enable incognito notifications' })}</label
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
					<span class="icon is-prussian-blue has-no-hover"><img src={errorIcon} alt="Warning" /></span>
					{$_('settings.config_file.title', { default: 'Manage your config file' })}
				</h5>
				<div>
					<p class="has-text-justified">
						{$_('settings.config_file.paragraph_1', {
							default:
								"Keep your config file in a secure place, with your seed recovery backups for instance. Your config file doesn't hold any private key but is enough to view all your account balances and transaction history. Make sure you have downloaded the latest version below. Dux doesn't have any copy of this information. You are in charge, which means that you are responsible to keep it safe.",
						})}
					</p>
					<br />
					<p>{$_('settings.config_file.paragraph_2', { default: 'Below, you can download your config files with two options' })}:</p>
					<br />
					<p class="has-text-justified">
						• <span class="has-text-weight-normal">{$_('settings.config_file.paragraph_3_bold', { default: 'Secure Dux export' })}</span>, {$_(
							'settings.config_file.paragraph_3',
							{ default: "which is an encrypted copy of your config file. It's better for privacy but you will have to use the Dux desktop app to read it." },
						)}
					</p>
					<p class="has-text-justified">
						• <span class="has-text-weight-normal">{$_('settings.config_file.paragraph_4_bold', { default: 'Unsecure export' })}</span>, {$_(
							'settings.config_file.paragraph_4',
							{
								default:
									"which is your plain text config file. It's better for interoperability with other bitcoin software but you can leak all your balances and transaction history.",
							},
						)}
					</p>
					{#if $withCustomUserPassword}
						<br />
						<p>{$_('settings.config_file.paragraph_5', { default: 'You can also change your password, if you have created one.' })}</p>
					{/if}
				</div>

				<div class="buttons mt-6">
					<Button
						text={exportingFailed
							? $_('settings.config_file.button_exporting_fail', { default: 'Exporting fail' })
							: exportingDone
							? $_('settings.config_file.button_secure_export_completed', { default: 'Dux secure export completed' })
							: $_('settings.config_file.button_secure_export', { default: 'Secure Dux export' })}
						icon="lock-left"
						buttonClass={exportingInProgress ? 'is-primary is-loading button-export' : 'is-primary button-export'}
						on:buttonClicked={$withCustomUserPassword ? handleShowExportEncryptedConfigFileOverlay(true) : handleExportEncryptedConfigFile()}
					/>

					<Button
						text={exportingUnsecureFailed
							? $_('settings.config_file.button_exporting_fail', { default: 'Exporting fail' })
							: exportingUnsecureDone
							? $_('settings.config_file.button_unsecure_export_completed', { default: 'Unsecure exporting completed' })
							: $_('settings.config_file.button_unsecure_export', { default: 'Unsecure export' })}
						icon="unarchive-left"
						buttonClass={exportingUnsecureInProgress ? 'is-primary is-outlined is-loading button-export' : 'is-primary is-outlined button-export'}
						on:buttonClicked={$withCustomUserPassword ? handleShowExportEncryptedConfigFileOverlay(false) : handleExportUnsecureConfigFile()}
					/>

					<Button
						text={$_('settings.config_file.change_config', { default: 'Change config file' })}
						buttonClass="is-primary is-outlined"
						title="Import another config file & reload the dashboard"
						on:buttonClicked={openFileDialog}
					/>

					<Button
						text={$withCustomUserPassword
							? $_('settings.config_file.change_password', { default: 'Change password' })
							: $_('settings.config_file.add_password', { default: 'Add password' })}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={$withCustomUserPassword ? handleShowPasswordOverlay() : handleShowAddPasswordToConfigFileOverlay()}
					/>

					<Button
						text={$_('settings.config_file.reset_app', { default: 'Reset App' })}
						buttonClass="is-primary is-outlined"
						on:buttonClicked={handleShowForgetOverlay}
					/>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="mb-3" />

{#if $configsCurrentDataVaultsArray && $configsCurrentDataVaultsArray.length >= 1 && $configsCurrentDataVaultsArray.some( vault => vault.config.extendedPublicKeys.some(key => key.device.type === 'coldcard'), )}
	<div class="columns">
		<div class="column is-12">
			<div class="card config">
				<div class="card-content has-text-left">
					<h5 class="subtitle is-5 has-text-weight-bold config-subtitle">
						{$_('settings.coldcard_setup_file.title', { default: 'Coldcard multisig setup file of' })}
						{#if dropdownColdcard.length > 1}
							<SelectionDropDown
								dropdownText={dropdownColdcard[coldcardVaultSelection].config.name}
								title="Change vault account with Coldcard"
								options={dropdownColdcardOptions}
								on:dropdownSelected={handleColdCardVaultSelected}
							/>
						{:else}
							{dropdownColdcard[coldcardVaultSelection].config.name}
						{/if}
					</h5>
					<div>
						<p class="has-text-justified">
							{$_('settings.coldcard_setup_file.paragraph', {
								default:
									"Import that file into the Coldcard via a Micro SD card so that it can sign transactions along with the other hardware devices from the same vault. On the Coldcard, go to 'Settings > Multisig Wallets > Import from SD'. You'll have a chance to view the details of the wallet before accepting it.",
							})}
						</p>

						<div class="buttons mt-6">
							<Button
								text={$_('settings.coldcard_setup_file.button_export', { default: 'Export Coldcard multisig setup' })}
								buttonClass="is-primary"
								on:buttonClicked={handleExportColdCardBlob}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showConfigFileOverlay}
	<ImportConfigFile {configFileData} {configDialogError} on:closeConfigFileOverlay={handleCloseConfigFileOverlay} hideTestnetSwitch />
{/if}

{#if switchNetworkOverlay}
	<Overlay
		title={`${$_('settings.overlay.switch_network.title', { default: 'Switching to' })} ${$bitcoinTestnetNetwork ? 'Mainnet' : 'Testnet'}`}
		titleIsLeft
		disableClosing
	>
		<p class="testnet-overlay has-text-justified">
			{#if !$bitcoinTestnetNetwork}
				{$_('settings.overlay.switch_network.paragraph_1', {
					default:
						'You are about to switch to Testnet the test network of Bitcoin. Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin (BTC). Compatible with all hardware devices.',
				})}
			{:else}
				{$_('settings.overlay.switch_network.paragraph_2', {
					default:
						'You are about to switch to the Bitcoin network (also called mainnet), do you want to continue? Only use with small amounts of bitcoin. Our software is still in early beta.',
				})}
			{/if}
		</p>
		<div class="buttons is-right mt-6">
			<Button
				text={$_('settings.overlay.switch_network.button_cancel', { default: 'Cancel' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleCloseswitchNetworkOverlay}
			/>
			<Button text={$_('settings.overlay.switch_network.button_confirm', { default: 'Confirm' })} buttonClass="is-primary" on:buttonClicked={switchNetwork} />
		</div>
	</Overlay>
{/if}

{#if cannotSwitchNetworkOverlay}
	<Overlay title={$_('settings.overlay.cannot_switch_network.title', { default: 'Cannot switch to Testnet' })} titleIsLeft disableClosing>
		<p>
			{$_('settings.overlay.cannot_switch_network.paragraph_1', {
				default: "Your current config file doesn't allow you to switch to Testnet. Some of your hardware devices may not be compatible (i.e. Coldcard).",
			})}
			<br />
			{$_('settings.overlay.cannot_switch_network.paragraph_2', { default: 'Change your hardware device network settings to Testnet and try again.' })}
		</p>
		<div class="buttons is-right mt-6">
			<Button
				text={$_('settings.overlay.cannot_switch_network.button_ok', { default: 'Ok' })}
				buttonClass="is-primary"
				on:buttonClicked={handleCloseCannotSwitchNetworkOverlay}
			/>
		</div>
	</Overlay>
{/if}

{#if showVerifyPasswordConfigFileOverlay}
	<VerifyConfigPasswordOverlay
		on:closeOverlay={handleHideExportEncryptedConfigFileOverlay}
		on:passwordValid={handlePasswordIsValid}
		secureExporting={exportingSecureFile}
	/>
{/if}

{#if showPasswordOverlay}
	<ChangePasswordOverlay on:closeOverlay={handlehidePasswordOverlay} />
{/if}

{#if showAddPasswordConfigFileOverlay}
	<AddPasswordOverlay on:closeOverlay={handleHideAddPasswordToConfigFileOverlay} />
{/if}

{#if showForgetOverlay}
	<OverlayV2 titleIsLeft subtitle on:closeOverlayClicked={handleHideForgetOverlay}>
		<span slot="title">
			<h2 class="title is-4 mb-3 is-family-primary is-vertical-center">
				<span class="icon is-prussian-blue has-no-hover mr-2"><img src={warningIcon} alt="warningIcon" /></span>
				{$_('reset_overlay.title', { default: 'Reset your Dux Reserve app?' })}
			</h2>
		</span>
		<span slot="subtitle">{$_('reset_overlay.subtitle', { default: 'All saved accounts, wallets and vaults will be deleted from the app.' })}</span>
		<p class="has-text-justified">
			{$_('reset_overlay.paragraph', {
				default:
					"Dux Reserve cannot help you recover this information as we do not have it. No need to worry. It doesn't affect your bitcoin private keys as long as you have your hardware devices kept safe with their seed recovery backups. You will be able to create a new password on the Dux desktop app, and add your same devices to see your wallets and vaults once again.",
			})}
		</p>
		<div class="forget-overlay ">
			<div class="buttons is-right mt-6">
				<Button text={$_('reset_overlay.button_yes', { default: 'Yes' })} buttonClass="is-primary is-outlined" on:buttonClicked={handleResetApp} />
				<Button text={$_('reset_overlay.button_no', { default: 'No' })} buttonClass="is-primary" on:buttonClicked={handleHideForgetOverlay} />
			</div>
		</div>
	</OverlayV2>
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

		&.language,
		&.currency {
			display: flex;
			justify-content: space-between;
			align-items: center;
			width: 516px;
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

	.forget-overlay {
		min-width: 320px;
	}

	label {
		width: 510px;

		&.line-height {
			display: inline-flex;
			justify-content: flex-start;
			align-items: center;
			height: 2.5em;
			line-height: 1.5;
		}
	}
</style>
