<script>
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Button from '../../components/ui/Button.svelte';
	import Overlay from '../../components/ui/Overlay.svelte';

	export let secureExporting = false;

	const dispatch = createEventDispatcher();

	const lockIcon = './img/icons/ui/lock.svg';
	const showEye = './img/icons/ui/visibility.svg';
	const hideEye = './img/icons/ui/visibility-off.svg';

	let password = '';
	let wrongPassword = false;
	let showPlainPassword = false;

	const handlePasswordEnter = event => {
		if (event && event.target.value) {
			password = event.target.value;
		}
	};

	const handleShowPassword = () => {
		showPlainPassword = !showPlainPassword;
	};

	const handleVerifyPasswordValidity = async () => {
		try {
			const passwordIsValidity = await window.api.ipcRenderer.invoke('config:verify-password-validity', { password: password });

			if (passwordIsValidity) {
				wrongPassword = false;
				dispatch('passwordValid', password);
			} else {
				wrongPassword = true;
			}
		} catch (error) {
			wrongPassword = false;
		}
	};

	const handleCloseOverlay = () => {
		dispatch('closeOverlay');
	};
</script>

<Overlay title={$_('settings.overlay.verify_password.title', { default: 'Enter your password' })} on:closeOverlayClicked={handleCloseOverlay}>
	<div class="config-container">
		<div class="field password">
			<label class="label" for="enterYourPassword"
				>{$_('settings.overlay.verify_password.enter_password', { default: 'Enter your password' })}
				{#if wrongPassword}
					<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
						>{$_('settings.overlay.verify_password.wrong_password', { default: 'Wrong password.' })}</span
					>
				{/if}
			</label>
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
						? $_('settings.overlay.verify_password.show_plain_password_title_1', { default: 'Hide password' })
						: $_('settings.overlay.verify_password.show_plain_password_title_2', { default: 'Show password' })}
					on:click={handleShowPassword}
				>
					<span class="icon is-grey is-normal"><img src={showPlainPassword ? hideEye : showEye} alt="Eye Icon" /></span>
				</span>
			</div>
		</div>

		<div class="buttons is-right mt-5">
			<Button
				text={$_('settings.overlay.verify_password.button_cancel', { default: 'Cancel' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleCloseOverlay}
			/>
			<Button
				text={`${$_('settings.overlay.verify_password.button_export_1', { default: 'Export' })} ${
					secureExporting ? $_('settings.overlay.verify_password.button_export_2', { default: 'secure' }) : ''
				} ${$_('settings.overlay.verify_password.button_export_3', {
					default: 'config file',
				})}`}
				buttonClass="is-primary"
				buttonDisabled={password < 1}
				on:buttonClicked={handleVerifyPasswordValidity}
			/>
		</div>
	</div>
</Overlay>

<style>
	.config-container {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 780px;
		min-height: 300px;
	}

	.field.password {
		width: 400px;
		margin-top: 6.15rem;
		margin-right: auto;
		margin-left: auto;
	}
</style>
