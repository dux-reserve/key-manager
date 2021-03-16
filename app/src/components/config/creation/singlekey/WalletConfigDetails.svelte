<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import ButtonDropDown from '../../../ui/ButtonDropDown.svelte';

	export let selectedWalletBrand = '';
	export let exportedName = '';

	const dispatch = createEventDispatcher();

	const keyIcon = './img/icons/ui/single-key.svg';

	let name = exportedName;
	let dropdownTextWalletDevice =
		selectedWalletBrand === 'coldcard'
			? 'Coldcard - Recommended'
			: selectedWalletBrand === 'trezor'
			? 'Trezor'
			: selectedWalletBrand === 'ledger'
			? 'Ledger'
			: 'Choose your device';

	const handleDeviceSelected = ({ detail }) => {
		const devicesChoice = ['Coldcard - Recommended', 'Trezor', 'Ledger'];
		dropdownTextWalletDevice = devicesChoice[detail];
		dispatch('walletDeviceChange', dropdownTextWalletDevice);
	};

	const dispatchInputValue = () => {
		dispatch('walletNameChange', name);
	};

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns is-centered">
		<div class="column is-7">
			<div class="card">
				<div class="card-content is-fullheight">
					<div class="card-title has-text-centered">
						<span class="icon is-primary is-normal has-no-hover mr-3"><img class="image-key" src={keyIcon} alt="Key Icon" /></span>
						<h2 class="title is-4 has-subtitle-margin is-vertical-center has-text-centered is-justify-content-center">Single hardware device</h2>
					</div>
					<div class="card-body">
						<div class="columns">
							<div class="column is-10 is-offset-1">
								<div class="field">
									<label class="label" for="walletName">Wallet name</label>
									<div class="control">
										<input
											id="walletName"
											class="input"
											type="text"
											maxlength="36"
											placeholder="Example: Spending Wallet"
											bind:value={name}
											on:keyup={dispatchInputValue}
											autofocus
										/>
									</div>
								</div>
								<div class="field">
									<label class="label" for="walletType">Hardware device</label>
									<div class="control">
										<div id="walletType" class="buttons is-centered">
											<ButtonDropDown
												dropdownText={dropdownTextWalletDevice}
												dropdownClass={'is-primary'}
												on:dropdownSelected={handleDeviceSelected}
												fullWidth
												options={[
													{ name: 'Coldcard - Recommended', selected: selectedWalletBrand === 'coldcard' },
													{ name: 'Trezor', selected: selectedWalletBrand === 'trezor' },
													{ name: 'Ledger', selected: selectedWalletBrand === 'ledger' },
												]}
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
	</div>
</div>

<style lang="scss">
	.card {
		height: 388px;

		.card-body {
			margin-bottom: 1.5rem;
		}
	}

	.image-key {
		margin-bottom: 2.125rem;
	}
</style>
