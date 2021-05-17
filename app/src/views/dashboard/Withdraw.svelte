<script>
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import coinSelect from 'coinselect';
	import coinSelectSplit from 'coinselect/split';

	import { bitcoinCurrentPrices, bitcoinTestnetNetwork, configSelectedCurrentData, selectedCurrency, applicationSettings } from '../../store';
	import { bitcoinsToSatoshis, formatNumberByThousands, satoshisToBitcoins, toFixedNoRounding } from '../../utils/helpers';

	import Button from '../../components/ui/Button.svelte';
	import ButtonDropDown from '../../components/ui/ButtonDropDown.svelte';
	import Loading from '../../components/ui/Loading.svelte';
	import SelectionDropDown from '../../components/ui/SelectionDropDown.svelte';
	import CurrentConfigDetails from '../../components/config/CurrentConfigDetails.svelte';
	import WithdrawSteps from '../../components/withdraw/WithdrawSteps.svelte';

	export let currentAvailableAmount = undefined;
	export let currentPendingAmount = 0;
	export let configDropdownArray = [];
	export let configurationDropDownSelectedChoice = 0;

	const helpIcon = './img/icons/ui/help.svg';

	$: availableFiatAmount = currentAvailableAmount ? satoshisToBitcoins(currentAvailableAmount).toNumber() * $bitcoinCurrentPrices[$selectedCurrency] : 0;

	$: amountUnitsChoice = useAllFunds
		? [
				{ name: 'bitcoin', selected: !$applicationSettings.satoshiUnit },
				{ name: 'satoshi', selected: $applicationSettings.satoshiUnit },
		  ]
		: [
				{ name: 'bitcoin', selected: !$applicationSettings.satoshiUnit },
				{ name: 'satoshi', selected: $applicationSettings.satoshiUnit },
				{ name: $selectedCurrency, selected: false },
		  ];

	const dispatch = createEventDispatcher();

	let amountConverted = 0;
	let craftingPSBT = false;
	let createdPsbt = null;
	let desiredFee = 1;
	let feeInterval;
	let estimatedFeeRates = { minimumFee: 1 };
	let estimatingFee = false;
	let feeDropdownText = `${$_('withdraw.main.fee_dropdown.estimating', { default: 'Estimating' })}... sats / vbyte`;
	let feedDropdownOptions = [
		{ name: $_('withdraw.main.fee_dropdown.slow', { default: 'Slow ~ 1 hour' }), selected: true },
		{
			name: $_('withdraw.main.fee_dropdown.medium', { default: 'Medium ~ 30 mins' }),
			selected: false,
		},
		{
			name: $_('withdraw.main.fee_dropdown.fast', { default: 'Fast ~ Next block' }),
			selected: false,
		},
		{ name: $_('withdraw.main.fee_dropdown.custom', { default: 'Custom fee' }), selected: false },
	];
	let finalFee = 1;
	let finalTransactionAmount = 0;
	let invalidAddressErrorMessage = '';
	let notEnoughFee = false;
	let notEnoughFunds = false;
	let enableRBF = true;
	let selectedDropdownFee = 0;
	let showCustomFeeInput = false;
	let showWithdrawSteps = false;
	let transactionAmount;
	let transactionDestinationAddress = '';
	let txInputs = [];
	let txOutputs = [];
	let unitDropdownText = $applicationSettings.satoshiUnit ? 'satoshi' : 'bitcoin';
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

				if (
					$applicationSettings.interfaceLanguage === 'fr' &&
					invalidAddressErrorMessage.includes("Address must start with one of 'tb1', or '2' followed by letters or digits")
				) {
					invalidAddressErrorMessage = "L'adresse doit commencer par «tb1» ou «2» suivi de lettres ou de chiffres";
				} else if ($applicationSettings.interfaceLanguage === 'fr' && invalidAddressErrorMessage.includes('Address is invalid')) {
					invalidAddressErrorMessage = "L'adresse n'est pas valide";
				}
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
					bitcoinsToSatoshis(transactionAmount / $bitcoinCurrentPrices[$selectedCurrency]).toNumber() + desiredFee > $configSelectedCurrentData.currentBalance) ||
					(unitDropdownText === 'bitcoin' && bitcoinsToSatoshis(transactionAmount).toNumber() + desiredFee > $configSelectedCurrentData.currentBalance) ||
					(unitDropdownText === 'satoshi' && transactionAmount + desiredFee > $configSelectedCurrentData.currentBalance))
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
		transactionAmount = useAllFunds ? $configSelectedCurrentData.currentBalance : undefined;
		notEnoughFunds = false;
		amountConverted = 0;
		unitDropdownText = $applicationSettings.satoshiUnit ? 'satoshi' : 'bitcoin';
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

	const handleSwitchRBF = () => {
		enableRBF = !enableRBF;
	};

	const handleFeeSelected = async ({ detail }) => {
		selectedDropdownFee = detail;

		if (estimatedFeeRates) {
			const names = [
				$_('withdraw.main.fee_dropdown.slow', { default: 'Slow ~ 1 hour' }),
				$_('withdraw.main.fee_dropdown.medium', { default: 'Medium ~ 30 mins' }),
				$_('withdraw.main.fee_dropdown.fast', { default: 'Fast ~ Next block' }),
				$_('withdraw.main.fee_dropdown.custom', { default: 'Custom fee' }),
			];

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
			feeDropdownText = $_('withdraw.main.fee_dropdown.custom', { default: 'Custom fee' });
		}

		feedDropdownOptions = [
			{ name: $_('withdraw.main.fee_dropdown.slow', { default: 'Slow ~ 1 hour' }), selected: detail === 0 },
			{
				name: $_('withdraw.main.fee_dropdown.medium', { default: 'Medium ~ 30 mins' }),
				selected: detail === 1,
			},
			{
				name: $_('withdraw.main.fee_dropdown.fast', { default: 'Fast ~ Next block' }),
				selected: detail === 2,
			},
			{ name: $_('withdraw.main.fee_dropdown.custom', { default: 'Custom fee' }), selected: detail === 3 },
		];

		handleTransactionAmountChanged();
	};

	// *** PSBT crafting ***

	const handleInitCreateTransaction = async () => {
		craftingPSBT = true;
		handleTransactionDestinationAddress();
		handleTransactionAmountChanged();

		notEnoughFee = desiredFee < estimatedFeeRates.minimumFee;

		if (
			!notEnoughFunds &&
			!notEnoughFee &&
			validTransactionAddress &&
			transactionDestinationAddress &&
			(transactionAmount > 0 || transactionAmount === undefined)
		) {
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
			finalTransactionAmount = $configSelectedCurrentData.currentBalance - finalFee;
		}

		if (finalTransactionAmount + finalFee <= $configSelectedCurrentData.currentBalance) {
			if (txInputs && txOutputs) {
				createdPsbt = await window.api.ipcRenderer.invoke('psbt:create-psbt', {
					txInputs: txInputs,
					txOutputs: txOutputs,
					unusedChangeAddresses: $configSelectedCurrentData.unusedChangeAddresses,
					config: $configSelectedCurrentData.config,
					isRBF: enableRBF,
				});

				dispatch('withdrawStepsStarted');
				showWithdrawSteps = true;
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
		estimatedFeeRates = { minimumFee: 1 };
		showCustomFeeInput = false;
		transactionAmount = undefined;
		finalTransactionAmount = 0;
		transactionDestinationAddress = '';
		createdPsbt = null;
		useAllFunds = false;
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
		feeInterval = setInterval(() => {
			if (!craftingPSBT && !showWithdrawSteps && !estimatingFee) {
				handleEstimateFees();
			}
		}, 69421);
	};

	const handleCurrentConfigChangeFromDropdown = ({ detail }) => {
		dispatch('dropdownSelected', detail);
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
		clearInterval(feeInterval);
	});
</script>

{#if !showWithdrawSteps}
	<CurrentConfigDetails
		{currentPendingAmount}
		{configDropdownArray}
		{configurationDropDownSelectedChoice}
		on:dropdownSelected={handleCurrentConfigChangeFromDropdown}
	/>

	<div class="columns">
		<div class="column">
			<h3 class="title is-4">
				{$_('withdraw.main.title', { default: 'Transaction details' })}
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
							<Loading text={$_('withdraw.main.loading', { default: 'Loading data' })} />
						</div>
					{:else}
						<div class="tags">
							<div class="icon-centered">
								<span
									class="icon is-small mr-3 is-prussian-blue is-not has-no-hover"
									data-tooltip={`${$_('withdraw.main.fee_error.purge_rbf_tooltips', {
										default:
											'Replace-by-fee (RBF) is a method that allows to replace an unconfirmed transaction with a the same transaction but with higher transaction fee',
									})}.`}><img src={helpIcon} alt="help" /></span
								>
							</div>
							<span class="tag has-text-weight-normal is-clickable" on:click={handleSwitchRBF} title={$_('withdraw.main.rbf_title', { default: 'Replace by fee' })}
								>RBF = <span class="ml-1 has-text-weight-semibold is-uppercase" class:has-text-success={enableRBF} class:has-text-danger={!enableRBF}
									>{enableRBF ? $_('withdraw.main.rbf_on', { default: 'ON' }) : $_('withdraw.main.rbf_off', { default: 'OFF' })}</span
								></span
							>
						</div>
						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">
							{$_('withdraw.main.destination_address', { default: 'Destination address' })}
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
							{$_('withdraw.main.amount', { default: 'Amount of' })}
							<SelectionDropDown
								dropdownText={unitDropdownText}
								title={useAllFunds ? '' : $_('withdraw.main.amount_title', { default: 'Click to change the transaction unit' })}
								options={amountUnitsChoice}
								dropdownDisabled={craftingPSBT || useAllFunds}
								on:dropdownSelected={handleUnitSelected}
							/>

							{#if !useAllFunds}
								<span
									class="is-size-7"
									title={`${$_('withdraw.main.current_value_title_1', { default: 'Current' })} ${$selectedCurrency} ${$_('withdraw.main.current_value_title_2', {
										default: 'value',
									})}`}
								>
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

							{#if notEnoughFunds}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
									>{$_('withdraw.main.not_enough_funds', { default: 'Not enough funds, please reduce desired fee or the desired amount' })}</span
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
										value={`${$_('withdraw.main.withdraw_all_funds', { default: 'Withdraw all funds from this' })} ${
											$configSelectedCurrentData.config.quorum.totalSigners > 1
												? $_('withdraw.main.vault', { default: 'vault' })
												: $_('withdraw.main.wallet', { default: 'wallet' })
										}`}
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
										placeholder={currentAvailableAmount == undefined
											? $_('withdraw.main.scanning_for_confirmed_funds', { default: 'Scanning for confirmed funds' })
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
											  (currentAvailableAmount === $configSelectedCurrentData.currentBalance || currentAvailableAmount == undefined ? '' : ' confirmed')
											: $_('withdraw.main.no_fund_available', { default: 'No fund available' })}
										bind:value={transactionAmount}
										on:input={handleTransactionAmountChanged}
										disabled={craftingPSBT}
									/>
								{/if}
								{#if $configSelectedCurrentData.currentBalance > 0}
									<span
										class="is-link input-inner-text"
										class:is-primary={useAllFunds}
										title={useAllFunds
											? $_('withdraw.main.edit_title', { default: 'Edit amount' })
											: $_('withdraw.main.max_title', { default: 'Use all confirmed funds' })}
										on:click={handleMaximumAmount}
									>
										{useAllFunds ? $_('withdraw.main.edit', { default: 'EDIT' }) : $_('withdraw.main.max', { default: 'MAX' })}
									</span>
								{/if}
							</div>
						</div>
						<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">
							{$_('withdraw.main.network_fee', { default: 'Network fee' })}
							{#if desiredFee > 421 && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
									>({$_('withdraw.main.fee_error.insane', { default: 'Insane amount, are your sure?' })})</span
								>
							{:else if desiredFee > estimatedFeeRates.fastestFee + 21 && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
									>({$_('withdraw.main.fee_error.overpaying', { default: 'Overpaying' })})</span
								>
							{:else if desiredFee >= estimatedFeeRates.fastestFee && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-family-primary ml-2"
									>({$_('withdraw.main.fee_dropdown.fast', { default: 'Fast ~ Next block' })})</span
								>
							{:else if desiredFee >= estimatedFeeRates.halfHourFee && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-family-primary ml-2"
									>({$_('withdraw.main.fee_dropdown.medium', { default: 'Medium ~ 30 mins' })})</span
								>
							{:else if desiredFee >= estimatedFeeRates.hourFee && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-family-primary ml-2"
									>({$_('withdraw.main.fee_dropdown.slow', { default: 'Slow ~ 1 hour' })})</span
								>
							{:else if desiredFee < estimatedFeeRates.hourFee && desiredFee >= estimatedFeeRates.minimumFee && showCustomFeeInput}
								<span class="subtitle is-6 has-text-weight-normal is-family-primary ml-2"
									>({$_('withdraw.main.fee_error.more_than', { default: 'More than' })} 1 {$_('withdraw.main.fee_error.hours', { default: 'hours' })})</span
								>
							{/if}
							{#if notEnoughFee || (estimatedFeeRates.minimumFee && desiredFee < estimatedFeeRates.minimumFee) || desiredFee < 1}
								<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
									>{$_('withdraw.main.fee_error.purge_1', { default: 'Fee needs to be at least' })}
									{estimatedFeeRates.minimumFee}
									{$bitcoinTestnetNetwork ? 't' : ''}sat{estimatedFeeRates.minimumFee > 1 ? 's' : ''} / vbyte {$_('withdraw.main.fee_error.purge_2', {
										default: 'to not be purge from the mempool',
									})}.</span
								>
								{#if !enableRBF}
									<div class="subtitle is-6 has-text-weight-normal is-danger is-family-primary custom-width">
										{$_('withdraw.main.fee_error.purge_rbf', { default: 'Activate Replace-by-fee (RBF) so you can bump your transaction later on' })}.
									</div>
								{/if}
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
										options={feedDropdownOptions}
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
								text={$_('withdraw.main.preview_transaction', { default: 'Preview Transaction' })}
								icon="arrowRight"
								buttonClass="is-primary"
								buttonDisabled={notEnoughFunds ||
									!transactionDestinationAddress ||
									!validTransactionAddress ||
									!transactionAmount > 0 ||
									!$configSelectedCurrentData.currentBalance > 0 ||
									!transactionAmount ||
									!desiredFee >= 1 ||
									!desiredFee}
								loading={craftingPSBT}
								title={!transactionAmount || !desiredFee >= 1 || !desiredFee || !transactionDestinationAddress || !validTransactionAddress
									? $_('withdraw.main.preview_transaction_title', { default: 'Complete the transaction to continue' })
									: ''}
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
		txInputsTotal={txInputs.reduce((previous, current) => {
			return previous + current.value;
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

	.tags {
		position: absolute;
		top: 2rem;
		right: 2rem;

		.tag {
			width: 84px;
		}
	}

	.custom-width {
		width: 555px;
	}

	.icon-centered {
		margin-bottom: 0.242rem;
	}

	[data-tooltip]::before {
		width: 300px;
	}

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
