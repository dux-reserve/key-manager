<script>
	import { bitcoinCurrentPrices, bitcoinTestnetNetwork, selectedCurrency, userSettings } from '../../store';
	import { formatNumberByThousands, satoshisToBitcoins } from '../../utils/helpers';

	export let currentBalanceWithdraw = 0;
	export let finalFee = 0;
	export let finalTransactionAmount = 0;
	export let transactionDestinationAddress = '';
	export let useAllFunds = false;
	export let walletType = 'single';

	const checkCircle = './img/icons/ui/check-circle.svg';
</script>

<div class="column details is-12-tablet is-10-desktop is-offset-0-tablet is-offset-1-desktop mt-5">
	<div class="card">
		<div class="card-content">
			<div class="card-title ">
				<p class="subtitle is-5 is-primary has-text-weight-bold mb-4">Your signed transaction was broadcast</p>
			</div>
			<div class="columns">
				<div class="column is-7 is-selectable">
					<div class="field">
						<div class="label">Destination address</div>
						<p class="has-text-weight-normal has-text-multiline">
							{transactionDestinationAddress}
						</p>
					</div>
					<div class="field is-selectable">
						<div class="label">Amount</div>
						<p class="has-text-weight-normal has-text-multiline">
							{$userSettings.satoshiUnit
								? formatNumberByThousands(finalTransactionAmount, false, '', false, 0)
								: formatNumberByThousands(satoshisToBitcoins(finalTransactionAmount), false, '', false, 8)}
							{$bitcoinTestnetNetwork ? 't' : ''}{$userSettings.satoshiUnit ? 'sats' : 'BTC'}
							<span class="is-size-7" title={'Current ' + $selectedCurrency + ' value'}>
								(≈{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(finalTransactionAmount), true, $selectedCurrency)}
								{$selectedCurrency})
							</span>
						</p>
					</div>
					<div class="field is-selectable">
						<div class="label">Network fee</div>

						<p class="has-text-weight-normal has-text-multiline">
							{$userSettings.satoshiUnit
								? formatNumberByThousands(finalFee, false, '', false, 0)
								: formatNumberByThousands(satoshisToBitcoins(finalFee), false, '', false, 8)}
							{$bitcoinTestnetNetwork ? 't' : ''}{$userSettings.satoshiUnit ? 'sats' : 'BTC'}
							<span class="is-size-7" title={'Current ' + $selectedCurrency + ' value'}
								>(≈{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(finalFee), true, $selectedCurrency)}
								{$selectedCurrency})
							</span>
						</p>
					</div>
					<div class="field is-selectable">
						<div class="label">New balance</div>
						<p class="has-text-weight-normal has-text-multiline">
							{$userSettings.satoshiUnit
								? formatNumberByThousands(currentBalanceWithdraw - finalTransactionAmount - finalFee, false, '', false, 0)
								: formatNumberByThousands(satoshisToBitcoins(currentBalanceWithdraw - finalTransactionAmount - finalFee), false, '', false, 8)}
							{$bitcoinTestnetNetwork ? 't' : ''}{$userSettings.satoshiUnit ? 'sats' : 'BTC'}
							<span class="is-size-7" title={'Current ' + $selectedCurrency + ' value'}
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

				<div class="column is-5 details-action">
					<div class="check"><span class="icon is-primary has-no-size has-no-hover mb-5"><img src={checkCircle} alt="Success" /></span></div>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.details {
		.details-action {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			padding: 0;
			padding-bottom: 2rem;
			padding-left: 2rem;

			img {
				width: auto;
				max-width: 320px;
				max-height: 210px;
				margin-right: auto;
				margin-left: auto;
				object-fit: cover;
			}

			.check {
				justify-content: space-around;
				margin-top: 3.5rem;

				img {
					width: 121px;
				}
			}

			.field {
				word-wrap: break-word;
			}
		}
	}
</style>
