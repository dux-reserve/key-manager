<script>
	import { createEventDispatcher, onDestroy } from 'svelte';
	import Button from '../../components/ui/Button.svelte';

	export let trezorError = false;
	export let trezorLockPinKey = false;

	const dispatch = createEventDispatcher();

	const backspaceicon = './img/icons/ui/backspace.svg';

	let showSendPin = false;
	let currentPin = '';

	const replugTrezorDevice = () => {
		dispatch('replugTrezorDevice');
	};

	const handleSendPin = () => {
		dispatch('sendPin', {
			pin: currentPin,
		});

		setTimeout(() => {
			currentPin = '';
		}, 0);
	};

	const handleBackspaceCurrentPin = () => {
		if (currentPin.length >= 1) {
			const pin = currentPin.slice(0, -1);
			currentPin = pin;
		}
	};

	const handlePinChange = number => {
		// The PIN can be up to nine digits long
		if (currentPin.length < 9) {
			currentPin = currentPin + number;

			if (currentPin.length >= 1) {
				showSendPin = true;
			}
		}
	};

	onDestroy(() => {
		// That make sure the pin is empty when the view is destroy
		currentPin;
	});
</script>

<div class="pin-text-container">
	<div class="pin-text">
		{#if currentPin.length < 1 && !trezorLockPinKey && !trezorError}
			Please enter your PIN
		{:else if trezorError}
			<span class="is-invisible">x</span>
		{:else if currentPin.length < 1 && trezorLockPinKey}
			<span class="is-invisible">x</span>
		{:else}
			{#each { length: currentPin.length } as _}●{/each}
		{/if}
	</div>
	<span class="icon is-small icon-backspace" class:is-invisible={currentPin.length < 1} on:click={handleBackspaceCurrentPin}
		><img src={backspaceicon} alt="Backspace" /></span
	>
</div>
<div class="pin-dial">
	<div class="pin-dial-row">
		<button class="button dial-button" on:click={() => handlePinChange(7)} disabled={trezorLockPinKey || trezorError}>●</button><button
			class="button dial-button"
			on:click={() => handlePinChange(8)}
			disabled={trezorLockPinKey || trezorError}>●</button
		><button class="button dial-button" on:click={() => handlePinChange(9)} disabled={trezorLockPinKey || trezorError}>●</button>
	</div>

	<div class="pin-dial-row">
		<button class="button dial-button" on:click={() => handlePinChange(4)} disabled={trezorLockPinKey || trezorError}>●</button><button
			class="button dial-button"
			on:click={() => handlePinChange(5)}
			disabled={trezorLockPinKey || trezorError}>●</button
		><button class="button dial-button" on:click={() => handlePinChange(6)} disabled={trezorLockPinKey || trezorError}>●</button>
	</div>

	<div class="pin-dial-row">
		<button class="button dial-button" on:click={() => handlePinChange(1)} disabled={trezorLockPinKey || trezorError}>●</button><button
			class="button dial-button"
			on:click={() => handlePinChange(2)}
			disabled={trezorLockPinKey || trezorError}>●</button
		><button class="button dial-button" on:click={() => handlePinChange(3)} disabled={trezorLockPinKey || trezorError}>●</button>
	</div>
</div>
<div class="buttons is-centered mt-3">
	{#if trezorError}
		<Button text="I have unplugged and re-plugged my Trezor" buttonClass="button is-primary" on:buttonClicked={replugTrezorDevice} />
	{:else}
		<Button text="Enter PIN" buttonClass="button is-primary" on:buttonClicked={handleSendPin} buttonDisabled={!showSendPin || trezorLockPinKey} />
	{/if}
</div>

<style lang="scss">
	.button:focus {
		box-shadow: none !important;
	}

	.pin-text {
		text-align: center;
	}

	.icon-backspace {
		position: relative;
		top: -22px;
		left: 421px;

		&:active {
			transform: translateX(-1px);
		}
	}

	.pin-dial {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		margin-bottom: 2rem;

		.pin-dial-row {
			justify-content: space-between;

			.dial-button {
				width: 90px;
				height: 90px;
				padding: 20px;
				border: 1px solid #d5d5d5;
				border-radius: 1px;
				margin: 8px 8px 0 0;
				// background-color: lighten(#23262e, 7%);
				background-color: lighten(#d5d5d5, 7%);
				color: #23262e;
				font-size: 1.5rem;

				&:disabled {
					border: 1px solid darken(#d5d5d5, 20%);
					// background-color: darken(#23262e, 7%);
					background-color: darken(#d5d5d5, 21%);
					color: lighten(#23262e, 7%);
				}

				&:not(:disabled):active {
					border: 1px solid #d3d3d3;
					color: #1f2229;
				}

				&:not(:disabled):hover {
					border: 1px solid #d5d5d5;
					// background-color: lighten(#23262e, 12%);
					background-color: lighten(#d5d5d5, 12%);
					color: #3a3c44;
				}
			}
		}
	}
</style>
