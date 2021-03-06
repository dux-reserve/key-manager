<script>
	import { _ } from 'svelte-i18n';
	import { bitcoinCurrentPrices, bitcoinTestnetNetwork, configSelectedCurrentData, selectedCurrency, applicationSettings } from '../../store';
	import { formatNumberByThousands, satoshisToBitcoins } from '../../utils/helpers';

	const helpIcon = './img/icons/ui/help.svg';

	// export let desiredFee = 0; // sats / vbyte
	export let finalFee = 1;
	export let finalTransactionAmount = 0; // in satoshi
	export let transactionDestinationAddress = '';
	export let txInputsTotal = 0;
	export let walletType = 'single';

	$: feePercentage = ((finalFee / finalTransactionAmount) * 100).toFixed((finalFee / finalTransactionAmount) * 100 < 1 ? 2 : 0);
</script>

<div class="columns is-centered mt-6 mb-2 is-selectable">
	<div class="column is-4 is-offset-1">
		<div class="field is-selectable">
			<div class="label">{$_('withdraw.min_preview.destination_address', { default: 'Destination address' })} (output #1)</div>
			<span class="has-text-weight-normal has-text-multiline">
				{transactionDestinationAddress}
			</span>
		</div>
		<div class="field is-selectable">
			<div class="label">{$_('withdraw.min_preview.amount', { default: 'Amount' })}</div>
			<p class="has-text-weight-normal has-text-multiline">
				{$applicationSettings.satoshiUnit
					? formatNumberByThousands(finalTransactionAmount, false, '', false, 0)
					: formatNumberByThousands(satoshisToBitcoins(finalTransactionAmount), false, '', false, 8)}
				{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}
				<span
					class="is-size-7"
					title={`${$_('withdraw.min_preview.current', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.min_preview.value', {
						default: 'value',
					})}`}
				>
					(≈{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(finalTransactionAmount), true, $selectedCurrency)}
					{$selectedCurrency})
				</span>
			</p>
		</div>
		{#if txInputsTotal - finalTransactionAmount - finalFee !== 0}
			<div class="field is-selectable">
				<div class="label">
					{$_('withdraw.min_preview.network_fee', { default: 'Network fee' })}
					<span data-tooltip={$_('withdraw.min_preview.network_fee_title', { default: 'Fee percentage in relation to transaction amount' })}
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
						title={`${$_('withdraw.min_preview.current', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.min_preview.value', {
							default: 'value',
						})}`}
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
					{$_('withdraw.min_preview.change_address', { default: 'Change address' })} (output #2)<span
						class="icon is-small ml-2 is-prussian-blue has-no-hover"
						data-tooltip={`${$_('withdraw.min_preview.tooltip_1', { default: 'When you withdraw funds from your bitcoint' })} ${
							walletType === 'single' ? $_('withdraw.min_preview.wallet', { default: 'wallet' }) : $_('withdraw.min_preview.vault', { default: 'vault' })
						}, ${$_('withdraw.min_preview.tooltip_2', {
							default: 'the specified amount of funds is sent to the intended bitcoin address and the remainder of the funds is sent back to your change address',
						})}`}><img src={helpIcon} alt="help" /></span
					>
				</div>
				<p class="has-text-weight-normal has-text-multiline">
					{$configSelectedCurrentData.unusedChangeAddresses[0].address}
				</p>
			</div>
			<div class="field is-selectable">
				<div class="label">
					{$_('withdraw.min_preview.change_amount', { default: 'Change amount' })}<span
						class="icon is-small ml-2 is-prussian-blue has-no-hover"
						data-tooltip={`${$_('withdraw.min_preview.tooltip_1', { default: 'When you withdraw funds from your bitcoint' })} ${
							walletType === 'single' ? $_('withdraw.min_preview.wallet', { default: 'wallet' }) : $_('withdraw.min_preview.vault', { default: 'vault' })
						}, ${$_('withdraw.min_preview.tooltip_2', {
							default: 'the specified amount of funds is sent to the intended bitcoin address and the remainder of the funds is sent back to your change address',
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
			<div class="field is-selectable">
				<div class="label">
					{$_('withdraw.min_preview.total_amount', { default: 'Total amount' })}<span
						class="icon is-small ml-2 is-prussian-blue has-no-hover"
						data-tooltip={$_('withdraw.min_preview.tooltip_total', { default: 'This includes the amount, the network fee and change amount' })}
					>
						<img src={helpIcon} alt="help" /></span
					>
				</div>
				<p class="has-text-weight-normal has-text-multiline">
					{$applicationSettings.satoshiUnit
						? formatNumberByThousands(txInputsTotal, false, '', false, 0)
						: formatNumberByThousands(satoshisToBitcoins(txInputsTotal), false, '', false, 8)}
					{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}
				</p>
			</div>
		{:else}
			<div class="field is-selectable">
				<div class="label">
					{$_('withdraw.min_preview.network_fee', { default: 'Network fee' })}
					<span title={$_('withdraw.min_preview.network_fee_title', { default: 'Network fee' })}>({feePercentage}%)</span>
				</div>
				<p class="has-text-weight-normal has-text-multiline">
					{$applicationSettings.satoshiUnit
						? formatNumberByThousands(finalFee, false, '', false, 0)
						: formatNumberByThousands(satoshisToBitcoins(finalFee), false, '', false, 8)}
					{$bitcoinTestnetNetwork ? 't' : ''}{$applicationSettings.satoshiUnit ? 'sats' : 'BTC'}
					<span
						class="is-size-7"
						title={`${$_('withdraw.min_preview.current', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.min_preview.value', {
							default: 'value',
						})}`}
						>(≈{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency] * satoshisToBitcoins(finalFee), true, $selectedCurrency)}
						{$selectedCurrency})
					</span>
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	[data-tooltip]::before {
		width: 430px;
	}
</style>
