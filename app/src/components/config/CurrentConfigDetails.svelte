<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import dayjs from 'dayjs';
	import { applicationSettings, bitcoinCurrentPrices, bitcoinTestnetNetwork, configSelectedCurrentData, selectedCurrency } from '../../store';
	import { formatNumberByThousands, satoshisToBitcoins, isObjectEmpty } from '../../utils/helpers';
	import Button from '../../components/ui/Button.svelte';
	import SelectionDropDown from '../../components/ui/SelectionDropDown.svelte';

	export let currentPendingAmount = 0;
	export let dontshowWalletName = false;
	export let showActionButtons = false;
	export let configDropdownArray = [];
	export let configurationDropDownSelectedChoice = 0;

	const dispatch = createEventDispatcher();

	const keyIcon = './img/icons/ui/single-key.svg';
	const vaultIcon = './img/icons/ui/vault.svg';
	const walletIcon = './img/icons/ui/wallet.svg';

	let lastHealthCheckTime = [];
	let currentConfigLoaded = false;
	let healthCheckInterval;

	$: if (
		!currentConfigLoaded &&
		!isObjectEmpty($configSelectedCurrentData) &&
		!isObjectEmpty($configSelectedCurrentData.config) &&
		$configSelectedCurrentData &&
		$configSelectedCurrentData.config
	) {
		calculateLastHealthCheck();
		currentConfigLoaded = true;
	}

	const calculateLastHealthCheck = () => {
		$configSelectedCurrentData.config.extendedPublicKeys.forEach(extendedPublicKey => {
			if ($configSelectedCurrentData.config && extendedPublicKey.lastHealthCheck) {
				lastHealthCheckTime.push({
					day: dayjs().isSame(extendedPublicKey.lastHealthCheck, 'day') ? 0 : dayjs().diff(extendedPublicKey.lastHealthCheck, 'day') + 1,
					week: dayjs().diff(extendedPublicKey.lastHealthCheck, 'week'),
					months: dayjs().diff(extendedPublicKey.lastHealthCheck, 'month'),
				});
			}
		});
	};

	const setIntervalCalculateLastHealthCheck = () => {
		healthCheckInterval = setInterval(() => {
			if ($configSelectedCurrentData && $configSelectedCurrentData.config) {
				calculateLastHealthCheck();
			}
		}, 60001);
	};

	const handleCurrentConfigChangeFromDropdown = ({ detail }) => {
		dispatch('dropdownSelected', detail);
	};

	onMount(() => {
		setIntervalCalculateLastHealthCheck();
	});

	onDestroy(() => {
		clearInterval(healthCheckInterval);
	});
</script>

<div class="columns is-multiline">
	<div class="column is-6-desktop is-12-tablet">
		<div class="card account">
			<div class="card-content">
				{#if !dontshowWalletName}
					<div class="card-title">
						<h2
							class="title is-4-custom has-smaller-margin is-capitalized skeleton-block skeleton-title skeleton-small"
							class:skeleton={!$configSelectedCurrentData || !$configSelectedCurrentData.name}
						>
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
						</h2>
						<h3 class="subtitle is-6 has-text-weight-normal is-family-primary is-vertical-center">
							{#if $configSelectedCurrentData.config && $configSelectedCurrentData.config.quorum.totalSigners >= 2}
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={vaultIcon} alt="Vault icon" /></span>
								{#if $applicationSettings.interfaceLanguage === 'en'}
									{$configSelectedCurrentData.config.quorum.requiredSigners}
									{$_('dashboard.current_config_details.of', { default: 'of' })}
									{$configSelectedCurrentData.config.quorum.totalSigners}
									{$_('dashboard.current_config_details.vault', { default: 'Vault' })}
								{:else if $applicationSettings.interfaceLanguage === 'fr'}
									{$_('dashboard.current_config_details.vault', { default: 'Vault' })}
									{$configSelectedCurrentData.config.quorum.requiredSigners}
									{$_('dashboard.current_config_details.of', { default: 'of' })}
									{$configSelectedCurrentData.config.quorum.totalSigners}
								{/if}
							{:else if $configSelectedCurrentData.config && $configSelectedCurrentData.config.quorum.totalSigners === 1}
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={walletIcon} alt="Wallet icon" /></span>{$_(
									'dashboard.current_config_details.wallet',
									{ default: 'Wallet' },
								)}
							{/if}
						</h3>
					</div>
				{/if}
				<div class="card-title">
					<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">{$_('dashboard.current_config_details.balance', { default: 'Balance' })}</h5>
					{#if dontshowWalletName}
						<h3 class="subtitle is-6 has-text-weight-normal is-family-primary is-vertical-center">
							{#if $configSelectedCurrentData && $configSelectedCurrentData.config && $configSelectedCurrentData.config.quorum.totalSigners >= 2}
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={vaultIcon} alt="Vault icon" /></span>{$configSelectedCurrentData
									.config.quorum.requiredSigners}
								{$_('dashboard.current_config_details.of', { default: 'of' })}
								{$configSelectedCurrentData.config.quorum.totalSigners}
								{$_('dashboard.current_config_details.vault', { default: 'Vault' })}
							{:else if $configSelectedCurrentData && $configSelectedCurrentData.config && $configSelectedCurrentData.config.quorum.totalSigners === 1}
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={walletIcon} alt="Wallet icon" /></span>{$_(
									'dashboard.current_config_details.wallet',
									{ default: 'Wallet' },
								)}
							{/if}
						</h3>
					{/if}
				</div>
				<h4
					class="subtitle is-4 has-smaller-margin skeleton-block skeleton-title skeleton-small mb-2 is-family-primary has-text-weight-medium is-dark"
					class:skeleton={!$configSelectedCurrentData || !$configSelectedCurrentData.name || $configSelectedCurrentData.currentBalance === undefined}
					class:is-selectable={$configSelectedCurrentData && $configSelectedCurrentData.name}
				>
					{formatNumberByThousands(
						satoshisToBitcoins($configSelectedCurrentData ? $configSelectedCurrentData.currentBalance : 0).toNumber() * $bitcoinCurrentPrices[$selectedCurrency],
						true,
						$selectedCurrency,
					)}<span class="is-size-5 ml-1">{$selectedCurrency}</span>
				</h4>
				<p
					class="is-size-6 skeleton-block skeleton-medium"
					class:skeleton={!$configSelectedCurrentData || !$configSelectedCurrentData.name || $configSelectedCurrentData.currentBalance === undefined}
					class:is-selectable={$configSelectedCurrentData && $configSelectedCurrentData.name}
				>
					{$applicationSettings.satoshiUnit
						? formatNumberByThousands($configSelectedCurrentData ? $configSelectedCurrentData.currentBalance : 0, false, '', false, 0)
						: formatNumberByThousands(
								satoshisToBitcoins($configSelectedCurrentData ? $configSelectedCurrentData.currentBalance : 0).toNumber(),
								false,
								'',
								false,
								8,
						  )}<span class="is-size-7 ml-1"> {$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span>
				</p>
				{#if currentPendingAmount}
					<p class="is-size-7 pt-1 has-text-grey-dark pending-amount" class:is-selectable={$configSelectedCurrentData.name}>
						{$applicationSettings.satoshiUnit
							? formatNumberByThousands(currentPendingAmount, false, '', false, 0)
							: formatNumberByThousands(satoshisToBitcoins(currentPendingAmount).toNumber(), false, '', false, 8)}<span class="is-size-8-custom ml-1">
							{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span
						>
						{$_('dashboard.current_config_details.pending', { default: 'pending' })}*
					</p>
				{/if}
				{#if showActionButtons}
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button
								text={$_('dashboard.current_config_details.button_receiving', { default: 'Deposit' })}
								icon="deposit"
								buttonClass="is-primary is-outlined"
								buttonLink="/dashboard?view=deposit"
							/>
							<Button
								text={$_('dashboard.current_config_details.button_withdraw', { default: 'Withdraw' })}
								icon="withdraw"
								buttonClass="is-primary"
								buttonLink="/dashboard?view=widthdraw"
							/>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<div class="column is-6-desktop is-12-tablet">
		<div class="card keys">
			<div class="card-content">
				<div class="card-title">
					<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">
						{#if $applicationSettings.interfaceLanguage === 'en'}
							{$_('dashboard.current_config_details.key', { default: 'Key' })}{$configSelectedCurrentData &&
							$configSelectedCurrentData.config &&
							$configSelectedCurrentData.config.extendedPublicKeys.length > 1
								? 's'
								: $configSelectedCurrentData && $configSelectedCurrentData.config
								? ''
								: '(s)'}
							{$_('dashboard.current_config_details.health', { default: 'health' })}
						{:else if $applicationSettings.interfaceLanguage === 'fr'}
							{$_('dashboard.current_config_details.health', { default: 'health' })}
							{$_('dashboard.current_config_details.key', { default: 'Key' })}{$configSelectedCurrentData &&
							$configSelectedCurrentData.config &&
							$configSelectedCurrentData.config.extendedPublicKeys.length > 1
								? 's'
								: $configSelectedCurrentData && $configSelectedCurrentData.config
								? ''
								: '(s)'}
						{/if}
					</h5>
					<h6 class="subtitle has-smaller-margin is-5 is-marginless has-text-right has-text-weight-bold">
						{$_('dashboard.current_config_details.last_check', { default: 'Last checked' })}
					</h6>
				</div>
				{#if !isObjectEmpty($configSelectedCurrentData) && !isObjectEmpty($configSelectedCurrentData.config) && $configSelectedCurrentData && $configSelectedCurrentData.config && lastHealthCheckTime.length >= 1}
					{#each $configSelectedCurrentData.config.extendedPublicKeys as { device }, i}
						<div class="key skeleton-block" class:skeleton={!$configSelectedCurrentData.config}>
							<span class="icon is-prussian-blue has-no-hover mr-4"><img src={keyIcon} alt="Key" /></span>
							<p class="is-size-6 has-text-left is-capitalized ">
								{device.model.replaceAll('_', ' ')} <span class="is-uppercase">({device.fingerprint})</span>
							</p>
							{#if lastHealthCheckTime.length >= 1 && lastHealthCheckTime[i] && lastHealthCheckTime[i].months && lastHealthCheckTime[i].months > 1}
								<p class="is-size-6-custom has-text-right">
									<span class:has-text-danger={lastHealthCheckTime[i] && lastHealthCheckTime[i].months && lastHealthCheckTime[i].months >= 12}>
										{lastHealthCheckTime[i].months}
										{$_('dashboard.current_config_details.month', { default: 'Month' })}{lastHealthCheckTime[i] &&
										lastHealthCheckTime[i].months &&
										lastHealthCheckTime[i].months >= 1 &&
										$applicationSettings.interfaceLanguage !== 'fr'
											? 's'
											: ''}
										{$_('dashboard.current_config_details.ago', { default: 'ago' })}
									</span>
								</p>
							{:else if lastHealthCheckTime.length >= 1 && lastHealthCheckTime[i] && lastHealthCheckTime[i].week && lastHealthCheckTime[i].week > 1}
								<p class="is-size-6-custom has-text-right">
									{lastHealthCheckTime[i].week}
									{$_('dashboard.current_config_details.week', { default: 'Week' })}{lastHealthCheckTime[i] &&
									lastHealthCheckTime[i].week &&
									lastHealthCheckTime[i].week > 1
										? 's'
										: ''}
									{$_('dashboard.current_config_details.ago', { default: 'ago' })}
								</p>
							{:else}
								<p class="is-size-6-custom has-text-right">
									{#if lastHealthCheckTime.length >= 1 && lastHealthCheckTime[i] && lastHealthCheckTime[i].day && lastHealthCheckTime[i].day === 0}
										<span class="has-text-success">Today</span>
									{:else if lastHealthCheckTime.length >= 1 && lastHealthCheckTime[i] && lastHealthCheckTime[i].day && lastHealthCheckTime[i].day === 1}Yesterday{:else}{lastHealthCheckTime.length >=
											1 && lastHealthCheckTime[i]
											? lastHealthCheckTime[i].day
											: ''}
										{$_('dashboard.current_config_details.days', { default: 'days ago' })}{/if}
								</p>
							{/if}
						</div>
					{/each}
				{:else}
					<div class="key skeleton-block" class:skeleton={!$configSelectedCurrentData || !$configSelectedCurrentData.config} />
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.columns {
		.column .card {
			height: 100%;
			min-height: 219px;

			.card-content {
				height: 100%;
				padding: 2rem;
			}
		}
	}

	.card-bottom {
		margin-top: auto;
	}

	.buttons {
		margin-top: 1.75rem;
	}

	.card.account {
		.card-title {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
	}

	.card.keys {
		.card-title {
			display: flex;
			justify-content: space-between;
			margin-bottom: 0.725rem;

			.subtitle {
				display: inline-block;
			}
		}

		.key {
			display: flex;
			align-items: center;
			margin-bottom: 0.725rem;

			.has-text-left {
				flex-grow: 1;
			}

			img {
				width: 88%;
				height: auto;
			}
		}
	}

	.pending-amount {
		position: relative;
		height: 0;
	}

	.is-4-custom {
		font-size: 1.5275rem;
	}

	.is-size-6-custom {
		font-size: 0.95rem;
	}

	.is-size-8-custom {
		font-size: 0.825rem;
	}
</style>
