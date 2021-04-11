<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import dayjs from 'dayjs';
	import 'dayjs/locale/fr';
	import { replace } from 'svelte-spa-router';
	import {
		applicationSettings,
		bitcoinTestnetNetwork,
		configData,
		configsCurrentDataVaultsArray,
		configsCurrentDataWalletsArray,
		configSelectedCurrentData,
		currentNetworkConfigData,
		withCustomUserPassword,
	} from '../../store';
	import { isObjectEmpty } from '../../utils/helpers';
	import Button from '../../components/ui/Button.svelte';
	import Loading from '../../components/ui/Loading.svelte';
	import Overlay from '../../components/ui/Overlay.svelte';

	export let configFileData = {};
	export let configDialogError = false;
	export let hideTestnetSwitch = false;

	const dispatch = createEventDispatcher();

	const coldcardLogo = './img/logos/coldcard.png';
	const ledgerLogo = './img/logos/ledger-vertical.png';
	const trezorLogo = './img/logos/trezor.png';

	const chevronLeft = './img/icons/ui/chevron-left.svg';
	const chevronRight = './img/icons/ui/chevron-right.svg';

	const showEye = './img/icons/ui/visibility.svg';
	const hideEye = './img/icons/ui/visibility-off.svg';

	let autoSwitch = false;
	let configError = false;
	let configFile = {};
	let configFileDataFiltered = [];
	let configSelectedIndex = 0;
	let currentConfigLoaded = false;
	let networkConfigError = false;
	let password = '';
	let showPlainPassword = false;
	let showUserPassword = false;
	let useTestnet = false;
	let wrongPassword = false;

	const filterNetworkConfigData = () => {
		useTestnet = $bitcoinTestnetNetwork;

		const filteredVaults = configFile.vaults.filter(vault => {
			if ($bitcoinTestnetNetwork) {
				return vault.network === 'testnet';
			} else {
				return vault.network === 'mainnet';
			}
		});

		const filteredWallets = configFile.wallets.filter(wallet => {
			if ($bitcoinTestnetNetwork) {
				return wallet.network === 'testnet';
			} else {
				return wallet.network === 'mainnet';
			}
		});

		if (filteredWallets.length === 0 && filteredVaults.length === 0) {
			networkConfigError = true;

			if (hideTestnetSwitch && !autoSwitch) {
				autoSwitch = true;
				$bitcoinTestnetNetwork = !$bitcoinTestnetNetwork;
				filterNetworkConfigData();
			}
		} else {
			networkConfigError = false;

			configFileDataFiltered = [];

			if (filteredVaults.length >= 1) {
				configFileDataFiltered.push(...filteredVaults);
			}
			if (filteredWallets.length >= 1) {
				configFileDataFiltered.push(...filteredWallets);
			}

			currentConfigLoaded = true;
		}
	};

	const handleCloseOverlay = () => {
		dispatch('closeConfigFileOverlay');
	};

	const handleConfigConfirmed = async () => {
		$configSelectedCurrentData = {};
		$configsCurrentDataWalletsArray = [];
		$configsCurrentDataVaultsArray = [];
		$currentNetworkConfigData = {};
		$configData = configFile;

		if (!isObjectEmpty($configData)) {
			await window.api.ipcRenderer.invoke('config:create-file', {
				data: $configData,
				withCustomPassword: $withCustomUserPassword,
				userPassword: password,
			});

			replace('/dashboard');
			dispatch('closeConfigFileOverlay');
		}
	};

	const handlePreviousDetails = () => {
		if (configSelectedIndex !== 0) {
			configSelectedIndex -= 1;
		}
	};

	const handleNextDetails = () => {
		if (configSelectedIndex !== configFileDataFiltered.length - 1) {
			configSelectedIndex += 1;
		}
	};

	const handleCarouselIndicators = i => {
		configSelectedIndex = i;
	};

	const handleChangeNetwork = async () => {
		if (!networkConfigError && !configDialogError && !configError) {
			$bitcoinTestnetNetwork = !$bitcoinTestnetNetwork;
			filterNetworkConfigData();
			configSelectedIndex = 0;

			await window.api.ipcRenderer.invoke('config:switch-network', {
				testnet: $bitcoinTestnetNetwork,
			});
		}
	};

	const handlePasswordEnter = event => {
		if (event && event.target.value) {
			password = event.target.value;
			if (password.length >= 1) wrongPassword = false;
		}
	};

	const handleShowPassword = () => {
		showPlainPassword = !showPlainPassword;
	};

	const handleDecryptConfig = async () => {
		try {
			const decryptedConfig = await window.api.ipcRenderer.invoke('config:decrypt-config-file-with-user-password', {
				config: configFile.encrypted_config,
				userPassword: password,
			});
			if ('version' in decryptedConfig && 'name' in decryptedConfig && 'wallets' in decryptedConfig && 'vaults' in decryptedConfig) {
				$withCustomUserPassword = true;
				configFile = decryptedConfig;
				filterNetworkConfigData();
				wrongPassword = false;
				showUserPassword = false;
			} else {
				wrongPassword = true;
				showUserPassword = true;
			}
		} catch (error) {
			wrongPassword = true;
			showUserPassword = true;
		}
	};

	onMount(() => {
		if (!configDialogError && configFileData) {
			configFile = configFileData;
			if (!configFileData.withCustomPassword && (configFileData.wallets || configFileData.vaults)) {
				showUserPassword = false;
				$withCustomUserPassword = false;
				filterNetworkConfigData();
			} else if (configFileData.withCustomPassword) {
				showUserPassword = true;
			}
		} else if (!configDialogError) {
			configError = true;
		}
	});
</script>

<Overlay
	title={currentConfigLoaded && !networkConfigError && !configDialogError && !configError
		? `${$_('import_config_file.title_confirm', { default: 'Confirm your configuration' })}`
		: networkConfigError
		? `${$_('import_config_file.title_network_error', { default: 'Network type not compatible' })}`
		: configDialogError
		? `${$_('import_config_file.title_file_error', { default: 'File dialog Error' })}`
		: configError
		? `${$_('import_config_file.title_file_error', { default: 'Data corrupted' })}`
		: showUserPassword
		? `${$_('import_config_file.title_user_password', { default: 'Enter your password to unlock this config file' })}`
		: `${$_('import_config_file.title_formatting', { default: 'Formatting data' })}`}
	subtitle={currentConfigLoaded && !networkConfigError && !configDialogError && !configError
		? `${configFileDataFiltered.length > 1 ? `${configSelectedIndex + 1}/${configFileDataFiltered.length}` : ''}`
		: ''}
	titleIsLeft
	disableClosing
>
	<div class="config-container">
		{#if !configDialogError && !configError}
			{#if !hideTestnetSwitch && !showUserPassword}
				<div
					class="field switch-testnet"
					title={$_('settings.testnet_title', {
						default: 'Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin (BTC). Compatible with all hardware devices',
					})}
				>
					<input
						id="switchTestnet"
						type="checkbox"
						name="switchTestnet"
						disabled={configDialogError || configError}
						class="switch is-small is-rtl"
						bind:checked={useTestnet}
						on:change={handleChangeNetwork}
					/>
					<label for="switchTestnet">{$_('settings.testnet', { default: 'Use Testnet' })}</label>
				</div>
			{/if}
		{/if}
		{#if showUserPassword}
			<div class="field password">
				<label class="label" for="enterYourPassword"
					>{$_('import_config_file.enter_password', { default: 'Enter your password' })}
					{#if wrongPassword}
						<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
							>{$_('import_config_file.wrong_password', { default: 'Wrong password' })}</span
						>
					{/if}</label
				>
				<div class="control">
					<input
						id="enterYourPassword"
						class="input"
						type={showPlainPassword ? 'text' : 'password'}
						placeholder="•••••••••"
						value={password}
						on:keyup={handlePasswordEnter}
						autofocus
					/>
					<span
						class="is-link input-inner-text"
						title={showPlainPassword
							? $_('import_config_file.show_plain_password_title_1', { default: 'Hide password' })
							: $_('import_config_file.show_plain_password_title_2', { default: 'Show password' })}
						on:click={handleShowPassword}
					>
						<span class="icon is-grey is-normal"><img src={showPlainPassword ? hideEye : showEye} alt="Eye Icon" /></span>
					</span>
				</div>
			</div>
		{:else if !currentConfigLoaded || networkConfigError || configDialogError || configError}
			<div class="loading-container mt-6 mb-6">
				{#if networkConfigError}
					<p class="subtitle is-danger">
						{$_('import_config_file.subtitle_network_error', { default: 'This config file cannot be use on' })}
						{$bitcoinTestnetNetwork ? 'Testnet' : 'Mainnet'}
					</p>
				{:else if configError}
					<p class="subtitle is-danger">{$_('import_config_file.subtitle_config_error', { default: 'Config file corrupted or not compatible' })}</p>
				{:else if configDialogError}
					<p class="subtitle is-danger">{$_('import_config_file.subtitle_file_error', { default: 'Error on file processing, please retry' })}</p>
				{:else}
					<Loading />
				{/if}
			</div>
		{:else if configFileDataFiltered[configSelectedIndex]}
			<div class="columns is-centered mt-2">
				{#if configSelectedIndex !== 0}
					<span class="icon is-large is-primary chevron-left" on:click={handlePreviousDetails}><img src={chevronLeft} alt="Previous" /></span>
				{/if}

				{#each configFileDataFiltered[configSelectedIndex].extendedPublicKeys as { device }}
					<div class="column pt-0">
						<div class="devices has-text-centered mb-2">
							<h2 class="title is-5 has-subtitle-margin is-capitalized">{device.model.replaceAll('_', ' ')}</h2>
							{#if device.type === 'coldcard'}<img align="center" src={coldcardLogo} alt="ColdCard" />{/if}
							{#if device.type === 'ledger'}<img align="center" src={ledgerLogo} alt="Ledger" />{/if}
							{#if device.type === 'trezor'}<img align="center" src={trezorLogo} alt="Trezor" />{/if}
							<p
								class="is-uppercase has-text-weight-medium mt-4 mb-2"
								title={$_('import_config_file.device_fingerprint_title', { default: 'Device unique fingerprint' })}
							>
								{device.fingerprint}
							</p>
						</div>
					</div>
				{/each}

				{#if configSelectedIndex !== configFileDataFiltered.length - 1}
					<span class="icon is-large is-primary chevron-right" on:click={handleNextDetails}><img src={chevronRight} alt="Next" /></span>
				{/if}
			</div>
			<div class="columns">
				<div class="column is-6">
					<div class="field">
						<div class="label is-primary">{$_('import_config_file.label_name', { default: 'Name' })}</div>
						<span class="is-capitalized">{configFileDataFiltered[configSelectedIndex].name}</span>
					</div>
					<div class="field">
						<div class="label is-primary">{$_('import_config_file.label_id', { default: 'ID' })}</div>
						{configFileDataFiltered[configSelectedIndex].id}
					</div>
				</div>
				<div class="column is-6">
					<div class="field">
						<div class="label is-primary">{$_('import_config_file.label_type', { default: 'Type' })}</div>
						{#if configFileDataFiltered[configSelectedIndex].quorum.totalSigners > 1}
							{#if $applicationSettings.interfaceLanguage === 'en'}
								{configFileDataFiltered[configSelectedIndex].quorum.requiredSigners}
								{$_('dashboard.current_config_details.of', { default: 'of' })}
								{configFileDataFiltered[configSelectedIndex].quorum.totalSigners}

								{configFileDataFiltered[configSelectedIndex].quorum.totalSigners > 1
									? $_('import_config_file.config_type_vault', { default: 'Vault' })
									: $_('import_config_file.config_type_wallet', { default: 'Wallet' })}
							{:else if $applicationSettings.interfaceLanguage === 'fr'}
								{configFileDataFiltered[configSelectedIndex].quorum.totalSigners > 1
									? $_('import_config_file.config_type_vault', { default: 'Vault' })
									: $_('import_config_file.config_type_wallet', { default: 'Wallet' })}

								{configFileDataFiltered[configSelectedIndex].quorum.requiredSigners}
								{$_('dashboard.current_config_details.of', { default: 'of' })}
								{configFileDataFiltered[configSelectedIndex].quorum.totalSigners}
							{/if}
						{:else}
							{configFileDataFiltered[configSelectedIndex].quorum.totalSigners > 1
								? $_('import_config_file.config_type_vault', { default: 'Vault' })
								: $_('import_config_file.config_type_wallet', { default: 'Wallet' })}
						{/if}
					</div>
					<div class="field">
						<div class="label is-primary">{$_('import_config_file.label_created_on', { default: 'Created on' })}</div>
						<span class="is-capitalized-first-letter-only">
							{dayjs(configFileDataFiltered[configSelectedIndex].created_at)
								.locale($applicationSettings.interfaceLanguage === 'fr' ? 'fr' : 'en')
								.format($applicationSettings.interfaceLanguage === 'fr' ? 'dddd DD MMMM YYYY' : 'dddd[,] MMMM DD[,] YYYY')}</span
						>
					</div>
				</div>
			</div>
			{#if configFileDataFiltered.length > 1}
				<div class="columns">
					<div class="column has-text-centered">
						<div class="carousel-indicators">
							{#each configFileDataFiltered as config, i}
								<li class:is-active={i === configSelectedIndex} on:click={() => handleCarouselIndicators(i)} />
							{/each}
						</div>
					</div>
				</div>
			{/if}
		{/if}
		<div class="buttons is-right mt-5">
			{#if networkConfigError || configError || configDialogError}
				<Button text={$_('import_config_file.button_cancel', { default: 'Cancel' })} buttonClass="is-primary" on:buttonClicked={handleCloseOverlay} />
			{:else}
				<Button
					text={$_('import_config_file.button_cancel', { default: 'Cancel' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleCloseOverlay}
				/>
				<Button
					text={showUserPassword
						? $_('import_config_file.button_unlock', { default: 'Unlock' })
						: $_('import_config_file.button_confirm', { default: 'Confirm' })}
					buttonClass="is-primary"
					buttonDisabled={showUserPassword && password < 1}
					on:buttonClicked={showUserPassword ? handleDecryptConfig() : handleConfigConfirmed()}
				/>
			{/if}
		</div>
	</div>
</Overlay>

<style lang="scss">
	.config-container {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 780px;
		min-height: 300px;
	}

	.chevron-left {
		position: absolute;
		top: 250px;
		left: 21px;
	}

	.chevron-right {
		position: absolute;
		top: 250px;
		right: 21px;
	}

	.switch-testnet {
		position: absolute;
		top: 45px;
		right: 52px;
	}

	.devices {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 259px;

		img {
			max-height: 142px;
		}
	}

	.field.password {
		width: 400px;
		margin-top: 6.15rem;
		margin-right: auto;
		margin-left: auto;
	}
</style>
