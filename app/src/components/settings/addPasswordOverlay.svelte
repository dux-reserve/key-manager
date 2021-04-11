<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { passwordStrength } from 'check-password-strength';
	import { _ } from 'svelte-i18n';
	import { configData, withCustomUserPassword } from '../../store';
	import Button from '../ui/Button.svelte';
	import Overlay from '../ui/Overlay.svelte';
	import PasswordStrength from '../ui/PasswordStrength.svelte';

	const dispatch = createEventDispatcher();

	const lockIcon = './img/icons/ui/lock.svg';
	const showEye = './img/icons/ui/visibility.svg';
	const hideEye = './img/icons/ui/visibility-off.svg';

	const passwordStrengthOptions = [
		{
			id: 0,
			value: 'Too weak',
			minDiversity: 0,
			minLength: 0,
		},
		{
			id: 1,
			value: 'Weak',
			minDiversity: 1,
			minLength: 4,
		},
		{
			id: 2,
			value: 'Medium',
			minDiversity: 1,
			minLength: 8,
		},
		{
			id: 3,
			value: 'Safe',
			minDiversity: 2,
			minLength: 8,
		},
		{
			id: 4,
			value: 'Strong',
			minDiversity: 3,
			minLength: 12,
		},
	];

	let newPassword = '';
	let confirmedNewPassword = '';
	let passwordDontMatch = false;
	let passwordStrongest = 0;
	let passwordTooWeak = false;
	let lockButton = false;
	let showPlainNewPassword = false;
	let showPlainNewPasswordConfirm = false;

	const handleShowNewPassword = () => {
		showPlainNewPassword = !showPlainNewPassword;
	};

	const handleShowNewPasswordConfirm = () => {
		showPlainNewPasswordConfirm = !showPlainNewPasswordConfirm;
	};

	const handleVerifyNewPasswordStrongest = event => {
		if (event && event.target.value) {
			newPassword = event.target.value;
		}

		passwordTooWeak = newPassword.length >= 1 && newPassword.length < 4;
		passwordStrongest = passwordStrength(newPassword, passwordStrengthOptions).id;
		handlePasswordValidation();
	};

	const handlePasswordValidation = event => {
		if (event && event.target.value) {
			confirmedNewPassword = event.target.value;
		}
		passwordDontMatch = newPassword !== confirmedNewPassword && newPassword.length >= 1 && confirmedNewPassword.length >= 1;
	};

	const handleChangePassword = () => {
		if (!passwordDontMatch && !passwordTooWeak) {
			exportNewConfigEncryptedConfigFile();
		}
	};

	const exportNewConfigEncryptedConfigFile = async () => {
		lockButton = true;
		const exported_config = {
			...$configData,
		};

		try {
			await window.api.ipcRenderer.invoke('config:export-encrypted-config-file-dialog', { exported_config, userPassword: newPassword });
			$withCustomUserPassword = true;
			await window.api.ipcRenderer.invoke('config:create-file', { data: $configData, withCustomPassword: $withCustomUserPassword, userPassword: newPassword });
			handleCloseOverlay();
			lockButton = false;
		} catch (error) {
			console.log('exporting failed');
		}
	};

	const handleCloseOverlay = () => {
		dispatch('closeOverlay');
	};
</script>

<Overlay
	title={$_('settings.overlay.add_password.title', { default: 'Add a password' })}
	subtitle={$_('settings.overlay.add_password.subtitle', { default: 'All account(s), wallet(s), vault(s) will be secured and your config file exported' })}
	on:closeOverlayClicked={handleCloseOverlay}
>
	<div class="config-container">
		<div class="password-form mt-4">
			<div class="field password">
				<label class="label" for="Password"
					>{$_('settings.overlay.add_password.enter_password', { default: 'Enter your password' })}
					{#if passwordTooWeak}
						<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
							>{$_('settings.overlay.add_password.password_minimum', { default: 'Minimum of 4 characters' })}.</span
						>
					{/if}</label
				>

				<div class="control">
					<input
						id="Password"
						class="input"
						type={showPlainNewPassword ? 'text' : 'password'}
						placeholder="•••••••••"
						value={newPassword}
						on:keyup={handleVerifyNewPasswordStrongest}
						autofocus
					/>
					<span
						class="is-link input-inner-text"
						title={showPlainNewPassword
							? $_('settings.overlay.add_password.show_plain_password_title_1', { default: 'Hide password' })
							: $_('settings.overlay.add_password.show_plain_password_title_2', { default: 'Show password' })}
						on:click={handleShowNewPassword}
					>
						<span class="icon is-grey is-normal"><img src={showPlainNewPassword ? hideEye : showEye} alt="Eye Icon" /></span>
					</span>
				</div>
			</div>

			<div class="password-strength">
				<PasswordStrength strengthId={passwordStrongest} isInvisible={newPassword.length < 1} />
			</div>

			<div class="field password">
				<label class="label" for="confirmPassword"
					>Confirm your password {#if passwordDontMatch && newPassword.length >= 4}
						<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
							>{$_('settings.overlay.add_password.password_dont_match', { default: 'Password do not match' })}.</span
						>
					{/if}</label
				>
				<div class="control">
					<input
						id="confirmPassword"
						class="input"
						type={showPlainNewPasswordConfirm ? 'text' : 'password'}
						placeholder="•••••••••"
						value={confirmedNewPassword}
						on:keyup={handlePasswordValidation}
					/>
					<span
						class="is-link input-inner-text"
						title={showPlainNewPasswordConfirm
							? $_('settings.overlay.add_password.show_plain_password_title_1', { default: 'Hide password' })
							: $_('settings.overlay.add_password.show_plain_password_title_2', { default: 'Show password' })}
						on:click={handleShowNewPasswordConfirm}
					>
						<span class="icon is-grey is-normal"><img src={showPlainNewPasswordConfirm ? hideEye : showEye} alt="Eye Icon" /></span>
					</span>
				</div>
			</div>
		</div>

		<div class="buttons is-right mt-5">
			<Button
				text={$_('settings.overlay.add_password.button_cancel', { default: 'Cancel' })}
				buttonClass="is-primary is-outlined"
				on:buttonClicked={handleCloseOverlay}
			/>
			<Button
				text={$_('settings.overlay.add_password.button_add', { default: 'Add password' })}
				buttonClass="is-primary"
				buttonDisabled={newPassword.length < 1 || confirmedNewPassword.length < 1 || passwordDontMatch || passwordTooWeak || lockButton}
				on:buttonClicked={handleChangePassword}
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

	.field.password,
	.password-strength {
		width: 400px;
		margin-right: auto;
		margin-left: auto;
	}
</style>
