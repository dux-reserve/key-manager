<script>
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import coinSelect from 'coinselect';
	import coinSelectSplit from 'coinselect/split';

	import { bitcoinCurrentPrices, bitcoinTestnetNetwork, configSelectedCurrentData, selectedCurrency, userSettings } from '../../store';
	import { bitcoinsToSatoshis, formatNumberByThousands, satoshisToBitcoins, toFixedNoRounding } from '../../utils/helpers';

	import Button from '../../components/ui/Button.svelte';
	import ButtonDropDown from '../../components/ui/ButtonDropDown.svelte';
	import Loading from '../../components/ui/Loading.svelte';
	import SelectionDropDown from '../../components/ui/SelectionDropDown.svelte';
	import WalletDetails from '../../components/config/CurrentConfigDetails.svelte';
	import WithdrawSteps from '../../components/withdraw/WithdrawSteps.svelte';

	export let currentAvailableAmount = -1;
	export let currentPendingAmount = 0;

	$: availableFiatAmount = currentAvailableAmount ? satoshisToBitcoins(currentAvailableAmount).toNumber() * $bitcoinCurrentPrices[$selectedCurrency] : 0;

	$: amountUnitsChoice = useAllFunds
		? [
				{ name: 'bitcoin', selected: !$userSettings.satoshiUnit },
				{ name: 'satoshi', selected: $userSettings.satoshiUnit },
		  ]
		: [
				{ name: 'bitcoin', selected: !$userSettings.satoshiUnit },
				{ name: 'satoshi', selected: $userSettings.satoshiUnit },
				{ name: $selectedCurrency, selected: false },
		  ];

	const dispatch = createEventDispatcher();

	let amountConverted = 0;
	let craftingPSBT = false;
	let createdPsbt = null;
	let desiredFee = 1;
	let errorOverlay = false;
	let estimatedFeeRates = { minimumFee: 1 };
	let estimatingFee = false;
	let feeDropdownText = 'Estimating... sats / vbyte';
	let finalFee = 1;
	let finalTransactionAmount = 0;
	let invalidAddressErrorMessage = '';
	let notEnoughFee = false;
	let notEnoughFeeOverlay = false;
	let notEnoughFunds = false;
	let selectedDropdownFee = 0;
	let showCustomFeeInput = false;
	let showWithdrawSteps = false;
	let transactionAmount;
	let transactionDestinationAddress = '';
	let txInputs = [];
	let txOutputs = [];
	let unitDropdownText = $userSettings.satoshiUnit ? 'satoshi' : 'bitcoin';
	let useAllFunds = false;
	let validTransactionAddress = false;

	$: if (invalidAddressErrorMessage && transactionDestinationAddress.length === 0) {
		validTransactionAddress = false;
		invalidAddressErrorMessage = '';
	}

	$: if (desiredFee > 2000) {
		desiredFee = 2000;
	}

	const handleTransactionDestinationAddress = async () => {
		if (transactionDestinationAddress.length >= 1) {
			transactionDestinationAddress.trim();

			if (transactionDestinationAddress.includes('bitcoin:')) {
				transactionDestinationAddress = transactionDestinationAddress.split('bitcoin:')[1].trim();
			}

			if (transactionDestinationAddress.includes('?amount=')) {
				const parsedAmount = parseFloat(transactionDestinationAddress.split('?amount=')[1].trim());
				transactionDestinationAddress = transactionDestinationAddress.split('?amount=')[0].trim();

				if (!useAllFunds) {
					transactionAmount =
						unitDropdownText === 'bitcoin'
							? parsedAmount
							: unitDropdownText === 'satoshi'
							? bitcoinsToSatoshis(parsedAmount).toNumber()
							: (parsedAmount * $bitcoinCurrentPrices[$selectedCurrency]).toFixed(2);

					handleTransactionAmountChanged();
				}
			}

			const isAddressValid = await window.api.ipcRenderer.invoke('withdraw:validate-address', { address: transactionDestinationAddress });
			if (isAddressValid.length > 1) {
				validTransactionAddress = false;
				// ? Remove legacy in the alert message
				invalidAddressErrorMessage = isAddressValid.replace(/\.$/, '').replace(" '1',", '').replace(" 'm',", '').replace(" 'n',", '');
			} else {
				validTransactionAddress = true;
				invalidAddressErrorMessage = '';
			}
		}
	};

	const handleUnitSelected = ({ detail }) => {
		if (transactionAmount) {
			if (unitDropdownText === 'bitcoin' && detail === 1) {
				transactionAmount = bitcoinsToSatoshis(transactionAmount).toNumber();
			} else if (unitDropdownText === 'bitcoin' && detail === 2) {
				transactionAmount = (transactionAmount * $bitcoinCurrentPrices[$selectedCurrency]).toFixed(2);
			} else if (unitDropdownText === 'satoshi' && detail === 0) {
				transactionAmount = satoshisToBitcoins(transactionAmount).toNumber();
			} else if (unitDropdownText === 'satoshi' && detail === 2) {
				transactionAmount = (satoshisToBitcoins(transactionAmount).toNumber() * $bitcoinCurrentPrices[$selectedCurrency]).toFixed(2);
			} else if (unitDropdownText === $selectedCurrency && detail === 0) {
				transactionAmount = transactionAmount / $bitcoinCurrentPrices[$selectedCurrency];
			} else if (unitDropdownText === $selectedCurrency && detail === 1) {
				transactionAmount = bitcoinsToSatoshis(transactionAmount / $bitcoinCurrentPrices[$selectedCurrency]).toNumber();
			}
		}

		if (detail === 0) {
			unitDropdownText = 'bitcoin';
		} else if (detail === 1) {
			unitDropdownText = 'satoshi';
		} else if (detail === 2) {
			unitDropdownText = $selectedCurrency;
		}

		handleTransactionAmountChanged();
	};

	const handleTransactionAmountChanged = () => {
		if (transactionAmount && transactionAmount < 0) {
			notEnoughFunds = false;
			transactionAmount = 0;
			amountConverted = 0;
		} else if (transactionAmount) {
			if (unitDropdownText === $selectedCurrency) {
				transactionAmount = toFixedNoRounding(transactionAmount, 4);
				amountConverted = transactionAmount / $bitcoinCurrentPrices[$selectedCurrency];
			} else if (unitDropdownText === 'bitcoin') {
				transactionAmount = toFixedNoRounding(transactionAmount.toFixed(8), 8);
				amountConverted = transactionAmount * $bitcoinCurrentPrices[$selectedCurrency];
			} else {
				transactionAmount = toFixedNoRounding(transactionAmount.toFixed(0), 0);
				amountConverted = satoshisToBitcoins(transactionAmount).toNumber() * $bitcoinCurrentPrices[$selectedCurrency];
			}

			if (
				!useAllFunds &
				((unitDropdownText === $selectedCurrency &&
					bitcoinsToSatoshis(transactionAmount / $bitcoinCurrentPrices[$selectedCurrency]).toNumber() + desiredFee > currentAvailableAmount) ||
					(unitDropdownText === 'bitcoin' && bitcoinsToSatoshis(transactionAmount).toNumber() + desiredFee > currentAvailableAmount) ||
					(unitDropdownText === 'satoshi' && transactionAmount + desiredFee > currentAvailableAmount))
			) {
				notEnoughFunds = true;
			} else {
				notEnoughFunds = false;
			}
		} else {
			notEnoughFunds = false;
			amountConverted = 0;
		}
	};

	const handleMaximumAmount = () => {
		useAllFunds = !useAllFunds;
		transactionAmount = useAllFunds ? currentAvailableAmount : undefined;
		notEnoughFunds = false;
		amountConverted = 0;
		unitDropdownText = $userSettings.satoshiUnit ? 'satoshi' : 'bitcoin';
	};

	const handleEstimateFees = async () => {
		if (!estimatingFee) {
			try {
				estimatingFee = true;
				estimatedFeeRates = await window.api.ipcRenderer.invoke('withdraw:estimate-fees');
				estimatedFeeRates = {
					fastestFee: estimatedFeeRates.fastestFee ? estimatedFeeRates.fastestFee : 69,
					halfHourFee: estimatedFeeRates.halfHourFee ? estimatedFeeRates.halfHourFee : 42,
					hourFee: estimatedFeeRates.hourFee ? estimatedFeeRates.hourFee : 21,
					minimumFee: estimatedFeeRates.minimumFee ? estimatedFeeRates.minimumFee : 7,
				};
			} catch (error) {
				estimatedFeeRates = { fastestFee: 69, halfHourFee: 42, hourFee: 21, minimumFee: 7 };
				console.log('error when estimating fees', error);
			} finally {
				handleFeeSelected({ detail: selectedDropdownFee });

				estimatingFee = false;
			}
		}
	};

	const handleFeeSelected = async ({ detail }) => {
		selectedDropdownFee = detail;

		if (estimatedFeeRates) {
			const names = ['Slow ≈ 1 hour', 'Medium ≈ 30 mins', 'Fast ≈ Next block', 'Custom fee'];

			feeDropdownText = names[detail];
			if (detail === 0) {
				desiredFee = estimatedFeeRates.hourFee;
				showCustomFeeInput = false;
			} else if (detail === 1) {
				desiredFee = estimatedFeeRates.halfHourFee;
				showCustomFeeInput = false;
			} else if (detail === 2) {
				desiredFee = estimatedFeeRates.fastestFee;
				showCustomFeeInput = false;
			}
		}

		if (detail === 3 && !showCustomFeeInput) {
			desiredFee = estimatedFeeRates.minimumFee ? estimatedFeeRates.minimumFee : 7;
			showCustomFeeInput = true;
			feeDropdownText = 'Custom fee';
		}

		handleTransactionAmountChanged();
	};

	// *** PSBT crafting ***

	const handleInitCreateTransaction = async () => {
		craftingPSBT = true;
		handleTransactionDestinationAddress();
		handleTransactionAmountChanged();

		notEnoughFee = desiredFee < estimatedFeeRates.minimumFee;

		if (!notEnoughFunds && !notEnoughFee && validTransactionAddress && transactionAmount > 0) {
			// Convert the transaction value to satoshi
			if (unitDropdownText === 'bitcoin') {
				finalTransactionAmount = bitcoinsToSatoshis(transactionAmount).toNumber();
			} else if (unitDropdownText === 'satoshi') {
				finalTransactionAmount = transactionAmount;
			} else {
				finalTransactionAmount = bitcoinsToSatoshis(transactionAmount / $bitcoinCurrentPrices[$selectedCurrency]).toNumber();
			}
			handleCreateTransactionPsbt();
		} else {
			craftingPSBT = false;
		}
	};

	const handleCreateTransactionPsbt = async () => {
		let coinSelectResult;

		if (useAllFunds) {
			coinSelectResult = await coinSelectSplit(
				$configSelectedCurrentData.availableUtxos,
				[{ address: transactionDestinationAddress, value: undefined }],
				desiredFee,
			);
		} else {
			coinSelectResult = await coinSelect(
				$configSelectedCurrentData.availableUtxos,
				[{ address: transactionDestinationAddress, value: finalTransactionAmount }],
				desiredFee,
			);
		}

		finalFee = coinSelectResult.fee;
		txInputs = coinSelectResult.inputs;
		txOutputs = coinSelectResult.outputs;

		if (useAllFunds) {
			finalTransactionAmount = currentAvailableAmount - finalFee;
		}

		if (finalTransactionAmount + finalFee <= currentAvailableAmount) {
			if (txInputs && txOutputs) {
				createdPsbt = await window.api.ipcRenderer.invoke('psbt:create-psbt', {
					txInputs: txInputs,
					txOutputs: txOutputs,
					unusedChangeAddresses: $configSelectedCurrentData.unusedChangeAddresses,
					config: $configSelectedCurrentData.config,
				});

				dispatch('withdrawStepsStarted');
				errorOverlay = false;
				showWithdrawSteps = true;
			} else {
				errorOverlay = true;
			}
		} else {
			notEnoughFunds = true;
		}
		craftingPSBT = false;
	};

	const handleTransactionCompleted = () => {
		dispatch('withdrawStepsEnded');
		dispatch('reupdateAccountData');
		desiredFee = 1;
		showCustomFeeInput = false;
		transactionAmount = undefined;
		finalTransactionAmount = 0;
		transactionDestinationAddress = '';
		createdPsbt = null;
		finalFee = 1;
		txInputs = [];
		txOutputs = [];
		showWithdrawSteps = false;
		handleEstimateFees();
	};

	const handleTransactionCancel = () => {
		dispatch('withdrawStepsEnded');
		finalFee = 1;
		txInputs = [];
		txOutputs = [];
		createdPsbt = null;
		showWithdrawSteps = false;
		handleEstimateFees();
	};

	const setIntervalEstimateFees = () => {
		setInterval(() => {
			if (!craftingPSBT && !showWithdrawSteps && !estimatingFee) {
				handleEstimateFees();
			}
		}, 69421);
	};

	onMount(async () => {
		animateScroll.scrollToTop();
		await handleEstimateFees();
		setIntervalEstimateFees();
	});

	onDestroy(() => {
		// That make sure the createdPsbt is empty when the view is destroy
		createdPsbt;
		transactionAmount;
		transactionDestinationAddress;
		txInputs;
		txOutputs;
	});
</script>

{#if !showWithdrawSteps}
	<WalletDetails {currentPendingAmount} />

	<div class="columns">
		<div class="column">
			<h3 class="title is-4">
				Transaction details
				{#if $bitcoinTestnetNetwork}
					<span class="is-size-5">(TESTNET)</span>
				{/if}
			</h3>
		</div>
	</div>

	<div class="columns">
		<div class="column">
			<div class="card action">
				<div class="card-content has-text-left">
					{#if !$configSelectedCurrentData.config}
						<div class="loading-container">
							<Loading text="Loading data" />
						</div>
					{:else}
						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">
							Destination address
							<!-- <span class="icon is-white is-inline-block ml-3" on:click={handleInitQrCodeScanner}><img src={qrCodeScanner} /></span> -->
							{#if invalidAddressErrorMessage}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2">
									{invalidAddressErrorMessage}
								</span>
							{/if}
						</h5>
						<div class="field mt-2 mb-5">
							<div class="control">
								<input
									id="txAmount"
									class="input"
									type="text"
									placeholder={$configSelectedCurrentData.unusedAddresses[$configSelectedCurrentData.unusedAddresses.length - 1].address}
									bind:value={transactionDestinationAddress}
									on:change={handleTransactionDestinationAddress}
									disabled={craftingPSBT}
									autofocus
								/>
							</div>
						</div>

						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">
							Amount of
							<SelectionDropDown
								dropdownText={unitDropdownText}
								title={useAllFunds ? '' : 'Click to change the transaction unit'}
								options={amountUnitsChoice}
								dropdownDisabled={craftingPSBT || useAllFunds}
								on:dropdownSelected={handleUnitSelected}
							/>

							{#if !useAllFunds}
								<span class="is-size-7" title={'Current ' + $selectedCurrency + ' value'}>
									({amountConverted > 0 ? '≈' : ''}{formatNumberByThousands(
										amountConverted,
										unitDropdownText !== $selectedCurrency,
										$selectedCurrency,
										false,
										unitDropdownText !== $selectedCurrency ? 2 : 8,
									)}
									{unitDropdownText !== $selectedCurrency ? $selectedCurrency : $bitcoinTestnetNetwork ? 'tBTC' : 'BTC'})
								</span>
							{/if}

							{#if notEnoughFunds && currentAvailableAmount !== -1}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
									>Not enough confirmed funds, please reduce desired fee or the desired amount</span
								>
							{/if}
						</h5>
						<div class="field mt-2 mb-5">
							<div class="control">
								{#if useAllFunds}
									<input
										id="txAmount"
										class="input"
										type="text"
										value={`Withdraw all funds from this ${$configSelectedCurrentData.config.quorum.totalSigners > 1 ? 'vault' : 'wallet'}`}
										disabled
									/>
								{:else}
									<input
										id="txAmount"
										class="input"
										type="number"
										inputmode="decimal"
										min={unitDropdownText === $selectedCurrency ? '0.0001' : unitDropdownText === 'bitcoin' ? '0.00000001' : '1'}
										max={unitDropdownText === $selectedCurrency
											? availableFiatAmount
											: unitDropdownText === 'bitcoin'
											? satoshisToBitcoins($configSelectedCurrentData.currentBalance).toNumber()
											: $configSelectedCurrentData.currentBalance}
										step={unitDropdownText === $selectedCurrency ? '0.0001' : unitDropdownText === 'bitcoin' ? '0.00000001' : '1'}
										placeholder={currentAvailableAmount === -1
											? 'Scanning for confirmed funds'
											: $configSelectedCurrentData.currentBalance > 0
											? (unitDropdownText === $selectedCurrency
													? formatNumberByThousands(availableFiatAmount, true, $selectedCurrency, false, 2)
													: unitDropdownText === 'bitcoin'
													? formatNumberByThousands(
															satoshisToBitcoins(currentAvailableAmount !== -1 ? currentAvailableAmount : 0).toNumber(),
															false,
															'',
															false,
															8,
													  ) + ($bitcoinTestnetNetwork ? ' tBTC' : ' BTC')
													: (currentAvailableAmount !== -1 ? currentAvailableAmount : 0) + ' sats') +
											  (currentAvailableAmount === $configSelectedCurrentData.currentBalance || currentAvailableAmount === -1 ? '' : ' confirmed')
											: 'No fund available'}
										bind:value={transactionAmount}
										on:input={handleTransactionAmountChanged}
										disabled={craftingPSBT || currentAvailableAmount === -1}
									/>
								{/if}
								{#if currentAvailableAmount > 0}
									<span
										class="is-link input-inner-text"
										class:is-primary={useAllFunds}
										title={useAllFunds ? 'Edit Amount' : 'Use all confirmed funds'}
										on:click={handleMaximumAmount}
									>
										{useAllFunds ? 'EDIT' : 'MAX'}
									</span>
								{/if}
							</div>
						</div>
						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">
							Network fee
							{#if desiredFee > 421 && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2">(Insane amount, are your sure?)</span>
							{:else if desiredFee > estimatedFeeRates.fastestFee + 21 && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2">(Overpaying)</span>
							{:else if desiredFee >= estimatedFeeRates.fastestFee && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-family-primary ml-2">(Fast ≈ Next block)</span>
							{:else if desiredFee >= estimatedFeeRates.halfHourFee && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-family-primary ml-2">(Medium ≈ 30 mins)</span>
							{:else if desiredFee >= estimatedFeeRates.hourFee && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-family-primary ml-2">(Slow ≈ 1 hour)</span>
							{:else if desiredFee < estimatedFeeRates.hourFee && desiredFee >= estimatedFeeRates.minimumFee && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-family-primary ml-2">(More than 1 hours)</span>
							{/if}
							{#if notEnoughFee || (estimatedFeeRates.minimumFee && desiredFee < estimatedFeeRates.minimumFee) || desiredFee < 1}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
									>Fee need to be equal or more than {estimatedFeeRates.minimumFee}
									{$bitcoinTestnetNetwork ? 't' : ''}sat{estimatedFeeRates.minimumFee > 1 ? 's' : ''} / vbyte to not be purge from the mempool</span
								>
							{/if}
						</h5>
						<div class="fee-selector">
							<div class="field mt-2 mb-5">
								<div class="control">
									<ButtonDropDown
										dropdownText={feeDropdownText}
										dropdownClass="is-primary is-fees-selector"
										on:dropdownSelected={handleFeeSelected}
										dropdownDisabled={craftingPSBT}
										fullWidth
										options={[
											{ name: 'Slow ≈ 1 hour', selected: true },
											{
												name: 'Medium ≈ 30 mins',
												selected: false,
											},
											{
												name: 'Fast ≈ Next block',
												selected: false,
											},
											{ name: 'Custom fee', selected: false },
										]}
									/>
								</div>
							</div>
							{#if showCustomFeeInput}
								<div class="field mt-2 mb-5">
									<div class="control">
										<input id="txCustomFee" class="input" type="number" min="1" max="2000" step="1" bind:value={desiredFee} />
										<span class="input-inner-text">
											{$bitcoinTestnetNetwork ? 't' : ''}sat{desiredFee > 1 ? 's' : ''} / vbyte
										</span>
									</div>
								</div>
							{/if}
						</div>
						<div class="buttons is-right">
							<Button
								text="Preview Transaction"
								icon={'arrowRight'}
								buttonClass="is-primary"
								buttonDisabled={notEnoughFunds ||
									notEnoughFee ||
									!validTransactionAddress ||
									!transactionAmount > 0 ||
									!currentAvailableAmount > 0 ||
									!transactionAmount ||
									!desiredFee >= 1 ||
									!desiredFee}
								loading={craftingPSBT}
								on:buttonClicked={handleInitCreateTransaction}
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showWithdrawSteps}
	<WithdrawSteps
		{createdPsbt}
		{finalFee}
		{finalTransactionAmount}
		{desiredFee}
		{txInputs}
		{transactionDestinationAddress}
		{useAllFunds}
		txInputsTotal={txInputs.reduce((prev, cur) => {
			return prev + cur.value;
		}, 0)}
		on:onCancelTransaction={handleTransactionCancel}
		on:onTransactionDone={handleTransactionCompleted}
	/>
{/if}

<style lang="scss">
	.card.action {
		.card-content {
			padding: 2rem;
		}

		.buttons {
			margin-top: 2rem;
			margin-bottom: 0.15rem;
		}

		.fee-info,
		.control,
		.input {
			width: 100%;
			max-width: 569px;
		}
	}

	// .icon.is-normal {
	// 	position: absolute;
	// }

	@media screen and (min-width: 1011px) {
		.card.action {
			.card-content {
				padding: 2.5rem;
			}

			.buttons {
				margin-top: 0.25rem;
				margin-bottom: 0;
			}

			.fee-info,
			.control,
			.input {
				max-width: 616px;
			}
		}
	}
</style>
