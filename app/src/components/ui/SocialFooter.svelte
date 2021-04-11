<script>
	import { _ } from 'svelte-i18n';
	import { applicationSettings } from '../../store';
	export let hideLogo = false;

	const duxLogoText = './img/logos/dux-text.svg';

	const openUrl = url => {
		window.api.ipcRenderer.invoke('os:open-url-with-browser', { url });
	};
</script>

<footer class="footer has-text-centered">
	<p class="is-size-7">
		{$_('footer.news', { default: 'For the latest news, follow us on' })}
		<span class="is-link" on:click={() => openUrl('twitter')} title="https://twitter.com/duxreserve">Twitter</span>. {$_('footer.verify', {
			default: `Don't trust, verify on`,
		})}
		<span class="is-link" on:click={() => openUrl('github')} title="https://github.com/dux-reserve">Github</span>. {$_('footer.support', {
			default: 'Get support on',
		})}
		<span
			class="is-link"
			on:click={() => openUrl(`telegram${$applicationSettings.interfaceLanguage === 'fr' ? '-fr' : ''}`)}
			title={$applicationSettings.interfaceLanguage === 'fr' ? 'https://t.me/DuxReserveFR' : 'https://t.me/DuxReserve'}>Telegram</span
		>.
	</p>

	<div class="red-bar" />

	{#if !hideLogo}
		<div class="logo-container">
			<img class="logo-with-text" src={duxLogoText} alt="Dux Reserve logo" on:click={() => openUrl('homepage')} title="https://duxreserve.com/" /><span
				class="exposant logo has-text-primary">beta</span
			>
		</div>
	{/if}
</footer>

<style lang="scss">
	.footer {
		margin-top: 3rem;
		margin-bottom: 1.25rem;

		p {
			margin-bottom: 1.5rem;
		}

		.red-bar {
			width: 80px;
			height: 1px;
			margin-right: auto;
			margin-left: auto;
			background-color: #c3283d;
		}

		.logo-container {
			padding-left: 18px;

			.logo-with-text {
				width: auto;
				height: 15px;
				margin-top: 1.5rem;
				margin-bottom: 0.5rem;

				&:hover {
					opacity: 0.85;
					cursor: pointer;
				}
			}
		}
	}
</style>
