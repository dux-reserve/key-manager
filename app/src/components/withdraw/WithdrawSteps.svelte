<script>
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { replace } from 'svelte-spa-router';
	import { _ } from 'svelte-i18n';
	import { isObjectEmpty, timer } from '../../utils/helpers';
	import { configSelectedCurrentData, applicationSettings } from '../../store';
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
	export let desiredFee = 0; // sats / vbyte
	export let finalFee = 1;
	export let finalTransactionAmount = 0; // in satoshi
	export let transactionDestinationAddress = '';
	export let txInputs = null;
	export let txInputsTotal = 0;
	export let useAllFunds = false;

	$: currentBalanceWithdraw = $configSelectedCurrentData.currentBalance ? $configSelectedCurrentData.currentBalance : 0;

	$: currentConfigDevices = $configSelectedCurrentData ? [...$configSelectedCurrentData.config.extendedPublicKeys] : [];

	$: showCancelButton = signedDevices.length >= 1;

	const dispatch = createEventDispatcher();

	let combinedPsbt = null;
	let deviceAlreadySigned = false;
	let deviceNotInitialized = false;
	let deviceScanning = false;
	let extractedFromMicroSD = false;
	let finalizePsbt = null;
	let lockClosingPinOverlay = false;
	let microSDImportError = false;
	let psbtExported = false;
	let psbtNotFromQuorum = false;
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
	let signingInProgress = false;
	let signingReady = false;
	let signingSucess = false;
	let trezorError = false;
	let trezorLockPinKey = false;
	let trezorPinMessage = '';
	let vaultCompletedKeys = 0;
	let waitBeforeSigning = false;
	let walletNeedPassphraseSent = false;
	let walletNeedPinSent = false;
	let walletType = $configSelectedCurrentData.config.quorum.totalSigners > 1 ? 'multi' : 'single';
	let withdrawStep = 1;

	// *** General ***
	const handleResetWalletData = () => {
		deviceAlreadySigned = false;
		deviceNotInitialized = false;
		deviceScanning = false;
		extractedFromMicroSD = false;
		lockClosingPinOverlay = false;
		microSDImportError = false;
		psbtExported = false;
		psbtNotFromQuorum = false;
		scannedDevices = [];
		scannedWalletData = {};
		showCancelConfirmation = false;
		showMicroSDModel = false;
		showPinOverlay = false;
		showRetrySignWithDevice = false;
		signingInProgress = false;
		signingReady = false;
		signingSucess = false;
		trezorError = false;
		trezorLockPinKey = false;
		trezorPinMessage = '';
		walletNeedPinSent = false;
	};

	const enumerate = async () => {
		try {
			const response = await window.api.ipcRenderer.invoke('hwi:enumerate');
			if (response.some(hardware => hardware.type === 'trezor' && hardware.code == -13) && !signingInProgress) {
				deviceScanning = false;
				trezorPinMessage = $_('creation.main.trezor_something_went_wrong', { default: 'Something went wrong. Please unplug and re-plug your Trezor & retry' });
				showPinOverlay = true;
				trezorError = true;
			} else {
				scannedDevices = response;
			}
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
		deviceScanning = false;
	};

	const handleDeviceNotInitialized = () => {
		deviceScanning = false;
		deviceNotInitialized = true;
	};

	const signWithDevice = async device => {
		try {
			showRetrySignWithDevice = false;
			const response = await window.api.ipcRenderer.invoke('hwi:sign-tx', {
				device: device,
				psbt: createdPsbt,
			});

			if (response.psbt) {
				signedPsbt = [...signedPsbt, response.psbt];
				signedDevices = [...signedDevices, device];
				signingSucess = true;
			}
		} catch (error) {
			signingReady = false;
			signingInProgress = false;
			console.log('Error for PSBT signature:', error);
			showRetrySignWithDevice = true;
		}
	};

	const signWithMicroSD = async signedPsbtFromMicroSD => {
		try {
			showRetrySignWithDevice = false;
			walletNeedPinSent = false;
			extractedFromMicroSD = true;
			withdrawStep = 4;

			await timer(1210);

			if (signedPsbtFromMicroSD) {
				signedPsbt = [...signedPsbt, signedPsbtFromMicroSD];
				signedDevices = [...signedDevices, selectedWalletData];
				signingSucess = true;
			}
		} catch (error) {
			console.log('Error for PSBT signature:', error);
			showRetrySignWithDevice = true;
			extractedFromMicroSD = false;
		}
	};

	const verifyIfDeviceIsalreadySigned = () => {
		if (
			scannedWalletData.fingerprint &&
			signedDevices.filter(device => device.fingerprint && device.fingerprint.toLowerCase() === scannedWalletData.fingerprint.toLowerCase()).length > 0
		) {
			deviceAlreadySigned = true;
			retryXpubExtration = true;
			return true;
		} else {
			deviceAlreadySigned = false;
			return false;
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
		for (let i = 0; i <= 120; i++) {
			if (!deviceScanning) break;
			await enumerate();
			// Device matching selected device brand
			if (scannedDevices.length >= 1) {
				for (let i = 0; i < scannedDevices.length; i++) {
					if (scannedDevices[i].type === selectedWalletData.type && scannedDevices[i].model === selectedWalletData.model) {
						scannedWalletData = { ...scannedDevices[i] };
						walletNeedPinSent = scannedWalletData.needs_pin_sent;
						handleScanningStop();
						verifyIfDeviceIsalreadySigned();
					}
				}
				if (!isObjectEmpty(scannedWalletData)) {
					if (scannedWalletData.code == -18) {
						handleDeviceNotInitialized();
						break;
					} else {
						withdrawStep = 4;
						signingReady = true;
						break;
					}
				}
			}
			if (i === 120) handleScanningStop();
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
		signingInProgress = true;
		await timer(4210);
		setTimeout(async () => {
			waitBeforeSigning = false;
			await signWithDevice(scannedWalletData);
		}, 0);
	};

	const handleBacktoTransactionDetails = () => {
		selectedWalletData = {};
		withdrawStep = 1;
	};

	const handleCancelSignature = () => {
		if (signingSucess && signedDevices.length >= 1 && signedPsbt.length >= 1) {
			showCancelConfirmation = true;
		} else {
			selectedWalletData = {};
			withdrawStep = 1;
		}
	};

	const handleContinueConfirmation = () => {
		showCancelConfirmation = false;
	};

	const handleCancelConfirmation = () => {
		if (signingSucess && signedDevices.length >= 1 && signedPsbt.length >= 1) {
			signedDevices.pop();
			signedPsbt.pop();
		}
		showCancelConfirmation = false;
		withdrawStep = 2;
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
		trezorPinMessage = $_('withdraw.steps.trezor_pin_layout', { default: 'The PIN layout is displayed on your Trezor' });
	};

	const handleTrezorPromptPin = async device => {
		showPinOverlay = true;
		trezorError = false;
		try {
			await window.api.ipcRenderer.invoke('hwi:prompt-pin', {
				device: device,
			});
		} catch (error) {
			setTimeout(() => {
				trezorPinMessage = $_('withdraw.steps.trezor_something_went_wrong', { default: 'Something went wrong. Please unplug and re-plug your Trezor & retry' });
				trezorError = true;
			}, 2000);
		}
	};

	const handleSendPin = async pin => {
		trezorError = false;
		lockClosingPinOverlay = true;
		trezorLockPinKey = true;
		trezorPinMessage = $_('withdraw.steps.trezor_unlocking_device', { default: 'Unlocking device' });
		try {
			const response = await window.api.ipcRenderer.invoke('hwi:send-pin', {
				device: scannedWalletData,
				pin: pin.detail.pin,
			});

			if (response.success) {
				showPinOverlay = false;
				trezorLockPinKey = false;
				walletNeedPinSent = false;
				signingInProgress = true;
				await enumerate();
				trezorError = false;
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
				trezorPinMessage = $_('withdraw.steps.trezor_pin_incorrect', { default: 'Incorrect PIN - Please retry' });
				trezorLockPinKey = false;
				await handleTrezorPromptPin(scannedWalletData);
			}
		} catch (error) {
			setTimeout(() => {
				trezorPinMessage = $_('withdraw.steps.trezor_something_went_wrong', { default: 'Something went wrong. Please unplug and re-plug your Trezor & retry' });
				trezorError = true;
			}, 2000);
		} finally {
			lockClosingPinOverlay = false;
		}
	};

	const handleRetryPromptPin = async () => {
		trezorPinMessage = $_('withdraw.steps.trezor_pin_layout', { default: 'The PIN layout is displayed on your Trezor' });
		await handleTrezorPromptPin(scannedWalletData);
	};

	// Reset the trezor if not unplugged correctly
	const handleReplugTrezorDevice = () => {
		withdrawStep = 3;
		initFirstScanning();
	};

	const handleSignTransaction = () => {
		if (walletNeedPinSent && scannedWalletData.type === 'trezor') {
			trezorPinMessage = $_('withdraw.steps.trezor_pin_layout', { default: 'The PIN layout is displayed on your Trezor' });
			handleTrezorPromptPin(scannedWalletData);
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
			await window.api.ipcRenderer.invoke('psbt:export-coldcard-unsigned-psbt-dialog', {
				psbt: createdPsbt,
				accountName: $configSelectedCurrentData.name,
				isVault: $configSelectedCurrentData.config.quorum.totalSigners > 1,
				isFrench: $applicationSettings.interfaceLanguage === 'fr',
			});

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

			// TODO: !Verify PSBT data validity and if it's from the right transaction/quorum
			if ((signedPsbt.length >= 1 && !signedPsbt.includes(response)) || createdPsbt !== response) {
				withdrawStep = 3;
				showMicroSDModel = false;
				signWithMicroSD(response);
			} else {
				microSDImportError = true;
			}
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
		microSDImportError = false;
		showMicroSDModel = true;
		withdrawStep = 3;
	};

	const handleCancelImportingFromMicroSD = () => {
		handleResetWalletData();
		handleScanningStop();
		microSDImportError = false;
		showMicroSDModel = false;
		withdrawStep = 3;
	};

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
				{$_('withdraw.steps.headline', { default: 'Withdraw from' })}
				{#if $applicationSettings.interfaceLanguage === 'en'}
					{$configSelectedCurrentData.config.quorum.requiredSigners === 1
						? `${$configSelectedCurrentData.name} ${$_('withdraw.steps.headline_wallet', { default: 'wallet' })}`
						: `${$configSelectedCurrentData.name} ${$_('withdraw.steps.headline_vault', { default: 'vault' })}`}
				{:else if $applicationSettings.interfaceLanguage === 'fr'}
					{$configSelectedCurrentData.config.quorum.requiredSigners === 1
						? `${$_('withdraw.steps.headline_wallet', { default: 'wallet' })} ${$configSelectedCurrentData.name} `
						: `${$_('withdraw.steps.headline_vault', { default: 'vault' })} ${$configSelectedCurrentData.name}`}
				{/if}
				{#if $configSelectedCurrentData.config.quorum.requiredSigners > 1}
					(2 {$_('withdraw.steps.headline_of', { default: 'of' })} 3)
				{/if}
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
					{walletType}
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
					{walletType}
					{signingReady}
					{signingInProgress}
					{withdrawStep}
					on:cancelScanning={handleScanningStop}
					on:cancelSigning={handleCancelSigningPsbt}
					on:extractFromMicroSD={handleShowExtractFromMicroSD}
					on:hidePinOverlay={handleHidePinOverlay}
					on:launchRescanning={initFirstScanning}
					on:replugTrezorDevice={handleReplugTrezorDevice}
					on:retryPromptPin={handleRetryPromptPin}
					on:retrySigning={handleRetrySigning}
					on:startSigning={handleSignTransaction}
				/>
			</div>
		{:else if (withdrawStep === 3 || withdrawStep === 4) && showMicroSDModel}
			<div class="card-action">
				<ColdCardMicroSD on:uploadFromMicroSD={handleImportPSBTFromMicroSD} on:exportPSBTForColdcard={handleExportFromMicroSD} />
			</div>
		{:else if withdrawStep === 5}
			<ConfirmTransaction {signedDevices} />
		{:else if withdrawStep === 6}
			<Broadcasted {currentBalanceWithdraw} {finalFee} {finalTransactionAmount} {transactionDestinationAddress} {walletType} />
		{/if}
	</div>

	{#if withdrawStep >= 2 && withdrawStep <= 5}
		<MiniPreview {finalFee} {finalTransactionAmount} {transactionDestinationAddress} {txInputsTotal} {walletType} />
	{/if}

	<div class="container-action">
		<div class="buttons">
			{#if withdrawStep === 1}
				<Button
					text={showCancelButton
						? $_('withdraw.steps.button_cancel_transaction', { default: 'Cancel transaction' })
						: $_('withdraw.steps.button_edit_transaction_details', { default: 'Edit transaction details' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleCancelTransaction}
				/>
				<Button
					text={showCancelButton
						? $_('withdraw.steps.button_continue_transaction', { default: 'Continue transaction' })
						: $_('withdraw.steps.button_sign_transaction', { default: 'Sign transaction' })}
					buttonClass="is-primary"
					icon="arrowRight"
					on:buttonClicked={handleTransactionConfirmed}
				/>
			{:else if withdrawStep === 2}
				<Button
					text={$_('withdraw.steps.button_back_transaction_details', { default: 'Back to transaction details' })}
					buttonClass="is-primary is-outlined"
					icon="arrowBack"
					on:buttonClicked={handleBacktoTransactionDetails}
				/>
				<Button
					text={selectedWalletData.model
						? `${$_('withdraw.steps.button_sign_transaction_with', { default: 'Sign transaction with' })} ${selectedWalletData.model.replaceAll('_', ' ')} (${
								selectedWalletData.fingerprint
						  })`
						: $_('withdraw.steps.button_sign_transaction', { default: 'Sign transaction' })}
					buttonClass="is-primary"
					icon="arrowRight"
					title={selectedWalletData.model ? '' : $_('withdraw.steps.button_sign_transaction_with_title', { default: 'Select a hardware device to continue' })}
					buttonDisabled={!selectedWalletData.fingerprint}
					on:buttonClicked={handleConfirmSelectedSignee}
				/>
			{:else if withdrawStep === 3 || withdrawStep === 4}
				<Button
					text={signingSucess
						? $_('withdraw.steps.button_cancel_signature', { default: 'Cancel signature' })
						: $_('withdraw.steps.button_back_transaction_details', { default: 'Back to transaction details' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={signingSucess ? handleCancelSignature : handleBacktoTransactionDetails}
				/>
				<Button
					text={vaultCompletedKeys + 1 === $configSelectedCurrentData.config.quorum.requiredSigners
						? $_('withdraw.steps.button_review_transaction_broadcast', { default: 'Review transaction before broadcast' })
						: `${$_('withdraw.steps.button_sign_with', { default: 'Sign with' })} second ${$_('withdraw.steps.button_sign_with_hardware', {
								default: 'hardware device',
						  })}`}
					buttonClass="is-primary"
					title={signingSucess ? '' : $_('withdraw.steps.button_sign_to_continue', { default: 'Sign your transaction to continue' })}
					icon="arrowRight"
					on:buttonClicked={handleSigningSuccess}
					buttonDisabled={!signingSucess}
				/>
			{:else if withdrawStep === 5}
				<Button
					text={$_('withdraw.steps.button_cancel_transaction', { default: 'Cancel transaction' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleCancelTransaction}
				/>
				<Button
					text={$_('withdraw.steps.button_broadcast_signed_transaction', { default: 'Broadcast your fully signed transaction' })}
					buttonClass="is-primary"
					icon="arrowRight"
					on:buttonClicked={() => {
						showBroadcastAlertMessage = true;
					}}
				/>
			{:else if withdrawStep === 6}
				<Button
					text={$_('withdraw.steps.button_send_another_transaction', { default: 'Send another transaction' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleTransactionDone}
				/>
				<Button
					text={$_('withdraw.steps.button_view_transaction', { default: 'View your transaction' })}
					buttonClass="is-primary"
					on:buttonClicked={handleViewTransactionDone}
				/>
			{/if}
		</div>
	</div>
</div>

{#if showCancelConfirmation}
	<Overlay title={$_('withdraw.overlay.show_cancel_confirmation.title', { default: 'Remove this signature?' })} titleIsLeft disableClosing>
		<p class="mt-3 mb-2">
			{#if $applicationSettings.interfaceLanguage === 'en'}
				{$_('withdraw.overlay.show_cancel_confirmation.paragraph_1', { default: 'Your' })}
				<span class="is-capitalized">{scannedWalletData.model.split('_').join(' ')}</span>
				{$_('withdraw.overlay.show_cancel_confirmation.paragraph_2_1', { default: 'signature' })}
				{$_('withdraw.overlay.show_cancel_confirmation.paragraph_2_2', { default: 'was not confirmed just yet' })}
			{:else if $applicationSettings.interfaceLanguage === 'fr'}
				{$_('withdraw.overlay.show_cancel_confirmation.paragraph_1', { default: 'Your' })}
				{$_('withdraw.overlay.show_cancel_confirmation.paragraph_2_1', { default: 'signature' })}
				<span class="is-capitalized">{scannedWalletData.model.split('_').join(' ')}</span>
				{$_('withdraw.overlay.show_cancel_confirmation.paragraph_2_2', { default: 'was not confirmed just yet' })}
			{/if}.
		</p>
		<p class="mb-6">{$_('withdraw.overlay.show_cancel_confirmation.paragraph_3', { default: 'Are you sure you want to go back?' })}</p>
		<div class="buttons is-centered mt-6">
			<Button
				text={$_('withdraw.overlay.show_cancel_confirmation.button_back', { default: 'Back' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleContinueConfirmation}
			/>
			<Button
				text={$_('withdraw.overlay.show_cancel_confirmation.button_yes', { default: 'Yes, cancel signature' })}
				buttonClass="is-primary"
				on:buttonClicked={handleCancelConfirmation}
			/>
		</div>
	</Overlay>
{/if}

{#if deviceNotInitialized}
	<Overlay
		title={$_('creation.overlay.device_not_initialized.title', { default: 'Hardware device not active yet' })}
		subtitle={`${$_('creation.overlay.device_not_initialized.subtitle', { default: 'You need to initialize your' })} ${scannedWalletData.model
			.split('_')
			.join(' ')}`}
		titleIsLeft
		disableClosing
	>
		<p class="mt-2">
			{$_('creation.overlay.device_not_initialized.paragraph_1', { default: 'We recommend that you read the official documentation from' })}
			<span class="is-capitalized">{scannedWalletData.model.split('_')[0]}</span>
			{$_('creation.overlay.device_not_initialized.paragraph_2', { default: 'available on' })}
			<span
				class="is-link has-text-weight-semibold"
				on:click={() =>
					openUrl(
						scannedWalletData.model.toLowerCase().split('_')[0] === 'coldcard'
							? 'coldcard-docs'
							: scannedWalletData.model.toLowerCase().split('_')[0] === 'ledger'
							? 'ledger-doc'
							: 'trezor-docs',
					)}>{$_('creation.overlay.device_not_initialized.paragraph_3', { default: 'website' })}</span
			>.<br />{$_('creation.overlay.device_not_initialized.paragraph_4', { default: 'Reach out to us on our' })}
			<span class="is-link has-text-weight-semibold" on:click={() => openUrl('telegram')}>Telegram</span>
			{$_('creation.overlay.device_not_initialized.paragraph_5', { default: 'if you have any questions' })}.
		</p>
		<div class="buttons is-centered mt-6">
			<Button text="Cancel" buttonClass="is-primary is-outlined" on:buttonClicked={handleCancelScanning} />
			<Button text="Retry scanning" buttonClass="is-primary" on:buttonClicked={handleReScanForDevice} />
		</div>
	</Overlay>
{/if}

{#if deviceAlreadySigned}
	<Overlay
		title={`${$_('withdraw.overlay.device_already_signed.title_1', { default: 'Your' })} ${scannedWalletData.model.split('_').join(' ')} ${$_(
			'withdraw.overlay.device_already_signed.title_2',
			{ default: '"have already signed the transaction' },
		)}`}
		titleIsLeft
		disableClosing
	>
		<p class="mt-2">{$_('withdraw.overlay.device_already_signed.paragraph', { default: 'Use another device from your multisig quorum' })}</p>
		<div class="buttons is-centered mt-6">
			<Button
				text={$_('withdraw.overlay.device_already_signed.button_cancel', { default: 'Cancel' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleCancelScanning}
			/>
			<Button
				text={$_('withdraw.overlay.device_already_signed.button_retry', { default: 'Retry another device' })}
				buttonClass="is-primary"
				on:buttonClicked={handleReScanForDevice}
			/>
		</div>
	</Overlay>
{/if}

{#if showPinOverlay}
	<Overlay
		title={$_('withdraw.overlay.trezor.title', { default: 'Unlock your Trezor' })}
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
	<Overlay title={$_('withdraw.overlay.broadcast.blockstream_title', { default: 'Broadcast via Blockstream' })} titleIsLeft disableClosing>
		<div class="broadcast-overlay mt-2">
			<p class="has-text-justified">
				{$_('withdraw.overlay.broadcast.blockstream_body', {
					default:
						"To keep things simple, we are currently using Blockstream's full node to send your transaction to the Bitcoin network. You will be able to connect your	own node shortly for better privacy.",
				})}
			</p>
			<div class="buttons is-right mt-6">
				<Button
					text={$_('withdraw.overlay.broadcast.blockstream_button_cancel', { default: 'Cancel' })}
					buttonClass="is-primary is-outlined"
					on:buttonClicked={handleCancelTransaction}
				/>
				<Button
					text={$_('withdraw.overlay.broadcast.blockstream_button_confirm', { default: 'Broadcast transaction' })}
					buttonClass="is-primary"
					on:buttonClicked={handleSendTransaction}
				/>
			</div>
		</div>
	</Overlay>
{/if}

{#if microSDImportError}
	<Overlay title={$_('withdraw.overlay.micro_sd_error.title', { default: 'Error on extracting PSBT from Micro SD' })} titleIsLeft disableClosing>
		<p class="mt-2 mb-5">{$_('withdraw.overlay.micro_sd_error.paragraph', { default: 'Make sure the proper PSBT file was selected' })}</p>
		<div class="buttons is-centered mt-6">
			<Button
				text={$_('withdraw.overlay.micro_sd_error.button_cancel', { default: 'Cancel' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleCancelImportingFromMicroSD}
			/>
			<Button
				text={$_('withdraw.overlay.micro_sd_error.button_retry', { default: 'Retry importing signed' })}
				buttonClass="is-primary"
				on:buttonClicked={handleShowExtractFromMicroSD}
			/>
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
