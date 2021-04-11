<script>
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { passwordStrength } from 'check-password-strength';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import Button from '../../ui/Button.svelte';
	import PasswordStrength from '../../ui/PasswordStrength.svelte';
	import { withCustomUserPassword } from '../../../store';

	export let newAdded = false;
	export let userPassword = '';

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

	let password = userPassword.length >= 1 ? userPassword : '';
	let confirmedPassword = '';
	let passwordDontMatch = false;
	let wrongPassword = false;
	let passwordTooWeak = false;
	let passwordStrongest = 0;
	let showPlainPassword = false;
	let showPlainPasswordConfirm = false;

	const handleVerifyPasswordStrongest = event => {
		if (event && event.target.value) {
			password = event.target.value;
		}

		passwordTooWeak = password.length >= 1 && password.length < 4;
		passwordStrongest = passwordStrength(password, passwordStrengthOptions).id;
		handlePasswordValidation();
	};

	const handlePasswordValidation = event => {
		if (event && event.target.value) {
			confirmedPassword = event.target.value;
		}
		passwordDontMatch = password !== confirmedPassword && password.length >= 1 && confirmedPassword.length >= 1;
	};

	const handleSkipPassword = () => {
		dispatch('skipPassword');
	};

	const handleCreatePassword = () => {
		passwordTooWeak = password.length < 4;
		passwordDontMatch = password !== confirmedPassword && password.length >= 1 && confirmedPassword.length >= 1;
		if (password.length >= 4 && !passwordTooWeak && !passwordDontMatch) {
			dispatch('createPassword', password);
		}
	};

	const handleEnterCurrentPassword = event => {
		if (event && event.target.value) {
			password = event.target.value;
		}
	};

	const handleVerifyPasswordValidity = async () => {
		try {
			const passwordIsValidity = await window.api.ipcRenderer.invoke('config:verify-password-validity', { password: password });

			if (passwordIsValidity) {
				wrongPassword = false;
				dispatch('confirmPassword', password);
			} else {
				wrongPassword = true;
			}
		} catch (error) {
			wrongPassword = false;
		}
	};

	const handleShowPassword = () => {
		showPlainPassword = !showPlainPassword;
	};

	const handleShowPasswordConfirm = () => {
		showPlainPasswordConfirm = !showPlainPasswordConfirm;
	};

	onMount(() => {
		animateScroll.scrollToTop();

		if (userPassword.length >= 1) {
			handleVerifyPasswordStrongest();
		}
	});

	onDestroy(() => {
		password;
		confirmedPassword;
	});
</script>

<div class="container">
	<div class="columns is-centered">
		<div class="column is-7">
			<div class="card">
				<div class="card-content is-fullheight">
					{#if newAdded && $withCustomUserPassword}
						<div class="card-title has-text-centered">
							<span class="icon is-primary is-normal has-no-hover mr-3"><img class="image-key" src={lockIcon} alt="Key Icon" /></span>
							<h2 class="title is-4 has-subtitle-margin is-vertical-center has-text-centered is-justify-content-center">
								{$_('creation.user_password.title_confirm_password', { default: 'Password lock (optional)' })}
							</h2>
							<p class="mb-5">
								{$_('creation.user_password.paragraph_confirm_password', {
									default:
										'Keep your Password safe. If you lose it, you will have to reset the Dux app and add your accounts all over again. It does not affect your bitcoin holdings.',
								})}
							</p>
						</div>
						<div class="card-body mt-1">
							<div class="columns">
								<div class="column is-10 is-offset-1">
									<div class="field">
										<label class="label" for="Password"
											>{$_('creation.user_password.enter_password', { default: 'Enter your Password' })}
											{#if wrongPassword}
												<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
													>{$_('creation.user_password.wrong_password', { default: 'Wrong password.' })}</span
												>
											{/if}</label
										>

										<div class="control">
											<input
												id="Password"
												class="input"
												type={showPlainPassword ? 'text' : 'password'}
												placeholder="•••••••••"
												value={password}
												on:keyup={handleEnterCurrentPassword}
												autofocus
											/>
											<span
												class="is-link input-inner-text"
												title={showPlainPassword
													? $_('creation.user_password.show_plain_password_title_1', { default: 'Hide password' })
													: $_('creation.user_password.show_plain_password_title_2', { default: 'Show password' })}
												on:click={handleShowPassword}
											>
												<span class="icon is-grey is-normal"><img src={showPlainPassword ? hideEye : showEye} alt="Eye Icon" /></span>
											</span>
										</div>
									</div>
								</div>
							</div>
							<div class="buttons is-right">
								<Button
									text={$_('creation.user_password.confirm_password', { default: 'Confirm' })}
									icon="arrowRight"
									buttonClass="is-primary"
									on:buttonClicked={handleVerifyPasswordValidity}
								/>
							</div>
						</div>
					{:else}
						<div class="card-title has-text-centered">
							<span class="icon is-primary is-normal has-no-hover mr-3"><img class="image-key" src={lockIcon} alt="Key Icon" /></span>
							<h2 class="title is-4 has-subtitle-margin is-vertical-center has-text-centered is-justify-content-center">
								{$_('creation.user_password.title_new_password', { default: 'Password lock (optional)' })}
							</h2>
							<p class="mb-5">
								{$_('creation.user_password.paragraph_new_password', {
									default:
										'Keep your Password safe. If you lose it, you will have to reset the Dux app and add your accounts all over again. It does not affect your bitcoin holdings.',
								})}
							</p>
						</div>
						<div class="card-body mt-1">
							<div class="columns">
								<div class="column is-10 is-offset-1">
									<div class="field">
										<label class="label" for="Password"
											>{$_('creation.user_password.enter_password', { default: 'Enter your Password' })}
											{#if passwordTooWeak}
												<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
													>{$_('creation.user_password.weak_password', { default: 'Minimum of 4 characters.' })}</span
												>
											{/if}</label
										>

										<div class="control">
											<input
												id="Password"
												class="input"
												type={showPlainPassword ? 'text' : 'password'}
												placeholder="•••••••••"
												value={password}
												on:keyup={handleVerifyPasswordStrongest}
												autofocus
											/>
											<span
												class="is-link input-inner-text"
												title={showPlainPassword
													? $_('creation.user_password.show_plain_password_title_1', { default: 'Hide password' })
													: $_('creation.user_password.show_plain_password_title_2', { default: 'Show password' })}
												on:click={handleShowPassword}
											>
												<span class="icon is-grey is-normal"><img src={showPlainPassword ? hideEye : showEye} alt="Eye Icon" /></span>
											</span>
										</div>
									</div>

									<PasswordStrength strengthId={passwordStrongest} isInvisible={password.length < 1} />

									<div class="field">
										<label class="label" for="confirmPassword"
											>{$_('creation.user_password.confirm_password', { default: 'Confirm your Password' })}
											{#if passwordDontMatch && password.length >= 4}
												<span class="subtitle is-6 has-text-weight-normal is-danger is-family-primary ml-2"
													>{$_('creation.user_password.match_password', { default: 'Password do not match.' })}</span
												>
											{/if}</label
										>
										<div class="control">
											<input
												id="confirmPassword"
												class="input"
												type={showPlainPasswordConfirm ? 'text' : 'password'}
												placeholder="•••••••••"
												value={confirmedPassword}
												on:keyup={handlePasswordValidation}
											/>
											<span
												class="is-link input-inner-text"
												title={showPlainPassword
													? $_('creation.user_password.show_plain_password_title_1', { default: 'Hide password' })
													: $_('creation.user_password.show_plain_password_title_2', { default: 'Show password' })}
												on:click={handleShowPasswordConfirm}
											>
												<span class="icon is-grey is-normal"><img src={showPlainPasswordConfirm ? hideEye : showEye} alt="Eye Icon" /></span>
											</span>
										</div>
									</div>
								</div>
							</div>
							<div class="buttons is-right">
								<Button
									text={$_('creation.user_password.button_maybe', { default: 'Maybe later' })}
									buttonClass="is-primary is-outlined"
									on:buttonClicked={handleSkipPassword}
								/>
								<Button
									text={$_('creation.user_password.button_create', { default: 'Create Password' })}
									icon="arrowRight"
									buttonClass="is-primary"
									buttonDisabled={passwordDontMatch || passwordTooWeak || password.length < 1 || confirmedPassword < 1}
									on:buttonClicked={handleCreatePassword}
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.card {
		min-height: 450px;
	}

	.image-key {
		margin-bottom: 2.125rem;
	}
</style>
