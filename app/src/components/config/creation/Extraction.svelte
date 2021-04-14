<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import { numberToOrdinalEnglishLabel, numberToOrdinalFrenchLabel } from '../../../utils/helpers';
	import { applicationSettings } from '../../../store';
	import Button from '../../ui/Button.svelte';

	export let deviceScanning = false;
	export let exportingInProgress = false;
	export let extractedFromMicroSD = false;
	export let extractedXpub = '';
	export let retryXpubExtration = false;
	export let scannedWalletData = {};
	export let selectedWalletBrand = '';
	export let showPinOverlay = false;
	export let step = 3;
	export let vaultCompletedKeys = 0;
	export let walletNeedPinSent = false;
	export let walletType = 'single';

	const dispatch = createEventDispatcher();

	const coldcardLogo = './img/logos/coldcard.png';
	const ledgerLogo = './img/logos/ledger-vertical.png';
	const trezorLogo = './img/logos/trezor.png';

	const handleReScanForDevice = () => {
		dispatch('launchRescanning');
	};

	const handleCancelScanning = () => {
		dispatch('cancelScanning');
	};

	const startExtraction = () => {
		dispatch('startExtraction');
	};

	const retryExtraction = () => {
		dispatch('retryExtraction');
	};

	const cancelExtraction = () => {
		dispatch('cancelExtraction');
	};

	const handleExtractFromMicroSD = () => {
		dispatch('extractFromMicroSD');
	};

	const handleShowXpub = () => {
		dispatch('showXpub');
	};

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns has-text-centered is-centered">
		<div class="column is-8">
			<div class="card">
				<div class="card-content is-fullheight">
					<div class="card-title has-text-left">
						<h4 class="subtitle has-smaller-margin is-4 is-primary has-text-weight-bold">
							{#if walletType === 'single'}
								{$_('creation.extraction.title_wallet', { default: 'Adding your hardware device' })}
							{:else}
								{$_('creation.extraction.title_vault', { default: 'Adding hardware device' })} {vaultCompletedKeys + 1}
							{/if}
						</h4>
						{#if !extractedXpub}
							{#if selectedWalletBrand === 'ledger'}
								<h5 class="title is-family-primary is-5 has-smaller-margin">
									{$_('creation.extraction.unextracted_ledger', { default: 'Unlock your Ledger & open the Bitcoin app' })}
								</h5>
							{:else if selectedWalletBrand === 'coldcard'}
								<h5 class="title is-family-primary is-5 has-smaller-margin">
									{extractedFromMicroSD
										? $_('creation.extraction.unextracted_coldcard_sd', { default: 'Exporting from Coldcard with Micro SD' })
										: $_('creation.extraction.unextracted_coldcard', { default: 'Make sure your Coldcard is unlocked' })}
								</h5>
							{:else if selectedWalletBrand === 'trezor'}
								<h5 class="title is-family-primary is-5 has-smaller-margin">
									{$_('creation.extraction.unextracted_trezor', { default: 'Your Trezor PIN will be asked if needed' })}
								</h5>
							{/if}
						{:else}
							<h5 class="title is-family-primary is-5 has-smaller-margin has-text-multiline">
								<span class="is-capitalized">{scannedWalletData.model.split('_').join(' ')}</span>
								{#if scannedWalletData.fingerprint}
									(<span class="is-uppercase" title={$_('creation.extraction.device_fingerprint', { default: 'Device unique fingerprint' })}
										>{scannedWalletData.fingerprint}</span
									>)
								{/if} ✓
							</h5>
						{/if}
					</div>
					<div class="card-body">
						<div class="columns">
							<div class="column is-3 pl-0">
								{#if selectedWalletBrand === 'ledger'}
									<img class="image-wallet" src={ledgerLogo} alt="Ledger" />
								{:else if selectedWalletBrand === 'coldcard'}
									<img class="image-wallet" src={coldcardLogo} alt="Coldcard" />
								{:else if selectedWalletBrand === 'trezor'}
									<img class="image-wallet" src={trezorLogo} alt="Trezor" />
								{/if}
							</div>
							<div class="column is-9 has-text-left pr-0">
								<div class="top-loading">
									<div>
										{#if (walletType === 'single' && step === 3) || (walletType === 'multi' && step === 5)}
											{#if deviceScanning}
												<p class="subtitle is-6">
													{$_('creation.extraction.connect', { default: 'Connect your' })} <span class="is-capitalized">{selectedWalletBrand}</span>
													{$_('creation.extraction.connect_usd', { default: 'via USB' })}
												</p>
											{:else}
												<p class="subtitle is-6">{$_('creation.extraction.no_device', { default: 'No device detected. Please try again' })}</p>
											{/if}
										{:else if (walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)}
											{#if !extractedXpub && !retryXpubExtration}
												{#if walletNeedPinSent && exportingInProgress}
													<p class="subtitle is-6">
														{$_('creation.extraction.unlock_device', { default: 'Unlock your' })}
														<span class="is-capitalized">{scannedWalletData.model.split('_').join(' ')}</span>
													</p>
												{:else if exportingInProgress}
													<p class="subtitle is-6">
														{$_('creation.extraction.reading', { default: 'Reading' })}
														{#if scannedWalletData.fingerprint}
															{$_('creation.extraction.reading_key_from', { default: 'public key from' })}
															<span class="is-uppercase" title={$_('creation.extraction.device_fingerprint', { default: 'Device unique fingerprint' })}
																>{scannedWalletData.fingerprint}</span
															>
														{:else}
															{$_('creation.extraction.reading_key', { default: 'public key' })}
														{/if}
													</p>
												{:else}
													<p class="subtitle is-6">{$_('creation.extraction.ready_to_read_key', { default: 'Ready to read public key' })}</p>
												{/if}
											{:else if !extractedXpub && retryXpubExtration}
												<p class="subtitle is-6">{$_('creation.extraction.failed_reading', { default: 'Failed to export public key. Please try again' })}</p>
											{:else if extractedXpub}
												<p class="subtitle is-6">
													{$_('creation.extraction.unplug', { default: 'You can now unplug your' })}
													{#if extractedFromMicroSD}
														{$_('creation.extraction.unplug_sd', { default: 'Micro SD' })}
													{:else}
														{$_('creation.extraction.unplug_device', { default: 'device' })}
													{/if}
												</p>
											{/if}
										{/if}
									</div>
									<div>
										{#if (walletType === 'single' && step === 3) || (walletType === 'multi' && step === 5)}
											{#if deviceScanning}
												<Button
													text={$_('creation.extraction.small_button_cancel_scanning', { default: 'Cancel scanning' })}
													buttonClass="is-primary is-light is-small extraction-width"
													on:buttonClicked={handleCancelScanning}
												/>
											{:else}
												<Button
													text={$_('creation.extraction.small_button_retry_scanning', { default: 'Retry scanning' })}
													buttonClass="is-primary is-light is-small extraction-width"
													on:buttonClicked={handleReScanForDevice}
												/>
											{/if}
										{:else if (walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)}
											{#if !extractedXpub && !exportingInProgress && !retryXpubExtration}
												<Button
													text={$_('creation.extraction.small_button_start', { default: 'Start' })}
													buttonClass="is-primary is-small extraction-width"
													on:buttonClicked={startExtraction}
												/>
											{:else if !extractedXpub && exportingInProgress && !retryXpubExtration}
												<Button
													text={$_('creation.extraction.small_button_cancel', { default: 'Cancel' })}
													buttonClass="is-primary is-light is-small extraction-width"
													on:buttonClicked={cancelExtraction}
												/>
											{:else if !extractedXpub && retryXpubExtration}
												<Button
													text={$_('creation.extraction.small_button_retry', { default: 'Retry' })}
													buttonClass="is-primary is-light is-small extraction-width"
													on:buttonClicked={retryExtraction}
												/>
											{:else if extractedXpub}
												<Button
													text={$_('creation.extraction.small_show_public_key', { default: 'Show public key' })}
													buttonClass="is-primary is-light is-small extraction-width"
													on:buttonClicked={handleShowXpub}
												/>
											{/if}
										{/if}
									</div>
								</div>

								{#if showPinOverlay}
									<div class="loading"><progress class="progress is-primary is-small" value="20" max="100">20%</progress></div>
								{:else if ((walletType === 'single' && step === 3) || (walletType === 'multi' && step === 5)) && deviceScanning}
									<div class="loading"><progress class="progress is-primary is-small" max="100">0%</progress></div>
								{:else if ((walletType === 'single' && step === 3) || (walletType === 'multi' && step === 5)) && !deviceScanning}
									<div class="loading"><progress class="progress is-danger is-small" value="100" max="100">0%</progress></div>
								{:else if ((walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)) && !extractedXpub && retryXpubExtration}
									<div class="loading"><progress class="progress is-danger is-small" value="100" max="100">0%</progress></div>
								{:else if ((walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)) && !extractedXpub && exportingInProgress}
									<div class="loading"><progress class="progress is-primary is-small" max="100">60%</progress></div>
								{:else if ((walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)) && !extractedXpub && !exportingInProgress}
									<div class="loading"><progress class="progress is-primary is-small" value="100" max="100">40%</progress></div>
								{:else if ((walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)) && extractedXpub}
									<div class="loading"><progress class="progress is-primary is-small" value="100" max="100">100%</progress></div>
								{/if}

								<div class="bottom-loading">
									{#if (walletType === 'single' && step === 3) || (walletType === 'multi' && step === 5)}
										{#if deviceScanning}
											<p class="is-size-8">{$_('creation.extraction.in_progress', { default: 'In progress...' })}</p>
										{:else}
											<p class="is-size-8">{$_('creation.extraction.make_sure_plugged', { default: 'Make sure your device is plugged in' })}</p>
										{/if}
									{:else if (walletType === 'single' && step === 4) || (walletType === 'multi' && step === 6)}
										{#if !extractedXpub && !retryXpubExtration && !exportingInProgress}
											<p class="is-size-8">{$_('creation.extraction.make_sure_stay_plugged', { default: 'Make sure your device stays plugged in' })}</p>
										{:else if !extractedXpub && !retryXpubExtration && exportingInProgress}
											<p class="is-size-8">{$_('creation.extraction.in_progress', { default: 'In progress...' })}</p>
										{:else if !extractedXpub && retryXpubExtration}
											<p class="is-size-8">
												{$_('creation.extraction.make_sure_stay_plugged_and_unlocked', { default: 'Make sure your device is plugged in & properly unlocked' })}
											</p>
										{:else if extractedXpub}
											<p class="is-size-8">
												<span
													>{walletType === 'single'
														? $_('creation.extraction.wallet', { default: 'Wallet' })
														: `${
																$applicationSettings.interfaceLanguage === 'fr'
																	? numberToOrdinalFrenchLabel(vaultCompletedKeys + 1, true)
																	: numberToOrdinalEnglishLabel(vaultCompletedKeys + 1)
														  }`}</span
												>
												{walletType === 'single' ? '' : $_('creation.extraction.key', { default: 'key' })}
												{$_('creation.extraction.ready_confirmed', { default: 'is ready to be confirmed' })}
											</p>
										{/if}
									{/if}
									{#if selectedWalletBrand === 'coldcard' && (!exportingInProgress || retryXpubExtration) && !extractedXpub}
										<div class="button-float">
											<Button
												text={$_('creation.extraction.button_micro_sd', { default: 'Use Micro SD in air-gapped mode instead' })}
												buttonClass="is-primary is-outlined has-no-minimun-width"
												on:buttonClicked={handleExtractFromMicroSD}
											/>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.card {
		height: 388px;

		.card-body {
			margin-bottom: 1.75rem;
		}
	}

	.image-wallet {
		width: auto;
		height: 141px;
		margin-top: -2.04rem;
		object-fit: cover;
	}

	.top-loading {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}

	.bottom-loading {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;

		.button-float {
			position: absolute;
			right: 3rem;
			bottom: 3rem;
		}
	}

	.column.is-9 {
		margin-left: -16px;
	}

	.loading {
		margin: 12px 0 10px;
	}
</style>
