<script>
	import { _ } from 'svelte-i18n';
	export let signedDevices = [];

	const checkCircle = './img/icons/ui/check-circle.svg';
	const coldcardLogo = './img/logos/coldcard.png';
	const ledgerVerticalLogo = './img/logos/ledger-vertical.png';
	const trezorLogo = './img/logos/trezor.png';
</script>

{#if signedDevices.length >= 2}
	<div class="container-content">
		<div class="column mt-5">
			<div class="card">
				<div class="card-content is-fullheight has-text-centered">
					<div class="card-title">
						<span class="icon is-primary is-normal has-no-hover"><img class="image-check" src={checkCircle} alt="Success check" /></span>
						<h2 class="title is-5 has-subtitle-margin is-capitalized">{signedDevices[0].model.replaceAll('_', ' ')}</h2>
					</div>
					<div class="device-logo">
						{#if signedDevices[0].type.toLowerCase() === 'coldcard'}<img class="image-wallet" align="center" src={coldcardLogo} alt="Coldcard" />{/if}
						{#if signedDevices[0].type.toLowerCase() === 'ledger'}<img class="image-wallet" align="center" src={ledgerVerticalLogo} alt="Ledger" />{/if}
						{#if signedDevices[0].type.toLowerCase() === 'trezor'}<img class="image-wallet" align="center" src={trezorLogo} alt="Trezor" />{/if}
					</div>
					<div class="card-bottom">
						<p
							class="is-uppercase has-text-weight-medium mt-5 mb-2"
							title={$_('withdraw.confirm_transaction.device_fingerprint_title', { default: 'Device unique fingerprint' })}
						>
							{signedDevices[0].fingerprint}
						</p>
					</div>
				</div>
			</div>
		</div>

		<div class="column mt-5">
			<div class="card">
				<div class="card-content is-fullheight has-text-centered">
					<div class="card-title">
						<span class="icon is-primary is-normal has-no-hover"><img class="image-check" src={checkCircle} alt="Success check" /></span>
						<h2 class="title is-5 has-subtitle-margin is-capitalized">{signedDevices[1].model.replaceAll('_', ' ')}</h2>
					</div>
					<div class="device-logo">
						{#if signedDevices[1].type.toLowerCase() === 'coldcard'}<img class="image-wallet" align="center" src={coldcardLogo} alt="Coldcard" />{/if}
						{#if signedDevices[1].type.toLowerCase() === 'ledger'}<img class="image-wallet" align="center" src={ledgerVerticalLogo} alt="Ledger" />{/if}
						{#if signedDevices[1].type.toLowerCase() === 'trezor'}<img class="image-wallet" align="center" src={trezorLogo} alt="Trezor" />{/if}
					</div>
					<div class="card-bottom">
						<p
							class="is-uppercase has-text-weight-medium mt-5 mb-2"
							title={$_('withdraw.confirm_transaction.device_fingerprint_title', { default: 'Device unique fingerprint' })}
						>
							{signedDevices[1].fingerprint}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="column is-4 is-centered is-offset-4 mt-5">
		<div class="card signee">
			<div class="card-content is-fullheight has-text-centered">
				<div class="card-title">
					<span class="icon is-primary is-normal has-no-hover"><img class="image-check" src={checkCircle} alt="Success check" /></span>
					<h2 class="title is-5 has-subtitle-margin is-capitalized">{signedDevices[0].model.replaceAll('_', ' ')}</h2>
				</div>
				<div class="device-logo">
					{#if signedDevices[0].type.toLowerCase() === 'coldcard'}<img class="image-wallet" align="center" src={coldcardLogo} alt="Coldcard" />{/if}
					{#if signedDevices[0].type.toLowerCase() === 'ledger'}<img class="image-wallet" align="center" src={ledgerVerticalLogo} alt="Ledger" />{/if}
					{#if signedDevices[0].type.toLowerCase() === 'trezor'}<img class="image-wallet" align="center" src={trezorLogo} alt="Trezor" />{/if}
				</div>
				<div class="card-bottom">
					<p
						class="is-uppercase has-text-weight-medium mt-5 mb-2"
						title={$_('withdraw.confirm_transaction.device_fingerprint_title', { default: 'Device unique fingerprint' })}
					>
						{signedDevices[0].fingerprint}
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.container-content {
		display: flex;
		justify-content: center;
		max-width: 1000px;
		margin-right: auto;
		margin-left: auto;
	}

	.card {
		width: 440px;
		height: 410px;
		margin-right: auto;
		margin-left: auto;
	}

	.card.signee {
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
