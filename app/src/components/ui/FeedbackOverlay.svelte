<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { disableScroll } from '../../store';
	import { timer } from '../../utils/helpers';
	import Button from './Button.svelte';

	const dispatch = createEventDispatcher();

	const Close = './img/icons/ui/close.svg';

	const userCommentLengthMinimum = 42;

	let disableClosing = false;
	let sendingFeedback = 0;
	let userComment = '';
	let encryptedFeedback = {};
	let userCommentTooShort = false;

	const handleCloseOverlay = () => {
		if (!disableClosing) {
			dispatch('closeOverlayClicked');
		}
	};

	const handleSendFeedback = () => {
		if (userComment.length >= userCommentLengthMinimum) {
			sendingFeedback = 0;
			disableClosing = true;
			userCommentTooShort = false;
			encryptFeedbackMessage();
		} else {
			userCommentTooShort = true;
		}
	};

	const handleUserCommentChanged = () => {
		if (userComment.length >= userCommentLengthMinimum) {
			userCommentTooShort = false;
		}
	};

	const encryptFeedbackMessage = async () => {
		try {
			sendingFeedback = 1;
			encryptedFeedback = await window.api.ipcRenderer.invoke('email:encrypt-with-pgp-keys', { feedback: userComment.toString() });
			if (encryptedFeedback.message_castlenine || encryptedFeedback.message_thib) {
				await timer(642);
				sendingFeedbackMessage();
			} else {
				disableClosing = false;
				sendingFeedback = -1;
			}
		} catch (error) {
			disableClosing = false;
			sendingFeedback = -1;
		}
	};

	const sendingFeedbackMessage = async () => {
		sendingFeedback = 2;
		try {
			const response = await window.api.ipcRenderer.invoke('email:send-encrypted-feedback', { encryptedMessage: encryptedFeedback });
			if (response === 'OK') {
				sendingFeedback = 3;
				disableClosing = false;
			} else {
				throw new Error('error on sending form');
			}
		} catch (error) {
			disableClosing = false;
			sendingFeedback = -1;
		}
	};

	onMount(() => {
		$disableScroll = true;
	});

	onDestroy(() => {
		$disableScroll = false;
	});
</script>

<div class="overlay">
	<div class="background" />
	<div class="card">
		<div class="card-content">
			<div>
				<div class="card-title has-text-left">
					<h2 class="title is-5 mb-3 is-family-primary">{$_('overlay_feedback.title', { default: 'Share your feedback' })}</h2>
					{#if !disableClosing}
						<div class="icon" on:click={handleCloseOverlay}>
							<img src={Close} alt="Close overlay icon" title={$_('overlay.icon_title', { default: 'Close overlay' })} />
						</div>
					{/if}
				</div>
				<p class="subtitle is-6 has-text-weight-bold">{$_('overlay_feedback.subtitle', { default: 'Help us make Dux better for you' })}</p>
				<p class="mt-5">
					{$_('overlay_feedback.paragraph_1', { default: 'What can we improve? Anything missing? Broken?' })}<br />{$_('overlay_feedback.paragraph_2', {
						default: 'Anything you’d like, we listen. All comments are encrypted.',
					})}
				</p>
			</div>
			<div>
				{#if sendingFeedback === 1}
					<p class="has-text-centered has-text-weight-normal">
						{$_('overlay_feedback.step_1', { default: 'Encrypting your feedback with our PGP Keys' })}
					</p>
				{:else if sendingFeedback === 2}
					<p class="has-text-centered has-text-weight-normal">
						{$_('overlay_feedback.step_2', { default: 'Sending your encrypted feedback' })}
					</p>
				{:else if sendingFeedback === 3}
					<p class="has-text-centered has-text-weight-normal">
						{$_('overlay_feedback.step_3', { default: 'Sent, thank you for your feedback :)' })}
					</p>
				{:else}
					{#if userCommentTooShort}
						<p class="has-text-left has-text-weight-normal has-text-danger">
							{$_('overlay_feedback.error_minimum', { default: 'Minimum of' })}
							{userCommentLengthMinimum}
							{$_('overlay_feedback.error_minimum_characters', { default: 'characters' })}
						</p>
					{/if}
					{#if sendingFeedback === -1}
						<p class="has-text-centered has-text-weight-normal has-text-danger">
							{$_('overlay_feedback.error_sending', { default: 'Error when sending your feedback, please try again' })}
						</p>
					{/if}
					<textarea
						id="userFeedback"
						class="textarea mt-1"
						placeholder={$_('overlay_feedback.textarea_placeholder', { default: 'Write your comments here' })}
						bind:value={userComment}
						on:input={handleUserCommentChanged}
						disabled={sendingFeedback >= 1}
					/>
				{/if}
			</div>
			<div class="buttons is-right mt-6">
				{#if sendingFeedback === 3}
					<Button text={$_('overlay_feedback.button_done', { default: 'Done' })} buttonClass="is-primary" on:buttonClicked={handleCloseOverlay} />
				{:else}
					<Button
						text={$_('overlay_feedback.button_back', { default: 'Back' })}
						buttonClass="is-primary is-outlined"
						buttonDisabled={sendingFeedback >= 1}
						on:buttonClicked={handleCloseOverlay}
					/>
					<Button
						text={$_('overlay_feedback.button_send', { default: 'Send feedback' })}
						buttonClass="is-primary"
						buttonDisabled={sendingFeedback >= 1}
						loading={sendingFeedback >= 1}
						on:buttonClicked={handleSendFeedback}
					/>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.overlay {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 10;
		display: flex;
		justify-content: center;
		align-items: center;

		.background {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 100;
			width: 100vw;
			height: 100vh;
			// background-color: rgba(0, 0, 0, 0.5);
			background-color: rgba(0, 0, 0, 0.42);
			background-size: cover;
			backdrop-filter: blur(3px);
		}

		.card {
			position: fixed;
			right: 46px;
			bottom: 48px;
			z-index: 1000;
			overflow-x: hidden;
			overflow-y: auto;
			width: 442px;
			max-width: 98vw;
			height: 542px;
			max-height: 85vh !important;

			.card-title {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;

				.icon {
					width: 1.25rem;
					height: auto;
					margin-left: 1rem;
				}
			}

			.card-content {
				display: flex;
				flex-direction: column;
				justify-content: space-between;
				height: 100%;
				padding: 2rem;
			}

			&::-webkit-scrollbar {
				width: 7.2px;
			}
			&::-webkit-scrollbar-track {
				border-top-right-radius: 10px;
				border-bottom-right-radius: 10px;
				background: transparent;
			}
			&::-webkit-scrollbar-thumb {
				border-radius: 10px;
				background: #4b4b4b;
			}
		}
	}
</style>
