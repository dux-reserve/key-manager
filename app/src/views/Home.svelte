<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import { applicationSettings, bitcoinTestnetNetwork } from '../store';
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
				<div class="column is-6-desktop is-7-tablet">
					<div class="card">
						<div class="card-content is-fullheight has-text-centered">
							<div class="card-title">
								<h1 class="title is-2 mb-5-custom">
									{$_('home.headline_line_1', { default: 'Hold the keys' })}
									<br />
									{$_('home.headline_line_2', { default: 'to your bitcoin' })}
								</h1>
							</div>

							<p>
								{$_('home.intro_body_line_1', { default: 'Add a wallet or create multisig vault to manage your bitcoin.' })}
								<br />
								{$_('home.intro_body_line_2', { default: 'All keys are held by your' })}
								<u data-tooltip={$_('home.intro_body_line_2_cta_title', { default: 'Currently compatible with Coldcard, Ledger & Trezor. More to come!' })}>
									{$_('home.intro_body_line_2_cta', { default: 'hardware devices' })}</u
								>{$_('home.intro_body_line_2_1', { default: ', in your own control.' })}
							</p>

							<div class="card-bottom mt-4">
								<div class="buttons is-centered mt-6">
									<Button text={$_('home.button', { default: 'Get started' })} icon="arrowRight" buttonClass="is-primary" on:buttonClicked={handleShowDisclaimer} />
								</div>
								<p class="has-space-after-button">
									{$_('home.config', { default: 'Already have a vault or a wallet?' })}
									<span class="is-link has-text-weight-bold" on:click={openFileDialog}>{$_('home.config_cta', { default: 'Import your config file' })}</span>
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
			>{$_('disclaimer.title', { default: 'Beta version' })} (0.4.2)
			<div
				class="field switch-testnet"
				title={$_('settings.testnet_title', {
					default: 'Only for testing and development using test bitcoin (tBTC) instead of actual bitcoin (BTC). Compatible with all hardware devices',
				})}
			>
				<input id="switchTestnet" type="checkbox" name="switchTestnet" class="switch is-small is-rtl" bind:checked={useTestnet} on:change={handleChangeNetwork} />
				<label for="switchTestnet">{$_('settings.testnet', { default: 'Use Testnet' })}</label>
			</div>
		</span>
		<div class="disclaimer-overlay">
			<p>{$_('disclaimer.paragraph_1', { default: 'Only use with small amounts of bitcoin or use testnet.' })}</p>
			<p class="mt-2 has-text-justified">
				{$_('disclaimer.paragraph_2', {
					default: "This software is in beta. It's thoughtfully tested and secure, but expect hiccups here and there. You can also change the Bitcoin network to",
				})}
				{$bitcoinTestnetNetwork ? 'mainnet' : 'testnet'}. {$_('disclaimer.paragraph_3', {
					default: 'We will share updates on',
				})}
				<span
					class="is-link has-text-weight-normal"
					on:click={() => openUrl(`twitter${$applicationSettings.interfaceLanguage === 'fr' ? '-fr' : ''}`)}
					title={$applicationSettings.interfaceLanguage === 'fr' ? 'https://t.me/https://twitter.com/FR_DUX' : 'https://twitter.com/duxreserve'}>Twitter</span
				>
				{$_('disclaimer.paragraph_4', { default: 'as we make improvements and find bugs.' })}
			</p>
			<p class="mt-2">
				{$_('disclaimer.paragraph_5', { default: 'Our application is free and open source so you can also' })}
				<span class="is-link has-text-weight-normal" on:click={() => openUrl('github')} title="https://github.com/dux-reserve"
					>{$_('disclaimer.paragraph_6', { default: 'take a look and contribute' })}</span
				>.
			</p>
			<div class="buttons is-right mt-6">
				<Button text={$_('disclaimer.button_back', { default: "I'll just wait" })} buttonClass="is-primary is-outlined" on:buttonClicked={handleCloseDisclaimer} />
				<Button
					text={$_('disclaimer.button_ok', { default: 'Ok, makes sense' })}
					buttonClass="is-primary"
					icon="arrowRight"
					on:buttonClicked={handleAcceptDisclaimer}
				/>
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
				width: 635px;
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

	[data-tooltip]::before {
		width: 250px;
	}
</style>
