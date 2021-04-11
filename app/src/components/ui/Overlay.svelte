<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { disableScroll } from '../../store';

	export let disableClosing = false;
	export let subtitle = '';
	export let title = '';
	export let titleIsLeft = false;
	export let withSideMenu = false;

	const dispatch = createEventDispatcher();

	const closeIcon = './img/icons/ui/close.svg';

	const handleCloseOverlay = () => {
		if (!disableClosing) {
			dispatch('closeOverlayClicked');
		}
	};

	onMount(() => {
		$disableScroll = true;
	});

	onDestroy(() => {
		$disableScroll = false;
	});
</script>

<div class="overlay" subtitle class:with-side-menu={withSideMenu}>
	<div class="background" on:click={handleCloseOverlay} />
	<div class="card">
		<div class="card-content">
			<div class="card-title">
				{#if title}
					<h2
						class="title is-4 mb-3 is-family-primary is-capitalized-first-letter-only"
						class:has-text-left={titleIsLeft}
						class:has-text-centered={disableClosing && !titleIsLeft}
					>
						{title}
					</h2>
				{/if}
				{#if !disableClosing}
					<div class="icon" on:click={handleCloseOverlay}>
						<img src={closeIcon} alt="Close overlay icon" title={$_('overlay.icon_title', { default: 'Close overlay' })} />
					</div>
				{/if}
			</div>
			{#if subtitle}
				<p
					class="subtitle is-5 is-primary has-text-weight-bold is-capitalized-first-letter-only"
					class:has-text-left={titleIsLeft}
					class:has-text-centered={disableClosing && !titleIsLeft}
				>
					{subtitle}
				</p>
			{/if}

			<div>
				<slot />
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

		&.with-side-menu {
			left: 202px;

			.background {
				left: 202px;
			}
		}

		.card {
			z-index: 1000;
			overflow-x: hidden;
			overflow-y: auto;
			max-width: 98vw;
			max-height: 96vh;

			.card-title {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;

				.has-text-centered {
					width: 100%;
				}

				.icon {
					width: 1.25rem;
					height: auto;
					margin-left: 1rem;
				}
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
