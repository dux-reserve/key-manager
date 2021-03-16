<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import Button from '../../components/ui/Button.svelte';

	const dispatch = createEventDispatcher();

	const coldcardLogo = './img/logos/coldcard.png';
	const ledgerLogo = './img/logos/ledger-vertical.png';
	const trezorLogo = './img/logos/trezor.png';

	export let deviceScanning = false;
	export let extractedFromMicroSD = false;
	export let scannedWalletData = {};
	export let selectedWalletData = {};
	export let showRetrySignWithDevice = false;
	export let signingSucess = false;
	export let vaultCompletedKeys = 0;
	export let walletNeedPinSent = false;
	export let walletType = 'single';
	export let withdrawStep = 3;

	const handleReScanForDevice = () => {
		dispatch('launchRescanning');
	};

	const handleCancelScanning = () => {
		dispatch('cancelScanning');
	};

	const handleRetrySigning = () => {
		dispatch('retrySigning');
	};

	const cancelSigning = () => {
		dispatch('cancelSigning');
	};

	const handleExtractFromMicroSD = () => {
		dispatch('extractFromMicroSD');
	};

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns has-text-centered is-centered mt-5">
		<div class="column is-8">
			<div class="card">
				<div class="card-content is-fullheight">
					<div class="card-title has-text-left">
						<h5 class="subtitle has-smaller-margin is-4 is-primary has-text-weight-bold">
							Adding signature
							{#if walletType === 'multi'}
								{vaultCompletedKeys + 1}
							{/if}
						</h5>
						{#if !signingSucess}
							{#if selectedWalletData.type === 'ledger'}
								<h4 class="title is-family-primary is-5 has-smaller-margin">
									Unlock your Ledger <span class="is-uppercase">({selectedWalletData.fingerprint})</span> & Open the Bitcoin App
								</h4>
							{:else if selectedWalletData.type === 'coldcard'}
								<h4 class="title is-family-primary is-5 has-smaller-margin">
									Make sure your Coldcard <span class="is-uppercase">({selectedWalletData.fingerprint})</span> is unlocked
								</h4>
							{:else if selectedWalletData.type === 'trezor'}
								<h4 class="title is-family-primary is-5 has-smaller-margin">
									Your Trezor {#if withdrawStep === 3}
										<span class="is-uppercase">({selectedWalletData.fingerprint})</span>
									{/if}
									PIN will be ask if needed
								</h4>
							{/if}
						{:else}
							<h4 class="title is-family-primary is-5 has-smaller-margin has-text-multiline">
								<span class="is-capitalized">{selectedWalletData.model.split('_').join(' ')}</span>
								{#if selectedWalletData.fingerprint}
									(<span class="is-uppercase" title="Device unique fingerprint">{selectedWalletData.fingerprint}</span>)
								{/if} ✓
							</h4>
						{/if}
					</div>
					<div class="card-body">
						<div class="columns">
							<div class="column is-3 pl-0">
								{#if selectedWalletData.type === 'ledger'}
									<img class="image-wallet" src={ledgerLogo} alt="Ledger" />
								{:else if selectedWalletData.type === 'coldcard'}
									<img class="image-wallet" src={coldcardLogo} alt="Coldcard" />
								{:else if selectedWalletData.type === 'trezor'}
									<img class="image-wallet" src={trezorLogo} alt="Trezor" />
								{/if}
							</div>
							<div class="column is-9 has-text-left">
								<div class="top-loading">
									<div>
										{#if withdrawStep === 3}
											{#if deviceScanning}
												<p class="subtitle is-6">
													Connect your <span class="is-capitalized">{selectedWalletData.model.split('_').join(' ')}</span> via USB
												</p>
											{:else}
												<p class="subtitle is-6">
													{selectedWalletData.model.split('_').join(' ')} <span class="is-uppercase">({selectedWalletData.fingerprint})</span> not detected. Please
													try again
												</p>
											{/if}
										{:else if withdrawStep === 4}
											{#if !signingSucess && !showRetrySignWithDevice}
												{#if walletNeedPinSent && !scannedWalletData.fingerprint}
													<p class="subtitle is-6">Unlock your <span class="is-capitalized">{selectedWalletData.model.split('_').join(' ')}</span></p>
												{:else}
													<p class="subtitle is-6">
														Signing your transaction {#if selectedWalletData.fingerprint}
															with <span class="is-uppercase" title="Device unique fingerprint">{selectedWalletData.fingerprint}</span>
														{/if}
													</p>
												{/if}
											{:else if !signingSucess && showRetrySignWithDevice}
												<p class="subtitle is-6">Failed to sign transaction</p>
											{:else}
												<p class="subtitle is-6">
													You can now unplug your
													{#if extractedFromMicroSD}
														Micro SD
													{:else}
														device
													{/if}
												</p>
											{/if}
										{/if}
									</div>
									<div>
										{#if withdrawStep === 3}
											{#if deviceScanning}
												<Button
													text="Cancel"
													buttonClass="is-primary is-light is-outlined is-small has-no-minimun-width"
													on:buttonClicked={handleCancelScanning}
												/>
											{:else}
												<Button
													text="Retry"
													buttonClass="is-primary is-light is-outlined is-small has-no-minimun-width"
													on:buttonClicked={handleReScanForDevice}
												/>
											{/if}
										{:else if withdrawStep === 4}
											{#if !signingSucess && !showRetrySignWithDevice}
												<Button
													text="Cancel signing"
													buttonClass="is-primary is-light is-outlined is-small has-no-minimun-width"
													on:buttonClicked={cancelSigning}
												/>
											{:else if !signingSucess && showRetrySignWithDevice}
												<Button
													text="Retry signing"
													buttonClass="is-primary is-light is-outlined is-small has-no-minimun-width"
													on:buttonClicked={handleRetrySigning}
												/>
											{/if}
										{/if}
									</div>
								</div>

								{#if withdrawStep === 3 && deviceScanning}
									<div class="loading"><progress class="progress is-primary is-small" max="100">0%</progress></div>
								{:else if withdrawStep === 3 && !deviceScanning}
									<div class="loading"><progress class="progress is-danger is-small" value={'100'} max="100">0%</progress></div>
								{:else if withdrawStep === 4 && !signingSucess && showRetrySignWithDevice}
									<div class="loading"><progress class="progress is-danger is-small" value={'100'} max="100">0%</progress></div>
								{:else if withdrawStep === 4 && !signingSucess}
									<div class="loading"><progress class="progress is-primary is-small" max="100">50%</progress></div>
								{:else if withdrawStep === 4 && signingSucess}
									<div class="loading"><progress class="progress is-primary is-small" value={'100'} max="100">100%</progress></div>
								{/if}

								<div class="bottom-loading">
									{#if withdrawStep === 3}
										{#if deviceScanning}
											<p class="is-size-8">In progress...</p>
										{:else}
											<p class="is-size-8">Make sure your device is plugged in</p>
										{/if}
									{:else if withdrawStep === 4}
										{#if !signingSucess && !showRetrySignWithDevice}
											<p class="is-size-8">In progress, confirm on your device...</p>
										{:else if !signingSucess && showRetrySignWithDevice}
											<p class="is-size-8 has-text-multiline">
												Error during the signing
												{selectedWalletData.type === 'coldcard'
													? 'make sure you have imported your setup file into your Coldcard. If you haven’t done it already, you can do it from your vault settings'
													: '- Please try again'}
											</p>
										{:else if signingSucess}
											<p class="is-size-8">Transaction signed</p>
										{/if}
									{/if}
									{#if selectedWalletData.type === 'coldcard' && (withdrawStep === 3 || showRetrySignWithDevice)}
										<div class="button-float">
											<Button
												text="Sign with Micro SD instead"
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
