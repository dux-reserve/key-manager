<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { replace } from 'svelte-spa-router';
	import { bitcoinTestnetNetwork, configData, configSelectedCurrentData } from '../../store';
	import dayjs from 'dayjs';
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

	let configError = false;
	let configFileDataFiltered = [];
	let configSelectedIndex = 0;
	let currentConfigLoaded = false;
	let networkConfigError = false;
	let useTestnet = false;

	const filterNetworkConfigData = () => {
		useTestnet = $bitcoinTestnetNetwork;

		const filteredVaults = configFileData.vaults.filter(vault => {
			if ($bitcoinTestnetNetwork) {
				return vault.network === 'testnet';
			} else {
				return vault.network === 'mainnet';
			}
		});

		const filteredWallets = configFileData.wallets.filter(wallet => {
			if ($bitcoinTestnetNetwork) {
				return wallet.network === 'testnet';
			} else {
				return wallet.network === 'mainnet';
			}
		});

		if (filteredWallets.length === 0 && filteredVaults.length === 0) {
			networkConfigError = true;
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

	const handleConfigConfirmed = () => {
		$configSelectedCurrentData = {};
		$configData = configFileData;
		replace('/dashboard');
		dispatch('closeConfigFileOverlay');
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

	onMount(() => {
		if (!configDialogError && configFileData && (configFileData.wallets || configFileData.vaults)) {
			filterNetworkConfigData();
		} else if (!configDialogError) {
			configError = true;
		}
	});
</script>

<Overlay
	title={currentConfigLoaded && !networkConfigError && !configDialogError && !configError
		? 'Confirm your configuration'
		: networkConfigError
		? 'Network type not compatible'
		: configDialogError
		? 'Dialog Error'
		: configError
		? 'Data corrupted'
		: 'Formating the data'}
	subtitle={currentConfigLoaded && !networkConfigError && !configDialogError && !configError
		? `${configFileDataFiltered.length > 1 ? `${configSelectedIndex + 1}/${configFileDataFiltered.length}` : ''}`
		: ''}
	titleIsLeft
	disableClosing
>
	<div class="config-container">
		{#if !networkConfigError && !configDialogError && !configError}
			{#if !hideTestnetSwitch}
				<div
					class="field switch-testnet"
					title="Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin (BTC). Compatible with all hardware devices"
				>
					<input
						id="switchTestnet"
						type="checkbox"
						name="switchTestnet"
						disabled={networkConfigError || configDialogError || configError}
						class="switch is-small is-rtl"
						bind:checked={useTestnet}
						on:change={handleChangeNetwork}
					/>
					<label for="switchTestnet">Use Testnet</label>
				</div>
			{/if}
		{/if}
		{#if !currentConfigLoaded || networkConfigError || configDialogError || configError}
			<div class="loading-container mt-6 mb-6">
				{#if networkConfigError}
					<p class="subtitle is-danger">
						<!-- // TODO: -->
						This config file
						<u>cannot</u>
						be use on
						{$bitcoinTestnetNetwork ? 'Testnet' : 'Mainnet'}
					</p>
				{:else if configError}
					<p class="subtitle is-danger">Config file corrupted or not compatible</p>
				{:else if configDialogError}
					<p class="subtitle is-danger">Error on file processing, please retry</p>
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
							<p class="is-uppercase has-text-weight-medium mt-4 mb-2" title="Device unique fingerprint">
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
						<div class="label is-primary">Name</div>
						<span class="is-capitalized">{configFileDataFiltered[configSelectedIndex].name}</span>
					</div>
					<div class="field">
						<div class="label is-primary">ID</div>
						{configFileDataFiltered[configSelectedIndex].id}
					</div>
				</div>
				<div class="column is-6">
					<div class="field">
						<div class="label is-primary">Type</div>
						{#if configFileDataFiltered[configSelectedIndex].quorum.totalSigners > 1}
							{configFileDataFiltered[configSelectedIndex].quorum.requiredSigners} of {configFileDataFiltered[configSelectedIndex].quorum.totalSigners}
						{/if}
						{configFileDataFiltered[configSelectedIndex].quorum.totalSigners > 1 ? 'Vault' : 'Wallet'}
					</div>
					<div class="field">
						<div class="label is-primary">Created on</div>
						{dayjs(configFileDataFiltered[configSelectedIndex].created_at).format('dddd[,] MMMM DD[,] YYYY')}
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
				<Button text="Cancel" buttonClass="is-primary" on:buttonClicked={handleCloseOverlay} />
			{:else}
				<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCloseOverlay} />
				<Button text="Confirm" buttonClass="is-primary" on:buttonClicked={handleConfigConfirmed} />
			{/if}
		</div>
	</div>
</Overlay>

<style lang="scss">
	.config-container {
		width: 780px;
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
</style>
