<script>
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { replace } from 'svelte-spa-router';
	import { isObjectEmpty, satoshisToBitcoins, timer } from '../../utils/helpers';
	import { configSelectedCurrentData } from '../../store';
	import Button from '../../components/ui/Button.svelte';
	import Overlay from '../../components/ui/Overlay.svelte';
	import TrezorNumberPad from '../../components/hardware/TrezorNumberPad.svelte';

	import ColdCardMicroSD from './ColdCardMicroSD.svelte';

	// Winthdraw Steps
	import MiniPreview from './MiniPreview.svelte'; // Step 1
	import PreviewTransaction from './PreviewTransaction.svelte'; // Step 1
	import RequiredSignatures from './RequiredSignatures.svelte'; // Step 2
	import SignWithDevice from './SignWithDevice.svelte'; // Step 3 & 4
	import ConfirmTransaction from './ConfirmTransaction.svelte'; // Step 5
	import Broadcasted from './Broadcasted.svelte'; // Step 6

	export let createdPsbt = null;
	export let finalFee = 1;
	export let finalTransactionAmount = 0; // in satoshi
	export let desiredFee = 0; // sats / vbyte
	export let txInputs = null;
	export let txInputsTotal = 0;
	export let transactionDestinationAddress = '';
	export let useAllFunds = false;

	$: currentBalanceWithdraw = $configSelectedCurrentData.currentBalance ? $configSelectedCurrentData.currentBalance : 0;

	$: currentConfigDevices = $configSelectedCurrentData ? [...$configSelectedCurrentData.config.extendedPublicKeys] : [];

	$: showCancelButton = signedDevices.length >= 1;

	const dispatch = createEventDispatcher();

	let cancelSigning = false;
	let cannotSignWithThisDevice = false;
	let combinedPsbt = null;
	let deviceAlreadySigned = false;
	let deviceNotInitialized = false;
	let deviceScanning = false;
	let extractedFromMicroSD = false;
	let finalizePsbt = null;
	let lockClosingPinOverlay = false;
	let microSDImportError = false;
	let psbtExported = false;
	let scannedDevices = [];
	let scannedWalletData = {};
	let selectedWalletData = {};
	let showBroadcastAlertMessage = false;
	let showCancelConfirmation = false;
	let showMicroSDModel = false;
	let showPinOverlay = false;
	let showRetrySignWithDevice = false;
	let signedDevices = [];
	let signedPsbt = [];
	let signingSucess = false;
	let trezorError = false;
	let trezorLockPinKey = false;
	let trezorPinMessage = '';
	let vaultCompletedKeys = 0;
	let waitBeforeSigning = false;
	let walletNeedPassphraseSent = false;
	let walletNeedPinSent = false;
	let withdrawStep = 1;
	let wrongDeviceDetected = false;

	// *** General ***
	const handleResetWalletData = () => {
		cancelSigning = false;
		deviceAlreadySigned = false;
		deviceNotInitialized = false;
		deviceScanning = false;
		extractedFromMicroSD = false;
		lockClosingPinOverlay = false;
		microSDImportError = false;
		psbtExported = false;
		scannedDevices = [];
		scannedWalletData = {};
		showCancelConfirmation = false;
		showMicroSDModel = false;
		showPinOverlay = false;
		showRetrySignWithDevice = false;
		signingSucess = false;
		trezorError = false;
		trezorLockPinKey = false;
		trezorPinMessage = '';
		walletNeedPinSent = false;
		wrongDeviceDetected = false;
	};

	const enumerate = async () => {
		try {
			const response = await window.api.ipcRenderer.invoke('hwi:enumerate');
			scannedDevices = response.filter(devices => {
				return devices;
			});
		} catch (error) {
			deviceScanning = false;
			console.log('error on enumerate: ', error);
		}
	};

	const handleViewTransactionDone = () => {
		dispatch('onTransactionDone');
		replace('/dashboard?view=transactions,withdraw=true');
	};

	const handleTransactionDone = () => {
		signedPsbt = [];
		signedDevices = [];
		withdrawStep = 0;
		dispatch('onTransactionDone');
	};

	const handleScanningStop = () => {
		deviceNotInitialized = false;
		deviceScanning = false;
	};

	const handleDeviceNotInitialized = () => {
		deviceNotInitialized = true;
	};

	const signWithDevice = async device => {
		try {
			showRetrySignWithDevice = false;
			const response = await window.api.ipcRenderer.invoke('hwi:sign-tx', {
				device: device,
				psbt: createdPsbt,
			});

			signingSucess = true;

			// if (!showRetrySignWithDevice) {
			if (response.psbt) {
				signedPsbt = [...signedPsbt, response.psbt];
				signedDevices = [...signedDevices, device];
				signingSucess = true;
			}
			// }
		} catch (error) {
			console.log('Error for PSBT signature:', error);
			showRetrySignWithDevice = true;
		}
	};

	const signWithMicroSD = async (device, signedPsbtFromMicroSD) => {
		try {
			showRetrySignWithDevice = false;
			signingSucess = true;
			walletNeedPinSent = false;
			extractedFromMicroSD = true;
			withdrawStep = 4;

			// if (!showRetrySignWithDevice) {
			if (signedPsbtFromMicroSD) {
				signedPsbt = [...signedPsbt, signedPsbtFromMicroSD];
				signedDevices = [...signedDevices, selectedWalletData];
				signingSucess = true;
			}
			// }
		} catch (error) {
			console.log('Error for PSBT signature:', error);
			showRetrySignWithDevice = true;
			extractedFromMicroSD = false;
		}
	};

	const handleSendTransaction = async () => {
		// TODO: error handling + no internet
		const response = await window.api.ipcRenderer.invoke('psbt:broadcast-transaction', {
			broadcastPsbt: finalizePsbt,
		});
		showBroadcastAlertMessage = false;
		withdrawStep = 6;
	};

	const handleRetrySigning = async () => {
		showRetrySignWithDevice = false;
		await timer(5021);
		waitBeforeSigning = false;
		initFirstScanning();
	};

	const handleConfirmSelectedSignee = () => {
		withdrawStep = 3;
		initFirstScanning();
	};

	const initScanning = async () => {
		deviceScanning = true;
		signingSucess = false;
		scannedWalletData = {};
		wrongDeviceDetected = false;
		for (let i = 0; i <= 30; i++) {
			if (!deviceScanning) break;
			await enumerate();
			// Device matching selected device brand
			if (scannedDevices.length >= 1) {
				for (let i = 0; i < scannedDevices.length; i++) {
					if (scannedDevices[i].type === selectedWalletData.type && scannedDevices[i].model === selectedWalletData.model) {
						handleScanningStop();
						scannedWalletData = { ...scannedDevices[i] };
						walletNeedPinSent = scannedWalletData.needs_pin_sent;
						wrongDeviceDetected = false;
					}
				}
				if (!isObjectEmpty(scannedWalletData)) {
					if (scannedWalletData.code == -18) {
						handleDeviceNotInitialized();
						break;
					} else {
						withdrawStep = 4;
						await timer(2000);
						handleSignTransaction();
						break;
					}
				}
			}
			// if (i > 10 && scannedDevices.length >= 1) {
			// 	handleScanningStop();
			// 	scannedWalletData = { ...scannedDevices[scannedDevices.length - 1] };
			// 	wrongDeviceDetected = true;
			// 	break;
			// }
			if (i === 30) handleScanningStop();
			await timer(1000);
		}
	};

	const initFirstScanning = () => {
		handleResetWalletData();
		initScanning();
	};

	const handledeviceSelected = ({ detail }) => {
		selectedWalletData = { ...detail.device };
	};

	// *** Preview Transaction ***
	const handleCancelTransaction = () => {
		showBroadcastAlertMessage = false;
		selectedWalletData = {};
		signedPsbt = [];
		signedDevices = [];
		// TODO: move to on destroy ?
		dispatch('onCancelTransaction');
	};

	const handleTransactionConfirmed = () => {
		if ($configSelectedCurrentData.config.extendedPublicKeys.length === 1) {
			selectedWalletData = { ...currentConfigDevices[0].device };
			withdrawStep = 3;

			initFirstScanning();
		} else if (signedDevices.length === $configSelectedCurrentData.config.quorum.requiredSigners) {
			withdrawStep = 6;
		} else {
			withdrawStep = 2;
		}
	};

	const handleWaitBeforeSigning = async () => {
		walletNeedPinSent = false;
		waitBeforeSigning = true;
		// TODO: bad hack
		await timer(5021);
		setTimeout(async () => {
			waitBeforeSigning = false;
			await signWithDevice(scannedWalletData);
		}, 0);
	};

	const handleBacktoTransactionDetails = () => {
		selectedWalletData = {};
		withdrawStep = 1;
	};

	const handleCancelSigningPsbt = () => {
		showRetrySignWithDevice = true;
		withdrawStep = 4;
	};

	const handleConfirmSignature = async () => {
		if (signingSucess) {
			if ($configSelectedCurrentData.config.quorum.requiredSigners === vaultCompletedKeys) {
				// combine and finalize
				try {
					combinedPsbt = await window.api.ipcRenderer.invoke('psbt:combine', {
						createdPsbt: createdPsbt,
						signedPsbts: signedPsbt,
					});
				} catch (error) {
					console.log(error);
				}

				try {
					finalizePsbt = await window.api.ipcRenderer.invoke('psbt:finalize', {
						finalPsbt: combinedPsbt,
					});

					withdrawStep = 5;
				} catch (error) {
					console.log(error);
				}
			} else {
				withdrawStep = 2;
			}
		}
	};

	// *** Trezor NumberPad ***
	const handleHidePinOverlay = () => {
		showRetrySignWithDevice = true;
		showPinOverlay = false;
		trezorError = false;
		trezorPinMessage = 'The PIN layout is displayed on your Trezor';
	};

	const handleTrezorExtraction = async device => {
		showPinOverlay = true;
		trezorError = false;
		try {
			await window.api.ipcRenderer.invoke('hwi:prompt-pin', {
				device: device,
			});
		} catch (error) {
			trezorPinMessage = 'Something went wrong. Please unplug and re-plug your Trezor & retry';
			trezorError = true;
		}
	};

	const handleSendPin = async pin => {
		lockClosingPinOverlay = true;
		trezorLockPinKey = true;
		trezorPinMessage = 'Unlocking device';
		try {
			const response = await window.api.ipcRenderer.invoke('hwi:send-pin', {
				device: scannedWalletData,
				pin: pin.detail.pin,
			});

			if (response.success) {
				showPinOverlay = false;
				trezorLockPinKey = false;
				walletNeedPinSent = false;
				await enumerate();
				if (scannedDevices.length >= 1) {
					for (let i = 0; i < scannedDevices.length; i++) {
						if (scannedDevices[i].type === selectedWalletData.type && scannedDevices[i].model === selectedWalletData.model) {
							scannedWalletData = { ...scannedDevices[i] };
							break;
						}
					}
				}

				handleWaitBeforeSigning();
			} else {
				trezorPinMessage = 'Incorrect PIN - Please retry';
				trezorLockPinKey = false;
				await handleTrezorExtraction(scannedWalletData);
			}
		} catch (error) {
			trezorPinMessage = 'Something went wrong. Please unplug and re-plug your Trezor & retry';
			trezorError = true;
		} finally {
			lockClosingPinOverlay = false;
		}
	};

	const handleRetryPromptPin = async () => {
		trezorPinMessage = 'The PIN layout is displayed on your Trezor';
		await handleTrezorExtraction(scannedWalletData);
	};

	// Reset the trezor if not unplugged correctly
	const handleReplugTrezorDevice = () => {
		withdrawStep = 3;
		initFirstScanning();
	};

	const handleSignTransaction = () => {
		if (walletNeedPinSent && scannedWalletData.type === 'trezor') {
			trezorPinMessage = 'The PIN layout is displayed on your Trezor';
			handleTrezorExtraction(scannedWalletData);
		} else {
			walletNeedPinSent = false;
			withdrawStep = 4;
			handleWaitBeforeSigning();
		}
	};

	const handleSigningSuccess = () => {
		vaultCompletedKeys = vaultCompletedKeys + 1;
		selectedWalletData = {};
		if (vaultCompletedKeys === $configSelectedCurrentData.config.quorum.requiredSigners) {
			withdrawStep = 6;
			handleConfirmSignature();
		} else {
			withdrawStep = 2;
		}
	};

	// MicroSD

	const handleExportFromMicroSD = async () => {
		try {
			await window.api.ipcRenderer.invoke('psbt:export-coldcard-unsigned-psbt-dialog', { psbt: createdPsbt });

			// TODO: verify PSBT data validity

			psbtExported = true;
		} catch (error) {
			console.log(error);
			if (!error.message.includes('Canceled')) {
				psbtExported = false;
				microSDImportError = true;
			}
		}
	};

	const handleImportPSBTFromMicroSD = async () => {
		try {
			const response = await window.api.ipcRenderer.invoke('psbt:import-coldcard-signed-psbt-dialog');

			// TODO: !Verify PSBT data validity

			withdrawStep = 3;
			showMicroSDModel = false;
			signWithMicroSD(currentConfigDevices[length - 1], response);
		} catch (error) {
			console.log(error);
			if (!error.message.includes('Canceled')) {
				microSDImportError = true;
			}
		}
	};

	const handleShowExtractFromMicroSD = async () => {
		handleResetWalletData();
		handleScanningStop();
		withdrawStep = 3;
		showMicroSDModel = true;
	};

	const handleCancelImportingFromMicroSD = () => {
		handleResetWalletData();
		handleScanningStop();
		withdrawStep = 3;
		showMicroSDModel = false;
	};

	console.log('transaction detail:', transactionDestinationAddress, finalTransactionAmount, desiredFee);

	onDestroy(() => {
		// That make sure the createdPsbt & signedPsbt are empty when the view is destroy
		createdPsbt;
		signedPsbt;
	});
</script>

<div class="container-fluid">
	<div class="columns">
		<div class="column is-12">
			<h3 class="title is-3 is-vertical-center top-action">
				Withdraw from {$configSelectedCurrentData.config.quorum.requiredSigners === 1
					? $configSelectedCurrentData.name + ' Wallet'
					: $configSelectedCurrentData.name + ' Multisig Vault (2 of 3)'}
			</h3>
		</div>
	</div>

	<div class="cards">
		{#if withdrawStep === 1}
			<div class="card-action">
				<PreviewTransaction
					{desiredFee}
					{finalFee}
					{finalTransactionAmount}
					{transactionDestinationAddress}
					{txInputs}
					{txInputsTotal}
					signedDevices={signedDevices.length}
					walletType={$configSelectedCurrentData.config.quorum.totalSigners > 1 ? 'multi' : 'single'}
				/>
			</div>
		{:else if withdrawStep === 2}
			<div class="card-action">
				<RequiredSignatures {currentConfigDevices} {signedDevices} on:deviceSelected={handledeviceSelected} />
			</div>
		{:else if (withdrawStep === 3 || withdrawStep === 4) && !showMicroSDModel}
			<div class="card-action">
				<SignWithDevice
					{deviceScanning}
					{extractedFromMicroSD}
					{scannedWalletData}
					{selectedWalletData}
					{showRetrySignWithDevice}
					{signingSucess}
					{vaultCompletedKeys}
					{walletNeedPinSent}
					{withdrawStep}
					on:cancelScanning={handleScanningStop}
					on:cancelSigning={handleCancelSigningPsbt}
					on:extractFromMicroSD={handleShowExtractFromMicroSD}
					on:hidePinOverlay={handleHidePinOverlay}
					on:launchRescanning={initFirstScanning}
					on:replugTrezorDevice={handleReplugTrezorDevice}
					on:retryPromptPin={handleRetryPromptPin}
					on:retrySigning={handleRetrySigning}
					walletType={$configSelectedCurrentData.config.quorum.totalSigners > 1 ? 'multi' : 'single'}
				/>
			</div>
		{:else if (withdrawStep === 3 || withdrawStep === 4) && showMicroSDModel}
			<div class="card-action">
				<ColdCardMicroSD {microSDImportError} on:uploadFromMicroSD={handleImportPSBTFromMicroSD} on:exportPSBTForColdcard={handleExportFromMicroSD} />
			</div>
		{:else if withdrawStep === 5}
			<ConfirmTransaction {signedDevices} />
		{:else if withdrawStep === 6}
			<!-- {desiredFee}
		{txInputs}
		{txInputsTotal} -->
			<Broadcasted
				{currentBalanceWithdraw}
				{finalFee}
				{finalTransactionAmount}
				{transactionDestinationAddress}
				{useAllFunds}
				walletType={$configSelectedCurrentData.config.quorum.totalSigners > 1 ? 'multi' : 'single'}
			/>
		{/if}
	</div>

	{#if withdrawStep >= 2 && withdrawStep <= 5}
		<MiniPreview
			{finalFee}
			{finalTransactionAmount}
			{transactionDestinationAddress}
			{txInputsTotal}
			walletType={$configSelectedCurrentData.config.quorum.totalSigners > 1 ? 'multi' : 'single'}
		/>
	{/if}

	<div class="container-action">
		<div class="buttons">
			{#if withdrawStep === 1}
				<Button
					text={showCancelButton ? 'Cancel transaction' : 'Edit transaction details'}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleCancelTransaction}
				/>
				<Button
					text={showCancelButton ? 'Continue transaction' : 'Sign transaction'}
					buttonClass="is-primary"
					icon="arrowRight"
					on:buttonClicked={handleTransactionConfirmed}
				/>
			{:else if withdrawStep === 2}
				<Button text="Back to transaction details" buttonClass="is-primary is-outlined" icon="arrowBack" on:buttonClicked={handleBacktoTransactionDetails} />
				<Button
					text={selectedWalletData.model
						? 'Sign transaction with ' + selectedWalletData.model.replaceAll('_', ' ') + ' (' + selectedWalletData.fingerprint + ')'
						: 'Sign transaction'}
					buttonClass="is-primary"
					icon="arrowRight"
					title={selectedWalletData.model ? '' : 'Selected a hardwallet to continue'}
					buttonDisabled={!selectedWalletData.fingerprint}
					on:buttonClicked={handleConfirmSelectedSignee}
				/>
			{:else if withdrawStep === 3 || withdrawStep === 4}
				<Button
					text={signingSucess ? 'Cancel this signature' : 'Back to transaction details'}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleBacktoTransactionDetails}
				/>
				<Button
					text={vaultCompletedKeys + 1 === $configSelectedCurrentData.config.quorum.requiredSigners
						? 'Review transaction before broadcasting'
						: 'Sign with second hardware wallet'}
					buttonClass="is-primary"
					title={signingSucess ? '' : 'Sign your transaction to continue'}
					icon="arrowRight"
					on:buttonClicked={handleSigningSuccess}
					buttonDisabled={!signingSucess}
				/>
			{:else if withdrawStep === 5}
				<Button text="Cancel transaction" buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelTransaction} />
				<Button
					text="Broadcast your fully signed transaction"
					buttonClass="is-primary"
					icon="arrowRight"
					on:buttonClicked={() => {
						showBroadcastAlertMessage = true;
					}}
				/>
			{:else if withdrawStep === 6}
				<Button text="Send another transaction" buttonClass="is-primary is-outlined" on:buttonClicked={handleTransactionDone} />
				<Button text="View your transaction" buttonClass="is-primary" on:buttonClicked={handleViewTransactionDone} />
			{/if}
		</div>
	</div>
</div>

{#if showCancelConfirmation}
	<Overlay title="Cancel this key?" titleIsLeft disableClosing>
		<p class="mt-3 mb-2">Your <span class="is-uppercase">{scannedWalletData.model.split('_').join(' ')}</span> signature was not confirmed just yet.</p>
		<p class="mb-6">Are you sure you want to go back?</p>
		<div class="buttons is-centered mt-6">
			<Button text="Back" buttonClass="is-primary is-outlined" on:buttonClicked={handleContinueConfirmation} />
			<Button text="Yes, cancel this key" buttonClass="is-primary" on:buttonClicked={handleCancelConfirmation} />
		</div>
	</Overlay>
{/if}

{#if deviceNotInitialized}
	<!-- capitalized wallet brand name -->
	<Overlay title="Error" subtitle={'Your ' + scannedWalletData.model.split('_').join(' ') + ' need to be initialized'} titleIsLeft disableClosing>
		<p class="mt-2">HWW documentation</p>
		<div class="buttons is-centered mt-6">
			<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelScanning} />
			<Button text="Retry scanning" buttonClass="is-primary" on:buttonClicked={handleReScanForDevice} />
		</div>
	</Overlay>
{/if}

{#if showPinOverlay}
	<Overlay
		title="Unlock your Trezor"
		subtitle={trezorPinMessage}
		titleIsLeft={lockClosingPinOverlay}
		disableClosing={lockClosingPinOverlay}
		on:closeOverlayClicked={handleHidePinOverlay}
	>
		<div class="trezor-overlay mt-5">
			<TrezorNumberPad {trezorError} {trezorLockPinKey} on:replugTrezorDevice={handleReplugTrezorDevice} on:sendPin={handleSendPin} />
		</div>
	</Overlay>
{/if}

{#if showBroadcastAlertMessage}
	<Overlay title="Broadcast via Blockstream" titleIsLeft disableClosing>
		<div class="broadcast-overlay mt-2">
			<p class="has-text-justified">
				To keep things simple, we are currently using Blockstream's full node to send your transaction to the Bitcoin network. You will be able to connect your
				own node shortly for better privacy.
			</p>
			<div class="buttons is-right mt-6">
				<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelTransaction} />
				<Button text="Broadcast transaction" buttonClass="is-primary" on:buttonClicked={handleSendTransaction} />
			</div>
		</div>
	</Overlay>
{/if}

{#if microSDImportError}
	<Overlay title="Error on extracting PSBT from Micro SD" titleIsLeft disableClosing>
		<p class="mt-2 mb-5">Make sure the proper PSBT file was selected</p>
		<div class="buttons is-centered mt-6">
			<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelImportingFromMicroSD} />
			<Button text="Retry importing signed" buttonClass="is-primary" on:buttonClicked={handleShowExtractFromMicroSD} />
		</div>
	</Overlay>
{/if}

<style lang="scss">
	.container-fluid {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: calc(100vh - 168px);
	}

	.container-action {
		width: 100%;
		max-width: 892px !important;
		margin-top: 2.75rem;
		margin-right: auto;
		margin-bottom: 2.5rem;
		margin-left: auto;

		.buttons {
			display: flex;
			justify-content: space-between;
			width: 100%;
		}
	}

	.top-action {
		padding-top: 1.75rem;
	}

	.cards {
		display: grid;
		align-items: center;
		min-height: 390px;
	}

	.card-action {
		grid-column: 1/2;
		grid-row: 1/2;
	}

	.broadcast-overlay {
		max-width: 775px;
	}

	.overlay-wallet-image {
		display: block;
		width: auto;
		height: 165px;
		margin: 2rem auto;
		object-fit: cover;
	}

	.trezor-overlay {
		min-width: 620px;
	}
</style>
