<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import ButtonDropDown from '../../../ui/ButtonDropDown.svelte';

	export let selectedWalletBrand = '';
	export let exportedName = '';

	const dispatch = createEventDispatcher();

	const keyIcon = './img/icons/ui/single-key.svg';

	let name = exportedName;
	let dropdownTextWalletDevice =
		selectedWalletBrand === 'coldcard'
			? $_('creation.dropdown_details.coldcard', { default: 'Coldcard - Recommended' })
			: selectedWalletBrand === 'trezor'
			? $_('creation.dropdown_details.trezor', { default: 'Trezor' })
			: selectedWalletBrand === 'ledger'
			? $_('creation.dropdown_details.ledger', { default: 'Ledger' })
			: $_('creation.dropdown_details.choose', { default: 'Choose your device' });

	const handleDeviceSelected = ({ detail }) => {
		const devicesChoice = [
			$_('creation.dropdown_details.coldcard_clean', { default: 'Coldcard' }),
			$_('creation.dropdown_details.trezor', { default: 'Trezor' }),
			$_('creation.dropdown_details.ledger', { default: 'Ledger' }),
		];
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
						<h2 class="title is-4 has-subtitle-margin is-vertical-center has-text-centered is-justify-content-center">
							{$_('creation.wallet_details.title', { default: 'Single hardware device' })}
						</h2>
					</div>
					<div class="card-body">
						<div class="columns">
							<div class="column is-10 is-offset-1">
								<div class="field">
									<label class="label" for="walletName">{$_('creation.wallet_details.label_name', { default: 'Wallet name' })}</label>
									<div class="control">
										<input
											id="walletName"
											class="input"
											type="text"
											maxlength="36"
											placeholder={$_('creation.wallet_details.name_placeholder', { default: 'Example: Spending Wallet' })}
											bind:value={name}
											on:keyup={dispatchInputValue}
											autofocus
										/>
									</div>
								</div>
								<div class="field">
									<label class="label" for="walletType">{$_('creation.wallet_details.label_device', { default: 'Hardware device' })}</label>
									<div class="control">
										<div id="walletType" class="buttons is-centered">
											<ButtonDropDown
												dropdownText={dropdownTextWalletDevice}
												dropdownClass={'is-primary'}
												on:dropdownSelected={handleDeviceSelected}
												fullWidth
												options={[
													{
														name: $_('creation.dropdown_details.coldcard', { default: 'Coldcard - Recommended' }),
														selected: selectedWalletBrand === 'coldcard',
													},
													{ name: $_('creation.dropdown_details.trezor', { default: 'Trezor' }), selected: selectedWalletBrand === 'trezor' },
													{ name: $_('creation.dropdown_details.ledger', { default: 'Ledger' }), selected: selectedWalletBrand === 'ledger' },
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
