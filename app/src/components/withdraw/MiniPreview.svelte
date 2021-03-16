<script>
	import { bitcoinCurrentPrices, bitcoinTestnetNetwork, configSelectedCurrentData, selectedCurrency, userSettings } from '../../store';
	import { formatNumberByThousands, satoshisToBitcoins } from '../../utils/helpers';

	const helpIcon = './img/icons/ui/help.svg';

	// export let desiredFee = 0; // sats / vbyte
	export let finalFee = 1;
	export let finalTransactionAmount = 0; // in satoshi
	export let transactionDestinationAddress = '';
	export let txInputsTotal = 0;
	export let walletType = 'single';

	$: feePercentage = ((finalFee / finalTransactionAmount) * 100).toFixed(0);
</script>

<div class="columns is-centered mt-6 mb-2 is-selectable">
	<div class="column is-4 is-offset-1">
		<div class="field is-selectable">
			<div class="label">Destination address (output #1)</div>
			<span class="has-text-weight-normal has-text-multiline">
				{transactionDestinationAddress}
			</span>
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
		{#if txInputsTotal - finalTransactionAmount - finalFee !== 0}
			<div class="field is-selectable">
				<div class="label">Network fee <span title="Fee percentage in relation to transaction amount">({feePercentage}%)</span></div>
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
		{/if}
	</div>
	<div class="column is-4 is-offset-1">
		{#if txInputsTotal - finalTransactionAmount - finalFee > 0}
			<div class="field is-selectable">
				<div class="label">
					Change address (output #2)<span
						class="icon is-small ml-2 is-prussian-blue"
						title={`When you withdraw funds from your bitcoin ${
							walletType === 'single' ? 'wallet' : 'vault'
						}, the specified amount of funds are sent to the intended bitcoin address and the remainder of the funds are sent back to your change address`}
						><img src={helpIcon} alt="help" /></span
					>
				</div>
				<p class="has-text-weight-normal has-text-multiline">
					{$configSelectedCurrentData.unusedChangeAddresses[0].address}
				</p>
			</div>
			<div class="field is-selectable">
				<div class="label">
					Change amount<span
						class="icon is-small ml-2 is-prussian-blue"
						title={`When you withdraw funds from your bitcoin ${
							walletType === 'single' ? 'wallet' : 'vault'
						}, the specified amount of funds are sent to the intended bitcoin address and the remainder of the funds are sent back to your change address`}
						><img src={helpIcon} alt="help" /></span
					>
				</div>
				<p class="has-text-weight-normal has-text-multiline">
					{$userSettings.satoshiUnit
						? formatNumberByThousands(txInputsTotal - finalTransactionAmount - finalFee, false, '', false, 0)
						: formatNumberByThousands(satoshisToBitcoins(txInputsTotal - finalTransactionAmount - finalFee), false, '', false, 8)}
					{$bitcoinTestnetNetwork ? 't' : ''}{$userSettings.satoshiUnit ? 'sats' : 'BTC'}
				</p>
			</div>
		{:else}
			<div class="field is-selectable">
				<div class="label">Network fee <span title="Fee percentage in relation to transaction amount">({feePercentage}%)</span></div>
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
		{/if}
	</div>
</div>
