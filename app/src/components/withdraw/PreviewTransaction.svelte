<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import { formatNumberByThousands, satoshisToBitcoins } from '../../utils/helpers';
	import { bitcoinCurrentPrices, bitcoinTestnetNetwork, configSelectedCurrentData, selectedCurrency, applicationSettings } from '../../store';

	const helpIcon = './img/icons/ui/help.svg';

	export let desiredFee = 0;
	export let finalFee = 0;
	export let finalTransactionAmount = 0;
	export let signedDevices = 0;
	export let transactionDestinationAddress = '';
	export let txInputs = null;
	export let txInputsTotal = 0;
	export let walletType = 'single';

	$: currentBalanceWithdraw = $configSelectedCurrentData.currentBalance ? $configSelectedCurrentData.currentBalance : 0;

	$: feePercentage = ((finalFee / finalTransactionAmount) * 100).toFixed((finalFee / finalTransactionAmount) * 100 < 1 ? 2 : 0);

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns">
		<div class="column details is-12-tablet is-10-desktop is-offset-0-tablet is-offset-1-desktop">
			<div class="card">
				<div class="card-content">
					<div class="card-title ">
						<p class="subtitle is-5 is-primary has-text-weight-bold mb-4">
							{#if $applicationSettings.interfaceLanguage === 'en'}
								{$_('withdraw.preview.title_review', { default: 'Review' })}
								{signedDevices === 0
									? $_('withdraw.preview.title_review_unsigned', { default: 'unsigned' })
									: signedDevices !== $configSelectedCurrentData.config.quorum.requiredSigners && signedDevices >= 1
									? $_('withdraw.preview.title_review_partly_signed', { default: 'partially signed' })
									: $_('withdraw.preview.title_review_signed', { default: 'signed' })}
								{$bitcoinTestnetNetwork ? 'testnet' : ''}
								{$_('withdraw.preview.title_review_transaction', { default: 'transaction' })}
							{:else if $applicationSettings.interfaceLanguage === 'fr'}
								{$_('withdraw.preview.title_review', { default: 'Review' })}
								{$_('withdraw.preview.title_review_transaction', { default: 'transaction' })}
								{$bitcoinTestnetNetwork ? 'testnet' : ''}
								{signedDevices === 0
									? $_('withdraw.preview.title_review_unsigned', { default: 'unsigned' })
									: signedDevices !== $configSelectedCurrentData.config.quorum.requiredSigners && signedDevices >= 1
									? $_('withdraw.preview.title_review_partly_signed', { default: 'partially signed' })
									: $_('withdraw.preview.title_review_signed', { default: 'signed' })}
							{/if}
						</p>
					</div>
					<div class="columns">
						<div class="column is-6 is-selectable">
							<div class="field is-selectable">
								<div class="label">{$_('withdraw.preview.destination_address', { default: 'Destination address' })} (output #1)</div>
								<p class="has-text-weight-normal has-text-multiline">
									{transactionDestinationAddress}
								</p>
							</div>
							<div class="field is-selectable">
								<div class="label">{$_('withdraw.preview.amount', { default: 'Amount' })}</div>
								<p class="has-text-weight-normal has-text-multiline">
									{$applicationSettings.satoshiUnit
										? formatNumberByThousands(finalTransactionAmount, false, '', false, 0)
										: formatNumberByThousands(satoshisToBitcoins(finalTransactionAmount), false, '', false, 8)}
									{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}
									<span
										class="is-size-7"
										title={`{${$_('withdraw.preview.current', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.preview.value', {
											default: 'value',
										})}`}
									>
										(≈{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(finalTransactionAmount), true, $selectedCurrency)}
										{$selectedCurrency})
									</span>
								</p>
							</div>
							<div class="field is-selectable">
								<div class="label">
									{$_('withdraw.preview.network_fee', { default: 'Network fee' })}
									<span data-tooltip={$_('withdraw.preview.network_fee_title', { default: 'Fee percentage in relation to transaction amount' })}
										>({feePercentage}%)</span
									>
								</div>
								<p class="has-text-weight-normal has-text-multiline">
									{$applicationSettings.satoshiUnit
										? formatNumberByThousands(finalFee, false, '', false, 0)
										: formatNumberByThousands(satoshisToBitcoins(finalFee), false, '', false, 8)}
									{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}
									<span
										class="is-size-7"
										title={`{${$_('withdraw.preview.current', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.preview.value', {
											default: 'value',
										})}`}
										>(≈{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(finalFee), true, $selectedCurrency)}
										{$selectedCurrency})
									</span>
								</p>
							</div>
							<div class="field is-selectable">
								<div class="label">{$_('withdraw.preview.new_balance', { default: 'New balance' })}</div>
								<p class="has-text-weight-normal has-text-multiline">
									{$applicationSettings.satoshiUnit
										? formatNumberByThousands(currentBalanceWithdraw - finalTransactionAmount - finalFee, false, '', false, 0)
										: formatNumberByThousands(satoshisToBitcoins(currentBalanceWithdraw - finalTransactionAmount - finalFee), false, '', false, 8)}
									{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}
									<span
										class="is-size-7"
										title={`{${$_('withdraw.preview.current', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.preview.value', {
											default: 'value',
										})}`}
										>(≈{formatNumberByThousands(
											$bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(currentBalanceWithdraw - finalTransactionAmount - finalFee),
											true,
											'$',
										)}
										{$selectedCurrency})
									</span>
								</p>
							</div>
						</div>

						<div class="column is-6 is-selectable">
							{#if txInputsTotal - finalTransactionAmount - finalFee > 0}
								<div class="field is-selectable">
									<div class="label">
										{$_('withdraw.preview.change_address', { default: 'Change address' })} (output #2)<span
											class="icon is-small ml-2 is-prussian-blue"
											data-tooltip={`${$_('withdraw.preview.tooltip_1', { default: 'When you withdraw funds from your bitcoint' })}} ${
												walletType === 'single' ? $_('withdraw.preview.wallet', { default: 'wallet' }) : $_('withdraw.preview.vault', { default: 'vault' })
											}, ${$_('withdraw.preview.tooltip_2', {
												default:
													'the specified amount of funds are sent to the intended bitcoin address and the remainder of the funds are sent back to your change address',
											})}`}><img src={helpIcon} alt="help" /></span
										>
									</div>
									<p class="has-text-weight-normal has-text-multiline">
										{$configSelectedCurrentData.unusedChangeAddresses[0].address}
									</p>
								</div>
								<div class="field is-selectable">
									<div class="label">
										{$_('withdraw.preview.change_amount', { default: 'Change amount' })}<span
											class="icon is-small ml-2 is-prussian-blue"
											data-tooltip={`${$_('withdraw.preview.tooltip_1', { default: 'When you withdraw funds from your bitcoint' })}} ${
												walletType === 'single' ? $_('withdraw.preview.wallet', { default: 'wallet' }) : $_('withdraw.preview.vault', { default: 'vault' })
											}, ${$_('withdraw.preview.tooltip_2', {
												default:
													'the specified amount of funds are sent to the intended bitcoin address and the remainder of the funds are sent back to your change address',
											})}`}><img src={helpIcon} alt="help" /></span
										>
									</div>
									<p class="has-text-weight-normal has-text-multiline">
										{$applicationSettings.satoshiUnit
											? formatNumberByThousands(txInputsTotal - finalTransactionAmount - finalFee, false, '', false, 0)
											: formatNumberByThousands(satoshisToBitcoins(txInputsTotal - finalTransactionAmount - finalFee), false, '', false, 8)}
										{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}
									</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.transaction-io-margin {
		margin-bottom: 0.5625rem;
	}

	[data-tooltip]::before {
		width: 350px;
	}

	.transaction-io {
		overflow-y: scroll;
		max-height: 256px;

		&::-webkit-scrollbar {
			width: 6px;
		}
		&::-webkit-scrollbar-track {
			background: transparent;
		}
		&::-webkit-scrollbar-thumb {
			border-radius: 10px;
			background: #464e5d;
		}
	}
</style>
