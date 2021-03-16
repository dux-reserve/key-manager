<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import Button from '../../components/ui/Button.svelte';

	export let microSDExportError = false;

	const dispatch = createEventDispatcher();

	const handleExportFromMicroSD = () => {
		dispatch('uploadFromMicroSD');
	};

	const handleExportPSBTFromMicroSD = () => {
		dispatch('exportPSBTForColdcard');
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
						<h5 class="subtitle has-smaller-margin is-4 is-primary has-text-weight-bold">Sign your transaction via Micro SD</h5>
					</div>
					<div class="card-body">
						<div class="columns">
							<div class="column">
								<p class="has-text-weight-medium">
									Your previously imported your setup file into your Coldcard. If you haven’t done it already, you can do it from your vault settings
								</p>
								<p>
									1. Download your partially signed bitcoin transaction (PSBT) into Coldcard.<br />
									2. Insert a Micro SD card into your Coldcard (max 32 GB).<br />
									3. Power up and unlock your Coldcard.<br />
									4. Select Ready to Sign.<br />
									5. Review the transaction details and sign.<br />
									6. Confirm and finish the export of the now signed PSBT.<br />
									7. Insert the Micro SD card from your Coldcard back into your computer.<br />
									8. Upload the now signed PSBT into the application (file suffix: -part).
								</p>
								<div class="button-float">
									<div class="buttons is-right">
										<Button
											text="Download transaction for signing"
											buttonClass="is-primary is-outlined has-no-minimun-width"
											on:buttonClicked={handleExportPSBTFromMicroSD}
										/>
										<Button text="Upload signed transaction" buttonClass="is-primary has-no-minimun-width" on:buttonClicked={handleExportFromMicroSD} />
									</div>
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
		height: 478px;

		.card-body {
			margin-bottom: 4rem;
		}
	}

	.button-float {
		position: absolute;
		right: 2.5rem;
		bottom: 3rem;
	}
</style>
