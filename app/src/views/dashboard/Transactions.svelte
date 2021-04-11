<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { querystring } from 'svelte-spa-router';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import dayjs from 'dayjs';
	import 'dayjs/locale/fr';
	import { formatNumberByThousands, satoshisToBitcoins } from '../../utils/helpers';
	import {
		applicationSettings,
		bitcoinCurrentPrices,
		bitcoinNetworkBlockHeight,
		bitcoinTestnetNetwork,
		configSelectedCurrentData,
		selectedCurrency,
	} from '../../store';
	import Button from '../../components/ui/Button.svelte';
	import Loading from '../../components/ui/Loading.svelte';
	import Overlay from '../../components/ui/Overlay.svelte';
	import WalletDetails from '../../components/config/CurrentConfigDetails.svelte';

	export let currentPendingAmount = 0;
	export let endShowLoadingTransaction = false;

	const dispatch = createEventDispatcher();

	const Deposit = './img/icons/ui/deposit.svg';
	const Withdraw = './img/icons/ui/withdraw.svg';
	// TODO: use a global variable from dashboard
	let showLoadingTransaction = $querystring.includes('withdraw=true');
	// let showLoadingTransaction = true;

	let overlayData = {};
	let overlayLoadedTx = {};
	let showOverlay = false;

	$: if (showLoadingTransaction && endShowLoadingTransaction) {
		showLoadingTransaction = false;
	}

	$: if ($bitcoinNetworkBlockHeight && showOverlay) {
		for (let i = 0; i < $configSelectedCurrentData.transactions.length; i++) {
			if ($configSelectedCurrentData.transactions[i].txid === overlayLoadedTx.txid) {
				// TODO: refactor bad code
				handleViewDetail($configSelectedCurrentData.transactions[i]);
				break;
			}
		}
	}

	const handleViewDetail = (tx, overlay = false) => {
		const confirmationNumber = tx.status.confirmed ? $bitcoinNetworkBlockHeight - tx.status.block_height + 1 : 1;
		overlayData = { ...tx, confirmations: confirmationNumber };
		const string =
			overlayData.confirmations > 1
				? $_('dashboard.transaction.overlay.title.confirmations', { default: ' confirmations' })
				: $_('dashboard.transaction.overlay.title.confirmation', { default: ' confirmation' });
		overlayData = { ...overlayData, confirmationString: string };
		if (overlay) {
			overlayLoadedTx = { ...tx };
			showOverlay = true;
		}
	};

	const handleCloseOverlay = () => {
		showOverlay = false;
		overlayLoadedTx = {};
	};

	const openTransactionUrl = txid => {
		window.api.ipcRenderer.invoke('os:open-url-with-browser', { url: 'blockstream-explorer', txid: txid });
	};

	if (showLoadingTransaction) {
		setTimeout(() => {
			dispatch('reupdateAccountData');
		}, 0);
	}
	onMount(() => {
		animateScroll.scrollToTop();
	});
</script>

<WalletDetails {currentPendingAmount} dontshowWalletName showActionButtons />

<div class="columns">
	<div class="column">
		<h3 class="title is-4">
			{$_('dashboard.transaction.title', { default: 'All transactions' })}
			{#if $bitcoinTestnetNetwork}
				<span class="is-size-5">(TESTNET)</span>
			{/if}
		</h3>
	</div>
</div>

<div class="columns">
	<div class="column">
		<div class="card">
			<div class="card-content">
				{#if !$configSelectedCurrentData || !$configSelectedCurrentData.config}
					<Loading text={$_('dashboard.transaction.loading', { default: 'Loading data' })} />
				{:else}
					{#if showLoadingTransaction}
						<Loading text={$_('dashboard.transaction.updating', { default: 'Updating data' })} dontShowLogo />
					{/if}
					{#if $configSelectedCurrentData.transactions.length < 1}
						<div class="no-transaction">
							<h4 class="title is-5 has-text-weight-medium">{$_('dashboard.transaction.no_tx_found', { default: 'No transaction found' })}</h4>
						</div>
					{:else}
						{#each $configSelectedCurrentData.transactions.slice().reverse() as { address, status, value, type }, i}
							{#if !status.confirmed}
								<div class="transaction" on:click={() => handleViewDetail($configSelectedCurrentData.transactions.slice().reverse()[i], true)}>
									<div class="arrow">
										{#if type === 'received'}
											<span class="icon has-no-hover is-inline-block is-success"><img src={Deposit} alt="Deposit" /></span>
										{:else}<span class="icon has-no-hover is-inline-block is-withdraw"><img src={Withdraw} alt="Withdraw" /></span>{/if}
									</div>
									<div class="info has-text-multiline mr-2">
										<p class="date is-size-7 has-text-grey-dark is-uppercase has-text-weight-medium">
											{$_('dashboard.transaction.unconfirmed', { default: 'Unconfirmed' })}
										</p>
										<h5 class="address subtitle is-size-5 has-text-weight-semibold is-family-primary">{type === 'received' ? address.address : address}</h5>
									</div>
									<div class="details">
										<p class="value is-size-6">
											<span>
												{$applicationSettings.satoshiUnit
													? formatNumberByThousands(value, false, '', false, 0)
													: formatNumberByThousands(satoshisToBitcoins(value).toNumber(), false, '', false, 8)}</span
											><span class="is-size-7 ml-1">{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span>
										</p>
										<p class="action is-size-6 has-text-grey-darker">{$_('dashboard.transaction.view_details', { default: 'View details' })}</p>
									</div>
								</div>
							{/if}
						{/each}
						{#each $configSelectedCurrentData.transactions.sort((a, b) => b.status.block_time - a.status.block_time) as { address, status, value, type }, i}
							{#if status.confirmed}
								<div class="transaction" on:click={() => handleViewDetail($configSelectedCurrentData.transactions[i], true)}>
									<div class="arrow">
										{#if type === 'received'}
											<span class="icon has-no-hover is-inline-block is-success"><img src={Deposit} alt="Deposit" /></span>
										{:else}<span class="icon has-no-hover is-inline-block is-withdraw"><img src={Withdraw} alt="Withdraw" /></span>{/if}
									</div>
									<div class="info has-text-multiline mr-2">
										<p class="date is-size-7 has-text-grey-dark is-capitalized">
											{dayjs
												.unix(status.block_time)
												.locale($applicationSettings.interfaceLanguage === 'fr' ? 'fr' : 'en')
												.format('dddd[,] MMMM D[,] YYYY HH[:]mm')}
										</p>
										<h5 class="address subtitle is-size-5 has-text-weight-semibold is-family-primary">{type === 'received' ? address.address : address}</h5>
									</div>
									<div class="details">
										<p class="value is-size-6">
											<span>
												{$applicationSettings.satoshiUnit
													? formatNumberByThousands(value, false, '', false, 0)
													: formatNumberByThousands(satoshisToBitcoins(value).toNumber(), false, '', false, 8)}</span
											><span class="is-size-7 ml-1">{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span>
										</p>
										<p class="action is-size-6 has-text-grey-darker">{$_('dashboard.transaction.view_details', { default: 'View details' })}</p>
									</div>
								</div>
							{/if}
						{/each}
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>

{#if showOverlay}
	<Overlay
		title={overlayData.status.confirmed
			? $_('dashboard.transaction.overlay.title.completed', { default: 'Completed with ' }) +
			  formatNumberByThousands(overlayData.confirmations, false, '', false, 0) +
			  overlayData.confirmationString +
			  ' ✓'
			: $_('dashboard.transaction.overlay.title.waiting', { default: 'Waiting for confirmation...' })}
		subtitle={overlayData.status.confirmed
			? dayjs
					.unix(overlayData.status.block_time)
					.locale($applicationSettings.interfaceLanguage === 'fr' ? 'fr' : 'en')
					.format('dddd[,] MMMM DD[,] YYYY HH[:]mm')
			: overlayData.type === 'received'
			? $_('dashboard.transaction.overlay.subtitle.incoming', { default: 'Incoming transaction' })
			: $_('dashboard.transaction.overlay.subtitle.withdraw', { default: 'Withdraw transaction' })}
		on:closeOverlayClicked={handleCloseOverlay}
	>
		<div class="transaction-details-overlay">
			<div class="field is-selectable">
				<div class="label">
					{overlayData.type === 'received'
						? $_('dashboard.transaction.overlay.label.received', { default: 'Received on' })
						: $_('dashboard.transaction.overlay.label.sent', { default: 'Sent to' })}
				</div>
				{#if overlayData.type === 'received'}
					{$configSelectedCurrentData.name} {$configSelectedCurrentData.config.totalSigners > 1 ? 'vault' : 'wallet'} |
				{/if}
				{overlayData.type === 'received' ? overlayData.address.address : overlayData.address}
			</div>
			<div class="field is-selectable">
				<div class="label">{$_('dashboard.transaction.overlay.label.amount', { default: 'Amount' })}</div>
				{$applicationSettings.satoshiUnit
					? formatNumberByThousands(overlayData.value, false, '', false, 0)
					: formatNumberByThousands(satoshisToBitcoins(overlayData.value).toNumber(), false, '', false, 8)}<span class="is-size-7 ml-1"
					>{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span
				>
				<span
					class="is-size-8"
					title={`{${$_('withdraw.preview.current', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.preview.value', {
						default: 'value',
					})}`}
				>
					(≈{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(overlayData.value).toNumber(), true, $selectedCurrency)}<span
						class="ml-1">{$selectedCurrency}</span
					>)
				</span>
			</div>
			<div class="field is-selectable">
				<div class="label">{$_('dashboard.transaction.overlay.label.fee', { default: 'Fee' })}</div>
				{$applicationSettings.satoshiUnit
					? formatNumberByThousands(overlayData.fee, false, '', false, 0)
					: formatNumberByThousands(satoshisToBitcoins(overlayData.fee).toNumber(), false, '', false, 8)}<span class="is-size-7 ml-1"
					>{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}</span
				>
				<span
					class="is-size-8"
					title={`{${$_('withdraw.preview.current', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.preview.value', {
						default: 'value',
					})}`}
				>
					(≈{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(overlayData.fee).toNumber(), true, $selectedCurrency)}<span
						class="ml-1">{$selectedCurrency}</span
					>)
				</span>
			</div>
			{#if overlayData.status.confirmed && overlayData.status.block_height}
				<div class="field is-selectable">
					<div class="label">
						{#if $bitcoinTestnetNetwork}
							{$_('dashboard.transaction.overlay.label.testnet_height', { default: 'Testnet block height' })}
						{:else}
							{$_('dashboard.transaction.overlay.label.height', { default: 'Block height' })}
						{/if}
					</div>
					{formatNumberByThousands(overlayData.status.block_height, false, '', false, 0)}
				</div>
			{/if}
			<div class="field is-selectable">
				<div class="label">{$_('dashboard.transaction.overlay.label.id', { default: 'Transaction ID' })}</div>
				{overlayData.txid}
			</div>
			<div class="buttons is-right mt-5">
				<Button
					text={$_('dashboard.transaction.overlay.label.button_cta', { default: 'View on Blockstream explorer' })}
					buttonClass="is-primary"
					icon="goToWeb"
					on:buttonClicked={() => openTransactionUrl(overlayData.txid)}
					title={$_('dashboard.transaction.overlay.label.button_title', { default: 'Open in default browser' })}
				/>
			</div>
		</div>
	</Overlay>
{/if}

<style lang="scss">
	.column .card {
		padding: 1.5rem 3.21rem;

		.card-content {
			padding: 2rem;
		}
	}

	.no-transaction {
		display: flex;
		align-items: center !important;
	}

	.transaction {
		display: flex;
		align-items: center;
		padding-bottom: 0.8rem;
		margin-top: 0.8625rem;

		.arrow {
			margin-right: 2rem;

			.icon,
			img {
				width: 30px;
				height: 30px;
			}

			img {
				margin-top: 7px;
			}
		}

		.details {
			margin-left: auto;
			text-align: right;

			.value {
				font-weight: 400;
			}

			.action:hover {
				color: #c3283d !important;
			}
		}

		&:not(:last-child) {
			// border-bottom: solid 1px #424242c9;
			border-bottom: solid 1px darken(#f8f7f6, 7%);
		}

		&:hover {
			cursor: pointer;
		}

		&:focus:not(:hover) {
			outline: #c3283d auto 1px;
		}
	}

	.transaction-details-overlay {
		min-width: 50vw;
	}

	@media screen and (max-width: 1344px) {
		.column .card {
			padding: 1.25rem 2rem;

			.card-content {
				padding: 2rem;
			}
		}
	}

	@media screen and (max-width: 1095px) {
		.column .card {
			padding: 1rem 0.75rem;

			.card-content {
				padding: 2rem;
			}
		}
	}
</style>
