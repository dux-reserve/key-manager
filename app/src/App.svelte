<script>
	import dayjs from 'dayjs';
	import Router, { location, querystring } from 'svelte-spa-router';
	import { bitcoinTestnetNetwork, disableScroll, timeNow } from './store';
	import { routes } from './routes';

	// Set local time in the global store
	$timeNow = dayjs();

	const isDevelopment = process.env.NODE_ENV === 'development'; // Production UI by default
	$: title = $bitcoinTestnetNetwork
		? `Dux Reserve Key Manager ${isDevelopment ? '— DEV TESTNET — 0.3.0-beta' : 'Beta'}`
		: `Dux Reserve Key Manager ${isDevelopment ? '— DEV MAINNET — 0.3.0-beta' : 'Beta'}`;

	// Disable scrolling when there's an overlay
	// https://github.com/sveltejs/svelte/issues/3105
	$: scrollable = !$disableScroll;

	const mouseWheel = (node, options) => {
		let { scrollable } = options;

		const handler = e => {
			if (!scrollable && $location === '/dashboard') e.preventDefault();
		};

		node.addEventListener('wheel', handler, { passive: false });

		return {
			update(options) {
				scrollable = options.scrollable;
			},
			destroy() {
				node.removeEventListener('wheel', handler, { passive: false });
			},
		};
	};

	// Allow the developer to refresh the app with the testnet switch
	if (isDevelopment) {
		setTimeout(async () => {
			await window.api.ipcRenderer.invoke('config:switch-network', {
				testnet: $bitcoinTestnetNetwork,
			});
		}, 0);
	}
</script>

<svelte:window use:mouseWheel={{ scrollable }} />

<svelte:head>
	<title>{title}</title>

	{#if !scrollable}
		<style>
			html,
			body {
				overflow: hidden !important;
				overflow-x: hidden !important;
				overflow-y: hidden !important;
			}
		</style>
	{/if}
</svelte:head>

<main class:disable-scroll={!scrollable}>
	<Router {routes} />
</main>

{#if $bitcoinTestnetNetwork || isDevelopment}
	<div class="application-info">
		{#if $bitcoinTestnetNetwork}
			<div class="subtitle is-5 is-primary is-uppercase has-text-weight-normal to-the-moon" class:is-hidden={$location === '/dashboard'}>TESTNET</div>
		{/if}

		<!-- !! COMMENT FOR PRODUCTION !! -->
		{#if isDevelopment && $location !== '/'}
			<div class="dev-infos is-size-7">
				<div><strong class="mr-1">Present Path:</strong>{$location}</div>
				{#if $querystring}
					<div><strong class="ml-2 mr-1">Querystring:</strong>{$querystring}</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style lang="sass" global>
	@import 'app.sass'

	.application-info
		position: fixed
		bottom: 8px
		left: 9px
		z-index: 20
		.dev-infos
			display: flex
		.to-the-moon
			position: fixed
			top: 8px
</style>
