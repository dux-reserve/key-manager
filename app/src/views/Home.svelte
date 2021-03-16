<script>
	import { onMount } from 'svelte';
	import * as animateScroll from 'svelte-scrollto';
	import { bitcoinTestnetNetwork } from '../store';
	import Button from '../components/ui/Button.svelte';
	import Overlay from '../components/ui/OverlayV2.svelte';
	import HeroSocialFooter from '../components/ui/SocialFooter.svelte';
	import ImportConfigFile from '../components/config/ImportConfigFile.svelte';
	import { replace } from 'svelte-spa-router';

	const duxLogoWithText = './img/logos/dux-logo-with-text.svg';

	let configDialogError = false;
	let configFileData = {};
	let showConfigFileOverlay = false;
	let showDisclamerOverlay = false;
	let useTestnet = $bitcoinTestnetNetwork;

	const openUrl = url => {
		window.api.ipcRenderer.invoke('os:open-url-with-browser', { url });
	};

	const openFileDialog = async () => {
		try {
			configFileData = await window.api.ipcRenderer.invoke('config:import-config-file-dialog');
			configDialogError = false;
			showConfigFileOverlay = true;
		} catch (error) {
			configFileData = {};
			configDialogError = true;

			if (error.message.includes('Canceled')) {
				showConfigFileOverlay = false;
			} else {
				showConfigFileOverlay = true;
			}
		}
	};

	const handleCloseConfigFileOverlay = () => {
		showConfigFileOverlay = false;
		configFileData = {};
	};

	const handleShowDisclaimer = () => {
		showDisclamerOverlay = true;
	};

	const handleCloseDisclaimer = () => {
		showDisclamerOverlay = false;
	};

	const handleAcceptDisclaimer = () => {
		showDisclamerOverlay = false;
		replace('/init-config');
	};

	const handleChangeNetwork = async () => {
		$bitcoinTestnetNetwork = !$bitcoinTestnetNetwork;
		useTestnet = $bitcoinTestnetNetwork;

		await window.api.ipcRenderer.invoke('config:switch-network', {
			testnet: $bitcoinTestnetNetwork,
		});
	};

	onMount(() => {
		animateScroll.scrollToTop();
	});
</script>

<section class="hero is-image">
	<div class="hero-body">
		<div class="logo-container">
			<img align="center" src={duxLogoWithText} alt="Dux Reserve Logo" />
		</div>
	</div>
</section>

<div class="container-fluid">
	<section class="hero top-hero">
		<div class="hero-body">
			<div class="columns is-centered">
				<div class="column is-5-desktop is-6-tablet">
					<div class="card">
						<div class="card-content is-fullheight has-text-centered">
							<div class="card-title">
								<h1 class="title is-2 mb-5-custom">
									Hold the keys
									<br />
									to your bitcoin
								</h1>
							</div>

							<p>
								Add a wallet or create a multisig vault to manage your bitcoin.
								<br />
								All keys are held by your <u title="Currently works with Coldcard, Ledger & Trezor. More to come!">hardware devices</u>, in your own control.
							</p>

							<div class="card-bottom">
								<div class="buttons is-centered mt-6">
									<Button text="Get Started" icon="arrowRight" buttonClass="is-primary" on:buttonClicked={handleShowDisclaimer} />
								</div>
								<p class="has-space-after-button">
									Already have a vault or a wallet?
									<span class="is-link has-text-weight-bold" on:click={openFileDialog}>Import your config file</span>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>

<HeroSocialFooter />

{#if showConfigFileOverlay}
	<ImportConfigFile {configFileData} {configDialogError} on:closeConfigFileOverlay={handleCloseConfigFileOverlay} />
{/if}

{#if showDisclamerOverlay}
	<Overlay titleIsLeft disableClosing subtitle>
		<span slot="title"
			>Beta version (0.3.0)
			<div
				class="field switch-testnet"
				title="Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin (BTC). Compatible with all hardware devices"
			>
				<input
					id="switchTestnet"
					type="checkbox"
					name="switchTestnet"
					class="switch is-small is-rtl"
					bind:checked={useTestnet}
					on:change={handleChangeNetwork}
				/>
				<label for="switchTestnet">Use Testnet</label>
			</div>
		</span>
		<div class="disclaimer-overlay">
			<p>Only use with small amounts of bitcoin or use testnet.</p>
			<p class="mt-2 has-text-justified">
				This software is in beta. It's thoughtfully tested and secure, but expect hickups here and there. You can also change the Bitcoin network to {$bitcoinTestnetNetwork
					? 'mainnet'
					: 'testnet'}. We will share updates on
				<span class="is-link has-text-weight-normal" on:click={() => openUrl('twitter')} title="https://twitter.com/duxreserve">Twitter</span>
				as we make improvements and find bugs.
			</p>
			<p class="mt-2">
				Our application is free and <span title="MIT license">open source</span> so you can also
				<span class="is-link has-text-weight-normal" on:click={() => openUrl('github')} title="https://github.com/dux-reserve">take a look and contribute</span
				>.
			</p>
			<div class="buttons is-right mt-6">
				<Button text="I'll just wait" buttonClass="is-primary is-outlined" on:buttonClicked={handleCloseDisclaimer} />
				<Button text="Ok, makes sense" buttonClass="is-primary" icon="arrowRight" on:buttonClicked={handleAcceptDisclaimer} />
			</div>
		</div>
	</Overlay>
{/if}

<style lang="scss">
	.hero {
		&.is-image {
			.hero-body {
				display: flex;
				justify-content: center;
				padding-top: 3.125rem;
				padding-bottom: 1.5rem;
			}

			img {
				width: 141px;
			}
		}

		&.top-hero {
			.hero-body {
				padding-top: 2rem;
				padding-bottom: 2rem;
			}

			.column {
				width: 577px;
			}
		}
	}

	.switch-testnet {
		position: absolute;
		top: 45px;
		right: 52px;
	}

	.container-fluid {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		min-height: calc(100vh - 307px);
	}

	.has-space-after-button {
		margin-top: 1.75rem;
		font-size: 0.9825rem;
	}

	.mb-5-custom {
		margin-bottom: 1.65rem !important;
	}

	.disclaimer-overlay {
		max-width: 780px;
	}
</style>
