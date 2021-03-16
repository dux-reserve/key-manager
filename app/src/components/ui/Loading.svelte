<script>
	import LoadingDots from './LoadingDots.svelte';

	export let dontShowLogo = false;
	export let logoIsWhite = false;
	export let text = '';

	const logo = './img/logos/logo.svg';
	const logoWhite = './img/logos/logo-white.svg';
</script>

<div class="container-fluid">
	{#if !dontShowLogo}
		<div class="logo"><img align="center" src={logoIsWhite ? logoWhite : logo} alt="Loading Logo" /></div>
	{/if}

	<div class="loading">
		<LoadingDots />
	</div>

	{#if text.length >= 1}
		<p class="title is-size-6 has-text-weight-semibold has-text-centered">{text}</p>
	{/if}
</div>

<style lang="scss">
	.container-fluid {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		padding: 2rem 1rem;

		.logo {
			margin-bottom: 0.75rem;

			img {
				width: 42px;
				height: auto;
			}
		}

		.loading {
			margin-bottom: 0.821rem;
		}
	}
</style>
