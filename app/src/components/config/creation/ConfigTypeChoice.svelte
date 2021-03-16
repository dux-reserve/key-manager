<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import Button from '../../ui/Button.svelte';

	const vaultIcon = './img/icons/ui/vault.svg';
	const walletIcon = './img/icons/ui/wallet.svg';

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
							<span class="icon is-prussian-blue is-normal has-no-hover mr-3"><img class="image-key" src={walletIcon} alt="Wallet Icon" /></span>Wallet
						</h2>
						<p class="subtitle is-5 is-primary has-text-weight-normal">Regular use for small amounts</p>
					</div>
					<p class="mb-6">Use your single hardware device for easy and secure key storage with transaction signing.</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button text="Create Wallet" buttonClass="is-primary button-config-choice" icon="arrowRight" on:buttonClicked={handleWalletSelected} />
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
							<span class="icon is-prussian-blue is-normal has-no-hover mr-3"><img class="image-key" src={vaultIcon} alt="Vault Icon" /></span>Vault
						</h2>
						<p class="subtitle is-5 is-primary has-text-weight-normal">Long term for large holdings</p>
					</div>
					<p class="mb-6">Use multiple hardware devices to secure your hodlings, manage your keys and sign transactions.</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button text="Create Vault" buttonClass="is-primary button-config-choice" icon="arrowRight" on:buttonClicked={handleVaultSelected} />
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
</style>
