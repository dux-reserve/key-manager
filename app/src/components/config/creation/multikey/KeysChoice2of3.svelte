<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import Button from '../../../ui/Button.svelte';
	import ButtonDropDown from '../../../ui/ButtonDropDown.svelte';

	export let importedDevices = [];
	export let selectedWalletBrand = '';

	const dispatch = createEventDispatcher();

	const keyIcon = './img/icons/ui/single-key.svg';
	const checkCircle = './img/icons/ui/check-circle.svg';
	const coldcardLogo = './img/logos/coldcard.png';
	const ledgerLogo = './img/logos/ledger-vertical.png';
	const trezorLogo = './img/logos/trezor.png';

	let dropdownTextVaultDevice =
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
		dropdownTextVaultDevice = devicesChoice[detail];
		dispatch('walletDeviceChange', dropdownTextVaultDevice);
	};

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns is-centered is-multiline">
		<div class="column is-4">
			<div class="card">
				<div class="card-content is-fullheight has-text-centered">
					{#if importedDevices.length >= 1}
						<div class="card-title">
							<span class="icon is-primary is-normal has-no-hover"><img class="image-check" src={checkCircle} alt="Success check" /></span>
							<h2 class="title is-5 has-subtitle-margin is-capitalized">{importedDevices[0].model.replaceAll('_', ' ')}</h2>
						</div>
						<div class="device-logo">
							{#if importedDevices[0].type === 'coldcard'}<img class="image-wallet" align="center" src={coldcardLogo} alt="Coldcard" />{/if}
							{#if importedDevices[0].type === 'ledger'}<img class="image-wallet" align="center" src={ledgerLogo} alt="Ledger" />{/if}
							{#if importedDevices[0].type === 'trezor'}<img class="image-wallet" align="center" src={trezorLogo} alt="Trezor" />{/if}
						</div>
						<div class="card-bottom">
							<p
								class="is-uppercase has-text-weight-medium mt-5 mb-2"
								title={$_('creation.key_choice.device_fingerprint', { default: 'Device unique fingerprint' })}
							>
								{importedDevices[0].fingerprint}
							</p>
						</div>
					{:else}
						<div class="card-title">
							<span class="icon is-prussian-blue is-normal has-no-hover">
								<img class="image-key" src={keyIcon} alt="Key Icon" />
							</span>
							<h2 class="title is-4 has-subtitle-margin">{$_('creation.key_choice.key_1_title', { default: 'Hardware device 1' })}</h2>
						</div>
						<p class="mb-6">{$_('creation.key_choice.key_1_paragraph', { default: 'Pick your first hardware device to add its public key to your vault' })}.</p>
						<div class="card-bottom">
							<div class="buttons is-centered">
								<ButtonDropDown
									dropdownText={dropdownTextVaultDevice}
									dropdownClass="is-primary"
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
					{/if}
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="card">
				<div class="card-content is-fullheight has-text-centered">
					{#if importedDevices.length >= 2}
						<div class="card-title">
							<span class="icon is-primary is-normal has-no-hover"><img class="image-check" src={checkCircle} alt="Success check" /></span>
							<h2 class="title is-5 has-subtitle-margin is-capitalized">{importedDevices[1].model.replaceAll('_', ' ')}</h2>
						</div>
						<div class="device-logo">
							{#if importedDevices[1].type === 'coldcard'}<img class="image-wallet" align="center" src={coldcardLogo} alt="Coldcard" />{/if}
							{#if importedDevices[1].type === 'ledger'}<img class="image-wallet" align="center" src={ledgerLogo} alt="Ledger" />{/if}
							{#if importedDevices[1].type === 'trezor'}<img class="image-wallet" align="center" src={trezorLogo} alt="Trezor" />{/if}
						</div>
						<div class="card-bottom">
							<p
								class="is-uppercase has-text-weight-medium mt-5 mb-2"
								title={$_('creation.key_choice.device_fingerprint', { default: 'Device unique fingerprint' })}
							>
								{importedDevices[1].fingerprint}
							</p>
						</div>
					{:else}
						<div class="card-title">
							<span class="icon is-prussian-blue is-normal has-no-hover">
								<img class="image-key" src={keyIcon} alt="Key Icon" />
							</span>
							<h2 class="title is-4 has-subtitle-margin">{$_('creation.key_choice.key_2_title', { default: 'Hardware device 2' })}</h2>
						</div>
						<p class="mb-6">
							{$_('creation.key_choice.key_2_paragraph', { default: 'Pick your second hardware device to add its public key to your vault' })}.
						</p>
						<div class="card-bottom">
							<div class="buttons is-centered">
								{#if importedDevices.length < 1}
									<Button
										text={$_('creation.key_choice.key_2_button', { default: 'Add second hardware key' })}
										buttonClass="is-primary button-vault"
										buttonDisabled
										title="Add the first hardware key to proceed"
									/>
								{:else}
									<ButtonDropDown
										dropdownText={dropdownTextVaultDevice}
										dropdownClass="is-primary"
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
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="card">
				<div class="card-content is-fullheight has-text-centered">
					{#if importedDevices.length >= 3}
						<div class="card-title">
							<span class="icon is-primary is-normal has-no-hover"><img class="image-check" src={checkCircle} alt="Success check" /></span>
							<h2 class="title is-5 has-subtitle-margin is-capitalized">{importedDevices[2].model.replaceAll('_', ' ')}</h2>
						</div>
						<div class="device-logo">
							{#if importedDevices[2].type === 'coldcard'}<img class="image-wallet" align="center" src={coldcardLogo} alt="Coldcard" />{/if}
							{#if importedDevices[2].type === 'ledger'}<img class="image-wallet" align="center" src={ledgerLogo} alt="Ledger" />{/if}
							{#if importedDevices[2].type === 'trezor'}<img class="image-wallet" align="center" src={trezorLogo} alt="Trezor" />{/if}
						</div>
						<div class="card-bottom">
							<p
								class="is-uppercase has-text-weight-medium mt-5 mb-2"
								title={$_('creation.key_choice.device_fingerprint', { default: 'Device unique fingerprint' })}
							>
								{importedDevices[2].fingerprint}
							</p>
						</div>
					{:else}
						<div class="card-title">
							<span class="icon is-prussian-blue is-normal has-no-hover">
								<img class="image-key" src={keyIcon} alt="Key Icon" />
							</span>
							<h2 class="title is-4 has-subtitle-margin">{$_('creation.key_choice.key_3_title', { default: 'Hardware device 3' })}</h2>
						</div>
						<p class="mb-6">{$_('creation.key_choice.key_3_paragraph', { default: 'Pick your third hardware device to add its public key to your vault' })}.</p>
						<div class="card-bottom">
							<div class="buttons is-centered">
								{#if importedDevices.length < 2}
									<Button
										text={$_('creation.key_choice.key_3_button', { default: 'Add third hardware key' })}
										buttonClass="is-primary button-vault"
										title={importedDevices.length === 1 ? 'add the second hardware key to proceed' : 'Add the first hardware key to proceed'}
										buttonDisabled
									/>
								{:else}
									<ButtonDropDown
										dropdownText={dropdownTextVaultDevice}
										dropdownClass="is-primary"
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
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.card {
		width: 440px;
		height: 388px;
	}

	.card-title {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.device-logo {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
	}

	.image-wallet {
		width: auto;
		height: 164px;
		object-fit: cover;
	}

	.image-check {
		margin-bottom: 2.125rem;
	}

	.image-key {
		margin-bottom: 2.125rem;
	}

	.card-bottom {
		padding-bottom: 1.525rem;
	}
</style>
