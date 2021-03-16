<script>
	import { onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import dayjs from 'dayjs';
	import { configData } from '../../../store';

	export let configName = '';
	export let importedDevices = [];
	export let walletType = 'single';

	const checkCircle = './img/icons/ui/check-circle.svg';
	const keyIcon = './img/icons/ui/single-key.svg';
	const walletIcon = './img/icons/ui/wallet.svg';
	const vaultIcon = './img/icons/ui/vault.svg';

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns has-text-left is-centered">
		<div class="column is-10">
			<div class="card mb-6">
				<div class="card-content is-fullheight has-smaller-padding-bottom">
					<div class="card-body">
						<div class="columns">
							<div class="column is-8">
								<h1 class="subtitle has-smaller-margin is-4 is-primary has-text-weight-bold is-capitalized">
									{configName}
								</h1>
								<h2 class="title is-family-primary is-5 has-smaller-margin">
									Created on {dayjs(
										walletType === 'single'
											? $configData.wallets[$configData.wallets.length - 1].created_at
											: $configData.vaults[$configData.vaults.length - 1].created_at,
									).format('dddd[,] MMMM DD[,] YYYY')}
								</h2>
								<div class="key-list">
									{#each importedDevices as { type, fingerprint }}
										<div class="key-id">
											<span class="icon is-prussian-blue has-no-hover mr-3"><img src={keyIcon} alt="Key icon" /></span>
											<p class="is-size-5 has-text-left is-capitalized">
												{#if type === 'coldcard'}Coldcard{:else if type === 'ledger'}Ledger{:else if type === 'trezor'}Trezor{/if}

												(<span class="is-uppercase" title="Device unique fingerprint">{fingerprint}</span>)
											</p>
										</div>
									{/each}
								</div>
							</div>
							<div class="column is-4">
								<p class="is-size-5 is-vertical-center has-text-centered config-icon">
									{#if walletType === 'multi'}
										<span class="icon is-prussian-blue has-no-hover mr-2"><img src={vaultIcon} alt="Vault icon" /></span>Vault
									{:else}
										<span class="icon is-prussian-blue has-no-hover mr-2"><img src={walletIcon} alt="Wallet icon" /></span>Wallet
									{/if}
								</p>
								<div class="check-circle has-text-centered">
									<span class="icon is-primary has-no-size has-no-hover"><img src={checkCircle} alt="Success check" /></span>
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
		width: 860px;
		min-height: 330px;
		margin-right: auto;
		margin-left: auto;
	}

	.key-list {
		margin-top: 2.8125rem;
		.key-id {
			display: flex;
			align-items: center;
			margin-top: 0.42rem;
		}
	}

	.config-icon {
		display: flex;
		justify-content: center;
	}

	.check-circle {
		justify-content: space-around;
		margin-top: 3.5rem;

		img {
			width: 121px;
		}
	}
</style>
