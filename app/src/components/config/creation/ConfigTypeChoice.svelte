<script>
	import { _ } from 'svelte-i18n';
	import { createEventDispatcher, onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import Button from '../../ui/Button.svelte';

	const vaultIcon = './img/icons/ui/vault.svg';
	const walletIcon = './img/icons/ui/wallet.svg';
	const helpIcon = './img/icons/ui/help.svg';

	const dispatch = createEventDispatcher();

	const handleWalletSelected = () => {
		dispatch('walletSelected');
	};

	const handleVaultSelected = () => {
		dispatch('vaultSelected');
	};

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns has-text-centered is-centered is-multiline">
		<div class="column is-5">
			<div class="card">
				<div class="card-content is-fullheight">
					<div class="card-title">
						<h2 class="title is-4 has-subtitle-margin is-vertical-center has-text-centered is-justify-content-center mb-6">
							<span class="icon is-prussian-blue is-normal has-no-hover mr-3"><img class="image-key" src={walletIcon} alt="Wallet Icon" /></span
							>{$_('creation.choice.wallet_title', { default: 'Wallet' })}<span
								class="icon is-exposant ml-2 is-prussian-blue has-no-hover"
								data-tooltip={$_('creation.choice.wallet_tooltips', { default: 'Wallet' })}><img src={helpIcon} alt="help" /></span
							>
						</h2>
						<p class="subtitle is-5 is-primary has-text-weight-normal">{$_('creation.choice.wallet_subtitle', { default: 'Regular use for small amounts' })}</p>
					</div>
					<p class="mb-3">
						{$_('creation.choice.wallet_body', { default: 'Use your single hardware device for easy and secure key storage with transaction signing.' })}
					</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button
								text={$_('creation.choice.wallet_cta', { default: 'Create wallet' })}
								buttonClass="is-primary button-config-choice"
								icon="arrowRight"
								on:buttonClicked={handleWalletSelected}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-5">
			<div class="card">
				<div class="card-content is-fullheight">
					<div class="card-title">
						<h2 class="title is-4 has-subtitle-margin is-vertical-center has-text-centered is-justify-content-center mb-6">
							<span class="icon is-prussian-blue is-normal has-no-hover mr-3"><img class="image-key" src={vaultIcon} alt="Vault Icon" /></span
							>{$_('creation.choice.vault_title', { default: 'Vault' })}<span
								class="icon is-exposant ml-2 is-prussian-blue has-no-hover"
								data-tooltip={$_('creation.choice.vault_tooltips', { default: 'Vault' })}><img src={helpIcon} alt="help" /></span
							>
						</h2>
						<p class="subtitle is-5 is-primary has-text-weight-normal">{$_('creation.choice.vault_subtitle', { default: 'Long term for large holdings' })}</p>
					</div>
					<p class="mb-3">
						{$_('creation.choice.vault_body', { default: 'Use multiple hardware devices to secure your hodlings, manage your keys and sign transactions.' })}
					</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button
								text={$_('creation.choice.vault_cta', { default: 'Create vault' })}
								buttonClass="is-primary button-config-choice"
								icon="arrowRight"
								on:buttonClicked={handleVaultSelected}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.column {
		width: 490px;
	}

	.card {
		width: 464px;
		height: 388px;
		margin-right: auto;
		margin-left: auto;
	}

	[data-tooltip]::before {
		width: 474px;
	}
</style>
