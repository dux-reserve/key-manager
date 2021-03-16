<script>
	import { createEventDispatcher } from 'svelte';
	import Button from '../ui/Button.svelte';
	import ButtonDropDown from '../ui/ButtonDropDown.svelte';

	export let currentConfigDevices = [];
	export let signedDevices = [];

	const dispatch = createEventDispatcher();

	const checkCircle = './img/icons/ui/check-circle.svg';
	const signatureIcon = './img/icons/ui/signature.svg';
	const coldcardLogo = './img/logos/coldcard.png';
	const trezorLogo = './img/logos/trezor.png';
	const ledgerVerticalLogo = './img/logos/ledger-vertical.png';

	let dropdownTextWalletDevice = 'Choose your device';
	let filteredcurrentConfigDevices = [];
	let permanentcurrentConfigDevices = [];

	let selectableDevice = [];

	$: if (currentConfigDevices.length >= 1 && selectableDevice.length < 1) {
		permanentcurrentConfigDevices = [...currentConfigDevices];
		for (let i = 0; i < currentConfigDevices.length; i++) {
			if (
				signedDevices.length < 1 ||
				(currentConfigDevices[i].device.type !== signedDevices[0].type && currentConfigDevices[i].device.fingerprint !== signedDevices[0].fingerprint)
			) {
				selectableDevice = [
					...selectableDevice,
					{ name: currentConfigDevices[i].device.model.replaceAll('_', ' ') + ' (' + currentConfigDevices[i].device.fingerprint + ')' },
				];
			}
		}
	}

	const handleDeviceSelected = ({ detail }) => {
		for (let i = 0; i < permanentcurrentConfigDevices.length; i++) {
			if (
				signedDevices.length < 1 ||
				(permanentcurrentConfigDevices[i].device.type !== signedDevices[0].type &&
					permanentcurrentConfigDevices[i].device.fingerprint !== signedDevices[0].fingerprint)
			) {
				filteredcurrentConfigDevices = [...filteredcurrentConfigDevices, permanentcurrentConfigDevices[i]];
			}
		}
		dropdownTextWalletDevice =
			filteredcurrentConfigDevices[detail].device.model.replaceAll('_', ' ') + ' (' + filteredcurrentConfigDevices[detail].device.fingerprint + ')';
		dispatch('deviceSelected', filteredcurrentConfigDevices[detail]);
	};
</script>

<div class="container-content">
	<div class="column mt-5">
		<div class="card signee">
			<div class="card-content is-fullheight has-text-centered">
				{#if signedDevices.length >= 1}
					<div class="card-title">
						<span class="icon is-primary is-normal has-no-hover"><img class="image-check" src={checkCircle} alt="Success check" /></span>
						<h2 class="title is-5 has-subtitle-margin is-capitalized">{signedDevices[0].model.replaceAll('_', ' ')}</h2>
					</div>
					<div class="device-logo">
						{#if signedDevices[0].type.toLowerCase() === 'coldcard'}<img class="image-wallet" align="center" src={coldcardLogo} alt="Coldcard" />{/if}
						{#if signedDevices[0].type.toLowerCase() === 'ledger'}<img class="image-wallet" align="center" src={ledgerVerticalLogo} alt="Ledger" />{/if}
						{#if signedDevices[0].type.toLowerCase() === 'trezor'}<img class="image-wallet" align="center" src={trezorLogo} alt="Trezor" />{/if}
					</div>
				{:else}
					<div class="card-title">
						<span class="icon is-primary is-normal has-no-hover"><img class="image-signature" src={signatureIcon} alt="Signature" /></span>
						<h2 class="title is-5 has-subtitle-margin is-capitalized">Add Signature 1</h2>
					</div>
					<p class="mb-4">Sign with your first hardware device</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							<ButtonDropDown
								dropdownText={dropdownTextWalletDevice}
								dropdownClass={'is-primary'}
								on:dropdownSelected={handleDeviceSelected}
								fullWidth
								options={selectableDevice}
							/>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="column mt-5">
		<div class="card signee">
			<div class="card-content is-fullheight has-text-centered">
				{#if signedDevices.length >= 2}
					<div class="card-title">
						<span class="icon is-primary is-normal has-no-hover"><img class="image-check" src={checkCircle} alt="Success check" /></span>
						<h2 class="title is-5 has-subtitle-margin is-capitalized">{signedDevices[1].model.replaceAll('_', ' ')}</h2>
					</div>
					<div class="device-logo">
						{#if signedDevices[1].type.toLowerCase() === 'coldcard'}<img class="image-wallet" align="center" src={coldcardLogo} alt="Coldcard" />{/if}
						{#if signedDevices[1].type.toLowerCase() === 'ledger'}<img class="image-wallet" align="center" src={ledgerVerticalLogo} alt="Ledger" />{/if}
						{#if signedDevices[1].type.toLowerCase() === 'trezor'}<img class="image-wallet" align="center" src={trezorLogo} alt="Trezor" />{/if}
					</div>
				{:else}
					<div class="card-title">
						<span class="icon is-primary is-normal has-no-hover"><img class="image-signature" src={signatureIcon} alt="Signature" /></span>
						<h2 class="title is-5 has-subtitle-margin is-capitalized">Add Signature 2</h2>
					</div>
					<p class="mb-4">Sign with your second hardware device</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							{#if signedDevices.length < 1}
								<Button
									text="Sign with your second hardware"
									buttonClass="is-primary"
									buttonDisabled
									title={signedDevices.length === 0 ? 'Sign with your first hardware wallet before' : ''}
								/>
							{:else}
								<ButtonDropDown
									dropdownText={dropdownTextWalletDevice}
									dropdownClass={'is-primary'}
									on:dropdownSelected={handleDeviceSelected}
									fullWidth
									options={selectableDevice}
								/>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.container-content {
		display: flex;
		justify-content: center;
		max-width: 1000px;
		margin-right: auto;
		margin-left: auto;
	}

	.card.signee {
		width: 440px;
		height: 410px;
		margin-right: auto;
		margin-left: auto;
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

	.image-signature,
	.image-check {
		margin-bottom: 2.125rem;
	}

	.card-bottom {
		padding-bottom: 1.525rem;
	}
</style>
