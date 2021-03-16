<script>
	import { createEventDispatcher, onMount } from 'svelte';
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

	let dropdownTextWalletDevice =
		selectedWalletBrand === 'coldcard'
			? 'Coldcard'
			: selectedWalletBrand === 'trezor'
			? 'Trezor'
			: selectedWalletBrand === 'ledger'
			? 'Ledger'
			: 'Choose your device';

	const handleDeviceSelected = ({ detail }) => {
		const devicesChoice = ['Coldcard', 'Trezor', 'Ledger'];
		dropdownTextWalletDevice = devicesChoice[detail];
		dispatch('walletDeviceChange', dropdownTextWalletDevice);
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
							<p class="is-uppercase has-text-weight-medium mt-5 mb-2" title="Device unique fingerprint">
								{importedDevices[0].fingerprint}
							</p>
						</div>
					{:else}
						<div class="card-title">
							<span class="icon is-prussian-blue is-normal has-no-hover">
								<img class="image-key" src={keyIcon} alt="Key Icon" />
							</span>
							<h2 class="title is-4 has-subtitle-margin">Hardware device 1</h2>
						</div>
						<p class="mb-6">Pick your first hardware device to add its key to your vault.</p>
						<div class="card-bottom">
							<div class="buttons is-centered">
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
							<p class="is-uppercase has-text-weight-medium mt-5 mb-2">
								{importedDevices[1].fingerprint}
							</p>
						</div>
					{:else}
						<div class="card-title">
							<span class="icon is-prussian-blue is-normal has-no-hover">
								<img class="image-key" src={keyIcon} alt="Key Icon" />
							</span>
							<h2 class="title is-4 has-subtitle-margin">Hardware device 2</h2>
						</div>
						<p class="mb-6">Pick your second hardware device to add its key to your vault.</p>
						<div class="card-bottom">
							<div class="buttons is-centered">
								{#if importedDevices.length < 1}
									<Button text="Add second hardware key" buttonClass="is-primary button-vault" buttonDisabled title="Add the first hardware key to proceed" />
								{:else}
									<ButtonDropDown
										dropdownText={dropdownTextWalletDevice}
										dropdownClass="is-primary"
										on:dropdownSelected={handleDeviceSelected}
										fullWidth
										options={[
											{ name: 'Coldcard - Recommended', selected: selectedWalletBrand === 'coldcard' },
											{ name: 'Trezor', selected: selectedWalletBrand === 'trezor' },
											{ name: 'Ledger', selected: selectedWalletBrand === 'ledger' },
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
							<p class="is-uppercase has-text-weight-medium mt-5 mb-2">
								{importedDevices[2].fingerprint}
							</p>
						</div>
					{:else}
						<div class="card-title">
							<span class="icon is-prussian-blue is-normal has-no-hover">
								<img class="image-key" src={keyIcon} alt="Key Icon" />
							</span>
							<h2 class="title is-4 has-subtitle-margin">Hardware device 3</h2>
						</div>
						<p class="mb-6">Pick your third hardware device to add its key to your vault.</p>
						<div class="card-bottom">
							<div class="buttons is-centered">
								{#if importedDevices.length < 2}
									<Button
										text="Add third hardware key"
										buttonClass="is-primary button-vault"
										title={importedDevices.length === 1 ? 'add the second hardware key to proceed' : 'Add the first hardware key to proceed'}
										buttonDisabled
									/>
								{:else}
									<ButtonDropDown
										dropdownText={dropdownTextWalletDevice}
										dropdownClass="is-primary"
										on:dropdownSelected={handleDeviceSelected}
										fullWidth
										options={[
											{ name: 'Coldcard - Recommended', selected: selectedWalletBrand === 'coldcard' },
											{ name: 'Trezor', selected: selectedWalletBrand === 'trezor' },
											{ name: 'Ledger', selected: selectedWalletBrand === 'ledger' },
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
