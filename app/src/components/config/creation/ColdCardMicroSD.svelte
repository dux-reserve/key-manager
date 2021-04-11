<script>
	import { _ } from 'svelte-i18n';
	import { createEventDispatcher, onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import Button from '../../ui/Button.svelte';

	export let walletType = 'single';

	const dispatch = createEventDispatcher();

	const handleExtractFromMicroSD = () => {
		dispatch('uploadFromMicroSD');
	};

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns has-text-left is-centered">
		<div class="column is-8">
			<div class="card">
				<div class="card-content is-fullheight">
					<div class="card-title">
						<h4 class="subtitle has-smaller-margin is-4 is-primary has-text-weight-bold">
							{$_('creation.micro_sd_coldcard.title', { default: 'Add your Coldcard public key via Micro SD' })}
						</h4>
					</div>
					<div class="card-body">
						<div class="columns">
							<div class="column">
								<p>
									<!-- TODO: refactor do a ol>li -->
									{#if walletType === 'single'}
										1. {$_('creation.micro_sd_coldcard.single.first_step', { default: 'Insert a Micro SD card into your Coldcard (max 32 GB)' })}.<br />
										2. {$_('creation.micro_sd_coldcard.single.second_step', { default: 'Power up and unlock your Coldcard' })}.<br />
										3. {$_('creation.micro_sd_coldcard.single.third_step_go_to', { default: 'Go to' })}
										<span class="has-text-weight-normal"
											>{$_('creation.micro_sd_coldcard.single.third_step', { default: 'Advanced > Micro SD Card > Export Wallet > Generic JSON' })}</span
										>.<br />
										4. {$_('creation.micro_sd_coldcard.single.fourth_step', {
											default: 'Enter 0 as the account number, unless you know what you are doing',
										})}.<br />
										5. {$_('creation.micro_sd_coldcard.single.fifth_step', { default: 'Confirm and finish the export' })}.<br />
										6. {$_('creation.micro_sd_coldcard.single.sixth_step', { default: 'Insert the Micro SD card from your Coldcard to your computer' })}.
									{:else}
										1. {$_('creation.micro_sd_coldcard.multi.first_step', { default: 'Insert a Micro SD card into your Coldcard (max 32 GB)' })}.<br />
										2. {$_('creation.micro_sd_coldcard.multi.second_step', { default: 'Power up and unlock your Coldcard' })}
										.<br />
										3. {$_('creation.micro_sd_coldcard.multi.third_step_go_to', { default: 'Go to' })}
										<span class="has-text-weight-normal"
											>{$_('creation.micro_sd_coldcard.multi.third_step', { default: 'Settings > Multisig Wallets > Export XPUB' })}</span
										>.<br />
										4. {$_('creation.micro_sd_coldcard.multi.fourth_step', { default: 'Confirm and finish the export' })}
										.<br />
										5. {$_('creation.micro_sd_coldcard.multi.fifth_step', { default: 'Insert the Micro SD card from your Coldcard to your computer' })}.
									{/if}
								</p>
								<div class="button-float">
									<Button
										text={$_('creation.micro_sd_coldcard.button', { default: 'Import from Micro SD' })}
										buttonClass="is-primary has-no-minimun-width"
										on:buttonClicked={handleExtractFromMicroSD}
									/>
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
			margin-bottom: 7.5rem;
		}
	}

	.button-float {
		position: absolute;
		right: 3rem;
		bottom: 3rem;
	}
</style>
