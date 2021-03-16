<script>
	import { onMount } from 'svelte';
	import { bitcoinCurrentPrices, bitcoinTestnetNetwork, configSelectedCurrentData, selectedCurrency, timeNow, userSettings } from '../../store';
	import { formatNumberByThousands, satoshisToBitcoins } from '../../utils/helpers';
	import Button from '../../components/ui/Button.svelte';
	import SelectionDropDown from '../../components/ui/SelectionDropDown.svelte';

	export let currentPendingAmount = 0;
	export let dontshowWalletName = false;
	export let showActionButtons = false;
	// export let configDropdownArray = [];

	const keyIcon = './img/icons/ui/single-key.svg';
	const vaultIcon = './img/icons/ui/vault.svg';
	const walletIcon = './img/icons/ui/wallet.svg';

	let lastHealthCheckTime = [];
	let currentConfigLoaded = false;

	$: if (!currentConfigLoaded && $configSelectedCurrentData && $configSelectedCurrentData.config) {
		calculateLastHealthCheck();
		currentConfigLoaded = true;
	}

	const calculateLastHealthCheck = () => {
		$configSelectedCurrentData.config.extendedPublicKeys.forEach(extendedPublicKey => {
			if ($configSelectedCurrentData.config && extendedPublicKey.lastHealthCheck) {
				lastHealthCheckTime.push({
					day: $timeNow.isSame(extendedPublicKey.lastHealthCheck, 'day') ? 0 : $timeNow.diff(extendedPublicKey.lastHealthCheck, 'day') + 1,
					week: $timeNow.diff(extendedPublicKey.lastHealthCheck, 'week'),
					months: $timeNow.diff(extendedPublicKey.lastHealthCheck, 'month'),
				});
			}
		});
	};

	const setIntervalCalculateLastHealthCheck = () => {
		setInterval(() => {
			if ($configSelectedCurrentData && $configSelectedCurrentData.config) {
				calculateLastHealthCheck();
			}
		}, 60001);
	};

	const handleConfigReselected = ({ detail }) => {
		console.log('details', detail);
	};

	onMount(() => {
		setIntervalCalculateLastHealthCheck();
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
							{$configSelectedCurrentData ? $configSelectedCurrentData.name : ''}
						</h2>
						<h3 class="subtitle is-6 has-text-weight-normal is-family-primary is-vertical-center">
							{#if $configSelectedCurrentData.config && $configSelectedCurrentData.config.quorum.totalSigners >= 2}
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={vaultIcon} alt="Vault icon" /></span>{$configSelectedCurrentData
									.config.quorum.requiredSigners} of
								{$configSelectedCurrentData.config.quorum.totalSigners}
								Vault
							{:else if $configSelectedCurrentData.config && $configSelectedCurrentData.config.quorum.totalSigners === 1}
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={walletIcon} alt="Vault icon" /></span>Wallet
							{/if}
						</h3>
					</div>
				{/if}
				<div class="card-title">
					<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">Balance</h5>
					{#if dontshowWalletName}
						<h3 class="subtitle is-6 has-text-weight-normal is-family-primary is-vertical-center">
							{#if $configSelectedCurrentData && $configSelectedCurrentData.config && $configSelectedCurrentData.config.quorum.totalSigners >= 2}
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={vaultIcon} alt="Vault icon" /></span>{$configSelectedCurrentData
									.config.quorum.requiredSigners} of
								{$configSelectedCurrentData.config.quorum.totalSigners}
								Vault
							{:else if $configSelectedCurrentData && $configSelectedCurrentData.config && $configSelectedCurrentData.config.quorum.totalSigners === 1}
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={walletIcon} alt="Vault icon" /></span>Wallet
							{/if}
						</h3>
					{/if}
				</div>
				<h4
					class="subtitle is-4 has-smaller-margin skeleton-block skeleton-title skeleton-small mb-2 is-family-primary has-text-weight-medium is-dark"
					class:skeleton={!$configSelectedCurrentData || !$configSelectedCurrentData.name}
					class:is-selectable={$configSelectedCurrentData && $configSelectedCurrentData.name}
				>
					{formatNumberByThousands(
						satoshisToBitcoins($configSelectedCurrentData ? $configSelectedCurrentData.currentBalance : 0).toNumber() *
							$bitcoinCurrentPrices[$selectedCurrency],
						true,
						$selectedCurrency,
					)}<span class="is-size-5 ml-1">{$selectedCurrency}</span>
				</h4>
				<p
					class="is-size-6 skeleton-block skeleton-medium"
					class:skeleton={!$configSelectedCurrentData || !$configSelectedCurrentData.name}
					class:is-selectable={$configSelectedCurrentData && $configSelectedCurrentData.name}
				>
					{$userSettings.satoshiUnit
						? formatNumberByThousands($configSelectedCurrentData ? $configSelectedCurrentData.currentBalance : 0, false, '', false, 0)
						: formatNumberByThousands(
								satoshisToBitcoins($configSelectedCurrentData ? $configSelectedCurrentData.currentBalance : 0).toNumber(),
								false,
								'',
								false,
								8,
						  )}<span class="is-size-7 ml-1"> {$bitcoinTestnetNetwork ? 't' : ''}{$userSettings.satoshiUnit ? 'sats' : 'BTC'}</span>
				</p>
				{#if currentPendingAmount}
					<p class="is-size-7 pt-2 has-text-grey-dark" class:is-selectable={$configSelectedCurrentData.name}>
						{$userSettings.satoshiUnit
							? formatNumberByThousands(currentPendingAmount, false, '', false, 0)
							: formatNumberByThousands(satoshisToBitcoins(currentPendingAmount).toNumber(), false, '', false, 8)}<span class="is-size-8-custom ml-1">
							{$bitcoinTestnetNetwork ? 't' : ''}{$userSettings.satoshiUnit ? 'sats' : 'BTC'}</span
						>
						pending*
					</p>
				{/if}
				{#if showActionButtons}
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button text="Deposit" icon="deposit" buttonClass="is-primary is-outlined" buttonLink="/dashboard?view=deposit" />
							<Button text="Withdraw" icon="withdraw" buttonClass="is-primary" buttonLink="/dashboard?view=widthdraw" />
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
						Key{$configSelectedCurrentData && $configSelectedCurrentData.config && $configSelectedCurrentData.config.extendedPublicKeys.length > 1
							? 's'
							: $configSelectedCurrentData && $configSelectedCurrentData.config
							? ''
							: '(s)'} health
					</h5>
					<h6 class="subtitle has-smaller-margin is-5 is-marginless has-text-right has-text-weight-bold">Last checked</h6>
				</div>
				{#if $configSelectedCurrentData && $configSelectedCurrentData.config && lastHealthCheckTime.length >= 1}
					{#each $configSelectedCurrentData.config.extendedPublicKeys as { device }, i}
						<div class="key skeleton-block" class:skeleton={!$configSelectedCurrentData.config}>
							<span class="icon is-prussian-blue has-no-hover mr-4"><img src={keyIcon} alt="Key" /></span>
							<p class="is-size-6 has-text-left is-capitalized ">
								{device.model.replaceAll('_', ' ')} <span class="is-uppercase">({device.fingerprint})</span>
							</p>
							{#if lastHealthCheckTime.length >= 1 && lastHealthCheckTime[i] && lastHealthCheckTime[i].months >= 1}
								<p class="is-size-6-custom has-text-right">
									<span class:has-text-danger={lastHealthCheckTime[i].months >= 12}>
										{lastHealthCheckTime[i].months}
										Month{lastHealthCheckTime[i].months >= 1 ? 's' : ''}
										ago
									</span>
								</p>
							{:else if lastHealthCheckTime.length >= 1 && lastHealthCheckTime[i] && lastHealthCheckTime[i].week >= 1}
								<p class="is-size-6-custom has-text-right">{lastHealthCheckTime[i].week} Week{lastHealthCheckTime[i].week >= 1 ? 's' : ''} ago</p>
							{:else}
								<p class="is-size-6-custom has-text-right">
									{#if lastHealthCheckTime.length >= 1 && lastHealthCheckTime[i] && lastHealthCheckTime[i].day === 0}
										<span class="has-text-success">Today</span>
									{:else if lastHealthCheckTime.length >= 1 && lastHealthCheckTime[i] && lastHealthCheckTime[i].day === 1}Yesterday{:else}{lastHealthCheckTime.length >=
											1 && lastHealthCheckTime[i]
											? lastHealthCheckTime[i].day
											: ''} days ago{/if}
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
