<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import {
		bitcoinCurrentPrices,
		bitcoinNetworkBlockHeight,
		configSelectedCurrentData,
		selectedCurrency,
		bitcoinMarketData,
		applicationSettings,
		bitcoinTestnetNetwork,
		configsCurrentDataVaultsArray,
		configsCurrentDataWalletsArray,
		currentNetworkConfigData,
	} from '../../store';
	import { formatNumberByThousands, satoshisToBitcoins, labelAmountValue, isObjectEmpty } from '../../utils/helpers';
	import Button from '../../components/ui/Button.svelte';
	import PriceChart from '../../components/ui/PriceChart.svelte';

	export let totalCurrentBalance = undefined;
	export let totalCurrentPendingAmount = 0;
	export let allPendingAmount = [];

	const dispatch = createEventDispatcher();

	const bitcoinIcon = './img/logos/bitcoin.svg';
	const statusCircle = './img/icons/ui/circle.svg';
	const vaultIcon = './img/icons/ui/vault.svg';
	const walletIcon = './img/icons/ui/wallet.svg';

	let navigatorOnline = navigator.onLine;

	const handleChangeCurrentConfigFile = id => {
		dispatch('changeCurrentConfigFile', { id: id, viewTransaction: true });
	};

	onMount(() => {
		animateScroll.scrollToTop();

		// We listen for network status changes
		window.addEventListener('online', () => {
			navigatorOnline = true;
		});

		window.addEventListener('offline', () => {
			navigatorOnline = false;
		});
	});
</script>

<div class="columns is-multiline">
	<div class="column is-4-widescreen is-12-desktop is-12-tablet">
		<div class="card balance">
			<div class="card-content">
				<div class="card-title">
					<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">{$_('dashboard.welcome.total_balance', { default: 'Total balance' })}</h5>
					<span class="icon has-no-hover"><img src={bitcoinIcon} alt="Bitcoin logo" /></span>
				</div>
				<h4
					class="title is-4 has-smaller-margin skeleton-block skeleton-title skeleton-small mb-2 is-family-primary is-dark"
					class:skeleton={totalCurrentBalance === undefined || totalCurrentBalance === -1}
					class:is-selectable={totalCurrentBalance !== undefined && totalCurrentBalance !== -1}
				>
					{formatNumberByThousands(satoshisToBitcoins(totalCurrentBalance).toNumber() * $bitcoinCurrentPrices[$selectedCurrency], true, $selectedCurrency)}<span
						class="is-size-5 ml-1">{$selectedCurrency}</span
					>
				</h4>
				<p
					class="is-size-6 skeleton-block skeleton-medium"
					class:skeleton={totalCurrentBalance === undefined || totalCurrentBalance === -1}
					class:is-selectable={totalCurrentBalance !== undefined && totalCurrentBalance !== -1}
				>
					{$applicationSettings.satoshiUnit
						? formatNumberByThousands(totalCurrentBalance, false, '', false, 0)
						: formatNumberByThousands(satoshisToBitcoins(totalCurrentBalance).toNumber(), false, '', false, 8)}<span class="is-size-7 ml-1"
						>{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span
					>
					<!-- of 21 million -->
				</p>
				{#if totalCurrentPendingAmount}
					<p class="is-size-7 pt-2 has-text-grey-dark" class:is-selectable={$configSelectedCurrentData.name}>
						{$applicationSettings.satoshiUnit
							? formatNumberByThousands(totalCurrentPendingAmount, false, '', false, 0)
							: formatNumberByThousands(satoshisToBitcoins(totalCurrentPendingAmount).toNumber(), false, '', false, 8)}<span class="is-size-8-custom ml-1"
							>{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span
						>
						{$_('dashboard.welcome.pending', { default: 'pending' })}*
					</p>
				{/if}

				<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold mt-5">{$_('dashboard.welcome.network_stats', { default: 'Network stats' })}</h5>

				<div class="market-data">
					<div class="has-text-weight-normal">{$_('dashboard.welcome.total_supply', { default: 'Total supply' })}</div>
					<div
						class="has-text-multiline"
						class:skeleton={!$bitcoinMarketData.circulating_supply}
						title={$bitcoinTestnetNetwork ? 'Mainnet supply, not calculated for testnet' : ''}
					>
						{formatNumberByThousands($bitcoinMarketData.circulating_supply, false, '', false, 0)}<span class="is-size-7 ml-1 has-text-multiline-full-word"
							>BTC</span
						>
					</div>
				</div>
				<div class="market-data">
					<div class="has-text-weight-normal">{$_('dashboard.welcome.monetary_base', { default: 'Monetary base' })}</div>
					<div class:skeleton={!$bitcoinMarketData.market_cap}>
						{labelAmountValue($bitcoinMarketData.market_cap, true, $selectedCurrency, 2, {
							trillion: $_('helpers.label_trillion', { default: 'trillion' }),
							billion: $_('helpers.label_billion', { default: 'billion' }),
							million: $_('helpers.label_million', { default: 'million' }),
						})}<span class="is-size-7 ml-1 has-text-multiline-full-word">{$selectedCurrency}</span>
					</div>
				</div>
				<div class="market-data">
					<div class="has-text-weight-normal">
						{$_('dashboard.welcome.satoshi', { default: 'Satoshi' })}{100000000 / $bitcoinCurrentPrices[$selectedCurrency] < 1 ? '' : 's'}
						{$_('dashboard.welcome.satoshi_per', { default: 'per' })}
						{$selectedCurrency}
					</div>
					<div class:skeleton={!$bitcoinCurrentPrices[$selectedCurrency]}>
						{formatNumberByThousands(
							(100000000 / $bitcoinCurrentPrices[$selectedCurrency]).toFixed(100000000 / $bitcoinCurrentPrices[$selectedCurrency] > 1 ? 4 : 0),
							false,
							'',
							false,
							0,
						)}<span class="is-size-7 ml-1 has-text-multiline-full-word">sat{100000000 / $bitcoinCurrentPrices[$selectedCurrency] > 1 ? 's' : ''}</span>
					</div>
				</div>

				<div class="market-data">
					<!-- TODO: real status -->
					<div class="has-text-weight-normal">{$_('dashboard.welcome.status', { default: 'Status' })}</div>

					<div class="is-vertical-center has-text-right" title="Blocksteam Esplora API">
						<span
							class="icon is-smaller has-no-hover mr-1"
							class:is-bitcoin={navigatorOnline && (!$bitcoinNetworkBlockHeight >= 1 || totalCurrentBalance === undefined || totalCurrentBalance === -1)}
							class:is-success={navigatorOnline && $bitcoinNetworkBlockHeight >= 1 && totalCurrentBalance !== undefined && totalCurrentBalance !== -1}
							class:is-danger={!navigatorOnline}><img src={statusCircle} alt="Status" /></span
						>
						{#if navigatorOnline && $bitcoinNetworkBlockHeight >= 1 && totalCurrentBalance !== undefined && totalCurrentBalance !== -1}
							{$bitcoinTestnetNetwork ? 'Testnet' : 'Mainnet'} {$_('dashboard.welcome.online', { default: 'online' })}
						{:else if !navigatorOnline}
							{$bitcoinTestnetNetwork ? 'Testnet' : 'Mainnet'} {$_('dashboard.welcome.offline', { default: 'offline' })}
						{:else}
							{$_('dashboard.welcome.connecting_to', { default: 'Connecting to' })} {$bitcoinTestnetNetwork ? 'Testnet' : 'Mainnet'}
						{/if}
					</div>
				</div>

				<div class="market-data">
					<div class="has-text-weight-normal">{$_('dashboard.welcome.block_height', { default: 'Block height' })}</div>

					<div class:skeleton={!$bitcoinNetworkBlockHeight >= 1} title={$bitcoinTestnetNetwork ? 'Testnet' : ''}>
						{formatNumberByThousands($bitcoinNetworkBlockHeight, false, '', false, 0)}
					</div>
				</div>

				<div class="card-bottom pt-3">
					<div class="buttons is-centered mt-6-custom">
						<Button
							text={$_('dashboard.welcome.button_buy_sell', { default: 'Buy / Sell Bitcoin' })}
							buttonClass="is-primary"
							buttonDisabled={true}
							title={$_('dashboard.welcome.button_buy_sell_title', { default: 'Subscribe to our newsletter for updates or follow us on twitter' })}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="column is-8-widescreen is-12-desktop is-12-tablet">
		<div class="card chart">
			<div class="card-content is-fullheight">
				<PriceChart />
			</div>
		</div>
	</div>
</div>

<div class="mt-1" />

<div class="columns">
	<div class="column">
		<h4 class="title is-3-custom is-vertical-center">
			{#if $currentNetworkConfigData.vaults.length + $currentNetworkConfigData.wallets.length > 1}
				{$_('dashboard.welcome.all_accounts', { default: 'All your accounts' })}
			{:else}
				{$_('dashboard.welcome.your_account', { default: 'Your account' })}
			{/if}<span class="title is-4 ml-1">({$currentNetworkConfigData.vaults.length + $currentNetworkConfigData.wallets.length})</span>
		</h4>
	</div>
</div>

<div class="columns is-multiline">
	{#each $currentNetworkConfigData.vaults as { id, name, quorum }, i}
		{#if !$configsCurrentDataVaultsArray[i]}
			<div class="column is-6-widescreen is-12-desktop is-12-tablet">
				<div class="card account">
					<div class="card-content">
						<div class="card-title">
							<h2 class="title is-4-custom has-smaller-margin is-capitalized skeleton-block skeleton-title skeleton-small" class:skeleton={!name}>
								{name}
							</h2>
							<h3 class="subtitle is-6 has-text-weight-normal is-family-primary is-vertical-center">
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={vaultIcon} alt="Vault icon" /></span>

								{#if $applicationSettings.interfaceLanguage === 'en'}
									{quorum.requiredSigners}
									{$_('dashboard.current_config_details.of', { default: 'of' })}
									{quorum.totalSigners}
									{$_('dashboard.current_config_details.vault', { default: 'Vault' })}
								{:else if $applicationSettings.interfaceLanguage === 'fr'}
									{$_('dashboard.current_config_details.vault', { default: 'Vault' })}
									{quorum.requiredSigners}
									{$_('dashboard.current_config_details.of', { default: 'of' })}
									{quorum.totalSigners}
								{/if}
							</h3>
						</div>
						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">{$_('dashboard.welcome.balance', { default: 'Balance' })}</h5>
						<h4 class="title is-4 has-smaller-margin skeleton skeleton-block skeleton-title skeleton-small mb-2 is-family-primary is-dark" />
						<p class="is-size-6 skeleton skeleton-block skeleton-medium" />
						<div class="buttons is-right">
							<Button
								text={$_('dashboard.welcome.button_view_details', { default: 'View details' })}
								icon={'arrowRight'}
								buttonClass="is-primary"
								on:buttonClicked={() => handleChangeCurrentConfigFile(id)}
							/>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="column is-6-widescreen is-12-desktop is-12-tablet">
				<div class="card account">
					<div class="card-content">
						<div class="card-title">
							<h2
								class="title is-4-custom has-smaller-margin is-capitalized skeleton-block skeleton-title skeleton-small"
								class:skeleton={!$configsCurrentDataVaultsArray[i].name}
							>
								{$configsCurrentDataVaultsArray[i].name}
							</h2>
							<h3 class="subtitle is-6 has-text-weight-normal is-family-primary is-vertical-center">
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={vaultIcon} alt="Vault icon" /></span>
								{#if $applicationSettings.interfaceLanguage === 'en'}
									{quorum.requiredSigners}
									{$_('dashboard.current_config_details.of', { default: 'of' })}
									{quorum.totalSigners}
									{$_('dashboard.current_config_details.vault', { default: 'Vault' })}
								{:else if $applicationSettings.interfaceLanguage === 'fr'}
									{$_('dashboard.current_config_details.vault', { default: 'Vault' })}
									{quorum.requiredSigners}
									{$_('dashboard.current_config_details.of', { default: 'of' })}
									{quorum.totalSigners}
								{/if}
							</h3>
						</div>
						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">{$_('dashboard.welcome.balance', { default: 'Balance' })}</h5>
						<h4
							class="title is-4 has-smaller-margin skeleton-block skeleton-title skeleton-small mb-2 is-family-primary is-dark"
							class:skeleton={!$configsCurrentDataVaultsArray[i].name}
							class:is-selectable={$configsCurrentDataVaultsArray[i].name}
						>
							{formatNumberByThousands(
								satoshisToBitcoins($configsCurrentDataVaultsArray[i].currentBalance).toNumber() * $bitcoinCurrentPrices[$selectedCurrency],
								true,
								$selectedCurrency,
							)}<span class="is-size-5 ml-1">{$selectedCurrency}</span>
						</h4>
						<p
							class="is-size-6 skeleton-block skeleton-medium"
							class:skeleton={!$configsCurrentDataVaultsArray[i].name}
							class:is-selectable={$configsCurrentDataVaultsArray[i].name}
						>
							{$applicationSettings.satoshiUnit
								? formatNumberByThousands($configsCurrentDataVaultsArray[i].currentBalance, false, '', false, 0)
								: formatNumberByThousands(satoshisToBitcoins($configsCurrentDataVaultsArray[i].currentBalance).toNumber(), false, '', false, 8)}<span
								class="is-size-7 ml-1">{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span
							>
						</p>
						{#if allPendingAmount.length >= 1 && allPendingAmount[i]}
							<p class="is-size-7 pt-2 has-text-grey-dark" class:is-selectable={$configSelectedCurrentData.name}>
								{$applicationSettings.satoshiUnit
									? formatNumberByThousands(allPendingAmount[i], false, '', false, 0)
									: formatNumberByThousands(satoshisToBitcoins(allPendingAmount[i]).toNumber(), false, '', false, 8)}<span class="is-size-8-custom ml-1"
									>{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span
								>
								{$_('dashboard.welcome.pending', { default: 'pending' })}*
							</p>
						{/if}
						<div class="buttons is-right">
							<Button
								text={$_('dashboard.welcome.button_view_details', { default: 'View details' })}
								icon={'arrowRight'}
								buttonClass="is-primary"
								on:buttonClicked={() => handleChangeCurrentConfigFile($configsCurrentDataVaultsArray[i].config.id)}
							/>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/each}
	{#each $currentNetworkConfigData.wallets as { id, name }, i}
		{#if !$configsCurrentDataWalletsArray[i]}
			<div class="column is-6-widescreen is-12-desktop is-12-tablet">
				<div class="card account">
					<div class="card-content">
						<div class="card-title">
							<h2 class="title is-4-custom has-smaller-margin is-capitalized skeleton-block skeleton-title skeleton-small" class:skeleton={!name}>
								{name}
							</h2>
							<h3 class="subtitle is-6 has-text-weight-normal is-family-primary is-vertical-center">
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={walletIcon} alt="Vault icon" /></span
								>{$_('dashboard.welcome.wallet', { default: 'Wallet' })}
							</h3>
						</div>
						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">{$_('dashboard.welcome.balance', { default: 'Balance' })}</h5>
						<h4 class="title is-4 has-smaller-margin skeleton skeleton-block skeleton-title skeleton-small mb-2 is-family-primary is-dark" />
						<p class="is-size-6 skeleton skeleton-block skeleton-medium" />
						<div class="buttons is-right">
							<Button
								text={$_('dashboard.welcome.button_view_details', { default: 'View details' })}
								icon={'arrowRight'}
								buttonClass="is-primary"
								on:buttonClicked={() => handleChangeCurrentConfigFile(id)}
							/>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="column is-6-widescreen is-12-desktop is-12-tablet">
				<div class="card account">
					<div class="card-content">
						<div class="card-title">
							<h2
								class="title is-4-custom has-smaller-margin is-capitalized skeleton-block skeleton-title skeleton-small"
								class:skeleton={!$configsCurrentDataWalletsArray[i].name}
							>
								{$configsCurrentDataWalletsArray[i].name}
							</h2>
							<h3 class="subtitle is-6 has-text-weight-normal is-family-primary is-vertical-center">
								<span class="icon is-normal is-prussian-blue has-no-hover mr-2 mb-1"><img src={walletIcon} alt="Vault icon" /></span
								>{$_('dashboard.welcome.wallet', { default: 'Wallet' })}
							</h3>
						</div>
						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">{$_('dashboard.welcome.balance', { default: 'Balance' })}</h5>
						<h4
							class="title is-4 has-smaller-margin skeleton-block skeleton-title skeleton-small mb-2 is-family-primary is-dark"
							class:skeleton={!$configsCurrentDataWalletsArray[i].name}
							class:is-selectable={$configsCurrentDataWalletsArray[i].name}
						>
							{formatNumberByThousands(
								satoshisToBitcoins($configsCurrentDataWalletsArray[i].currentBalance).toNumber() * $bitcoinCurrentPrices[$selectedCurrency],
								true,
								$selectedCurrency,
							)}<span class="is-size-5 ml-1">{$selectedCurrency}</span>
						</h4>
						<p
							class="is-size-6 skeleton-block skeleton-medium"
							class:skeleton={!$configsCurrentDataWalletsArray[i].name}
							class:is-selectable={$configsCurrentDataWalletsArray[i].name}
						>
							{$applicationSettings.satoshiUnit
								? formatNumberByThousands($configsCurrentDataWalletsArray[i].currentBalance, false, '', false, 0)
								: formatNumberByThousands(satoshisToBitcoins($configsCurrentDataWalletsArray[i].currentBalance).toNumber(), false, '', false, 8)}<span
								class="is-size-7 ml-1">{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span
							>
						</p>
						{#if allPendingAmount.length >= 1 && allPendingAmount[$configsCurrentDataVaultsArray.length + i]}
							<p class="is-size-7 pt-2 has-text-grey-dark" class:is-selectable={$configSelectedCurrentData.name}>
								{$applicationSettings.satoshiUnit
									? formatNumberByThousands(allPendingAmount[$configsCurrentDataVaultsArray.length + i], false, '', false, 0)
									: formatNumberByThousands(
											satoshisToBitcoins(allPendingAmount[$configsCurrentDataVaultsArray.length + i]).toNumber(),
											false,
											'',
											false,
											8,
									  )}<span class="is-size-8-custom ml-1">{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span>
								{$_('dashboard.welcome.pending', { default: 'pending' })}*
							</p>
						{/if}
						<div class="buttons is-right">
							<Button
								text={$_('dashboard.welcome.button_view_details', { default: 'View details' })}
								icon={'arrowRight'}
								buttonClass="is-primary"
								on:buttonClicked={() => handleChangeCurrentConfigFile($configsCurrentDataWalletsArray[i].config.id)}
							/>
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/each}
</div>

<style lang="scss">
	.columns {
		.column .card {
			&.balance,
			&.chart {
				height: 100%;
				min-height: 565px;
			}

			.card-content {
				padding: 2rem;
			}
		}
	}

	.card.balance {
		// max-height: 330px;
		.card-title {
			display: flex;
			justify-content: space-between;
		}
	}

	.chart .card-content {
		min-height: 545px;
	}

	.card.account {
		.card-title {
			display: flex;
			justify-content: space-between;
		}

		.vault-type {
			display: flex;
			align-items: center;

			img {
				margin-top: -1px;
			}
		}
	}

	.market-data {
		display: flex;
		overflow-x: hidden;
		justify-content: space-between;
		align-items: center;

		div:first-child {
			margin-right: 1rem;
			margin-bottom: 0.325rem;
			text-align: left;
		}

		div:nth-child(2) {
			text-align: right;
		}

		div.skeleton:nth-child(2):not(.has-text-right) {
			min-width: 100px;
		}
	}

	.is-3-custom {
		font-size: 1.5825rem;
	}

	.is-4-custom {
		font-size: 1.5275rem;
	}

	.is-size-8-custom {
		font-size: 0.825rem;
	}

	.mr-1 {
		margin-right: 0.35rem !important;
	}

	.mt-6-custom {
		margin-top: 5rem !important;
	}
</style>
