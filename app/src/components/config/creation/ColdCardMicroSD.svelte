<script>
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
						<h4 class="subtitle has-smaller-margin is-4 is-primary has-text-weight-bold">Add your Coldcard public key via Micro SD</h4>
					</div>
					<div class="card-body">
						<div class="columns">
							<div class="column">
								<p>
									{#if walletType === 'single'}
										1. Insert a Micro SD card into your Coldcard (max 32 GB).<br />
										2. Power up and unlock your Coldcard.<br />
										3. Go to Advanced > Micro SD Card > Export Wallet > Generic JSON.<br />
										4. Enter 0 as the account number, unless you know what you are doing.<br />
										5. Confirm and finish the export.<br />
										6. Insert the Micro SD card from your Coldcard to your computer.
									{:else}
										1. Insert a Micro SD card into your Coldcard (max 32 GB).<br />
										2. Power up and unlock your Coldcard.<br />
										3. Go to Settings > Multisig Wallets > Export XPUB.<br />
										4. Confirm and finish the export.<br />
										5. Insert the Micro SD card from your Coldcard to your computer.
									{/if}
								</p>
								<div class="button-float">
									<Button text="Import from Micro SD" buttonClass="is-primary has-no-minimun-width" on:buttonClicked={handleExtractFromMicroSD} />
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
