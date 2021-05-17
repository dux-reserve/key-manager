<script>
	import { onMount } from 'svelte';
	import { replace } from 'svelte-spa-router';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import { withCustomUserPassword, configData, configsCurrentDataWalletsArray, configsCurrentDataVaultsArray, configSelectedCurrentData } from '../store';
	import Button from '../components/ui/Button.svelte';
	import Overlay from '../components/ui/OverlayV2.svelte';
	import HeroSocialFooter from '../components/ui/SocialFooter.svelte';

	export let withCustomPassword = false;

	const duxLogoWithText = './img/logos/dux-logo-with-text.svg';

	const lockIcon = './img/icons/ui/lock.svg';
	const warningIcon = './img/icons/ui/warning.svg';
	const showEye = './img/icons/ui/visibility.svg';
	const hideEye = './img/icons/ui/visibility-off.svg';

	let password = '';
	let wrongPassword = false;
	let showForgetOverlay = false;
	let showPlainPassword = false;

	const handleShowForgetOverlay = () => {
		showForgetOverlay = true;
	};

	const handleHideForgetOverlay = () => {
		showForgetOverlay = false;
	};

	const handleForgetCurrentConfig = () => {
		try {
			setTimeout(async () => {
				$configData = {};
				$configsCurrentDataWalletsArray = {};
				$configsCurrentDataVaultsArray = {};
				$configSelectedCurrentData = {};

				await window.api.ipcRenderer.invoke('config-data:delete-file');
				replace('/');
				showForgetOverlay = false;
			}, 0);
		} catch (error) {
			console.log('error when deleting current config file');
		}
	};

	const handlePasswordEnter = event => {
		password = event.target.value;
		if (password.length >= 1 && wrongPassword) wrongPassword = false;
	};

	const handleShowPassword = () => {
		showPlainPassword = !showPlainPassword;
	};

	const handleDecryptConfig = async () => {
		try {
			const decryptedConfig = await window.api.ipcRenderer.invoke('config:decrypt-config-file-with-user-password', {
				config: $configData,
				userPassword: password,
			});
			if ('version' in decryptedConfig && 'name' in decryptedConfig && 'wallets' in decryptedConfig && 'vaults' in decryptedConfig) {
				$configData = decryptedConfig;
				replace('/dashboard');
			} else {
				wrongPassword = true;
			}
		} catch (error) {
			wrongPassword = true;
			console.log('error on decrypting user file');
		}
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
			<div class="container">
				<div class="columns is-centered">
					<div class="column is-7">
						<div class="card">
							<div class="card-content is-fullheight">
								<div class="card-title has-text-centered">
									<span class="icon is-primary is-normal has-no-hover mr-3"><img class="image-key" src={lockIcon} alt="Key Icon" /></span>
									<h2 class="title is-4 has-subtitle-margin is-vertical-center has-text-centered is-justify-content-center">
										{$_('lockscreen.welcome', { default: 'Welcome back' })}
									</h2>
								</div>

								<div class="card-body mt-6 has-text-centered">
									{#if !$withCustomUserPassword}
										<div class="columns">
											<div class="column is-10 is-offset-1">
												<p>{$_('lockscreen.paragraph_unsecure', { default: 'You can now access your dashboard right away.' })}</p>
											</div>
										</div>

										<div class="buttons is-centered mt-6">
											<Button text={$_('lockscreen.button_enter', { default: 'Enter now' })} icon="arrowRight" buttonClass="is-primary" buttonLink="/dashboard" />
										</div>

										<p class="has-text-weight-normal" on:click={handleShowForgetOverlay}>
											<span class="has-text-grey-light  is-link">{$_('lockscreen.reset', { default: 'Reset account to new setup' })}</span>
										</p>
									{:else}
										<div class="columns">
											<div class="column is-10 is-offset-1">
												<div class="field">
													<label class="label" for="enterYourPassword"
														>{$_('lockscreen.enter_password', { default: 'Enter your password' })}
														{#if wrongPassword}
															<span class="subtitle is-6 has-text-weight-normal is-primary is-family-primary ml-2"
																>{$_('lockscreen.wrong_password', { default: 'Wrong password.' })}</span
															>
														{/if}</label
													>
													<div class="control">
														<input
															id="enterYourPassword"
															class="input"
															type={showPlainPassword ? 'text' : 'password'}
															placeholder="•••••••••"
															value={password}
															on:keyup={handlePasswordEnter}
															autofocus
														/>
														<span
															class="is-link input-inner-text"
															title={showPlainPassword
																? $_('lockscreen.show_plain_password_title_1', { default: 'Hide password' })
																: $_('lockscreen.show_plain_password_title_2', { default: 'Show password' })}
															on:click={handleShowPassword}
														>
															<span class="icon is-grey is-normal"><img src={showPlainPassword ? hideEye : showEye} alt="Eye Icon" /></span>
														</span>
													</div>
												</div>
											</div>
										</div>

										<div class="buttons is-centered mt-6">
											<Button
												text={$_('lockscreen.button_forgot', { default: 'Forgot password' })}
												buttonClass="is-primary is-outlined"
												on:buttonClicked={handleShowForgetOverlay}
											/>
											<Button
												text={$_('lockscreen.button_unlock', { default: 'Unlock' })}
												icon="arrowRight"
												buttonClass="is-primary"
												on:buttonClicked={handleDecryptConfig}
											/>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>

{#if showForgetOverlay}
	<Overlay titleIsLeft subtitle on:closeOverlayClicked={handleHideForgetOverlay}>
		<span slot="title">
			<h2 class="title is-4 mb-3 is-family-primary is-vertical-center">
				<span class="icon is-prussian-blue has-no-hover mr-2"><img src={warningIcon} alt="warningIcon" /></span>
				{$_('reset_overlay.title', { default: 'Reset your Dux Reserve app?' })}
			</h2>
		</span>
		<span slot="subtitle">{$_('reset_overlay.subtitle', { default: 'All saved accounts, wallets and vaults will be deleted from the app.' })}</span>
		<p class="has-text-justified">
			{$_('reset_overlay.paragraph', {
				default:
					"Dux Reserve cannot help you recover this information as we do not have it. No need to worry. It doesn't affect your bitcoin private keys as long as you have your hardware devices kept safe with their seed recovery backups. You will be able to create a new password on the Dux desktop app, and add your same devices to see your wallets and vaults once again.",
			})}
		</p>
		<div class="forget-overlay">
			<div class="buttons is-right mt-6">
				<Button text={$_('reset_overlay.button_yes', { default: 'Yes' })} buttonClass="is-primary is-outlined" on:buttonClicked={handleForgetCurrentConfig} />
				<Button text={$_('reset_overlay.button_no', { default: 'No' })} buttonClass="is-primary" on:buttonClicked={handleHideForgetOverlay} />
			</div>
		</div>
	</Overlay>
{/if}

<HeroSocialFooter />

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

			// .column {
			// 	width: 635px;
			// }
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

	.image-key {
		margin-bottom: 2.125rem;
	}

	.forget-overlay {
		min-width: 320px;
	}
</style>
