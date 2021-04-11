<script>
	import { createEventDispatcher } from 'svelte';
	import { push, replace } from 'svelte-spa-router';

	export let buttonClass = '';
	export let buttonDisabled = false;
	export let buttonLink = '';
	export let buttonLinkPushed = false;
	export let icon = '';
	export let loading = false;
	export let text = 'OK';
	export let title = '';

	const dispatch = createEventDispatcher();

	const archive = './img/icons/ui/archive.svg';
	const arrowBack = './img/icons/ui/long-arrow-left.svg';
	const autoRenew = './img/icons/ui/autorenew.svg';
	const deposit = './img/icons/ui/deposit.svg';
	const goToWeb = './img/icons/ui/open-in-browser.svg';
	const launch = './img/icons/ui/launch.svg';
	const longArrowRight = './img/icons/ui/long-arrow-right.svg';
	const refresh = './img/icons/ui/refresh.svg';
	const topRightArrow = './img/icons/ui/arrow-upward.svg';
	const unarchive = './img/icons/ui/unarchive.svg';
	const uploadFile = './img/icons/ui/arrow-circle-up.svg';
	const web = './img/icons/ui/web.svg';
	const withdraw = './img/icons/ui/withdraw.svg';
	const lock = './img/icons/ui/lock.svg';

	const handleClick = () => {
		// The replace(url) method navigates to a new page, but without adding a new entry in the browser's history stack
		if (!loading) {
			if (buttonLink && buttonLinkPushed) {
				push(buttonLink);
			} else if (buttonLink && !buttonLinkPushed) {
				replace(buttonLink);
			} else {
				dispatch('buttonClicked');
			}
		}
	};
</script>

<button type="button" class="button {buttonClass}" class:is-loading={loading} {title} disabled={buttonDisabled} on:click|preventDefault={handleClick}>
	{#if !loading}
		{#if icon === 'uploadFile-left'}
			<span
				class="icon is-normal has-no-hover icon-padding-left"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={uploadFile} alt="Upload File" />
			</span>
			<span class:mr-1={!buttonClass.includes('is-small')} />
		{/if}
		{#if icon === 'archive-left'}
			<span
				class="icon is-normal has-no-hover icon-padding-left"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={archive} alt="Archive" />
			</span>
			<span class:mr-1={!buttonClass.includes('is-small')} />
		{/if}
		{#if icon === 'unarchive-left'}
			<span
				class="icon is-normal has-no-hover icon-padding-left"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={unarchive} alt="Unarchive" />
			</span>
			<span class:mr-1={!buttonClass.includes('is-small')} />
		{/if}
		{#if icon === 'lock-left'}
			<span
				class="icon is-normal has-no-hover icon-padding-left"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={lock} alt="Lock" />
			</span>
			<span class:mr-1={!buttonClass.includes('is-small')} />
		{/if}
		{#if icon === 'arrowBack' || icon === 'arrowLeft' || icon === 'back'}
			<span
				class="icon is-normal has-no-hover"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={arrowBack} alt="Back" />
			</span>
			<span class:mr-1={!buttonClass.includes('is-small')} />
		{/if}
	{/if}

	<span class="button-text">{text}</span>

	{#if !loading}
		{#if icon === 'uploadFile-right'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover icon-padding-left"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={uploadFile} alt="Upload File" />
			</span>
		{/if}
		{#if icon === 'archive-right'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover icon-padding-left"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={archive} alt="Archive" />
			</span>
		{/if}
		{#if icon === 'unarchive-right'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover icon-padding-left"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={unarchive} alt="Unarchive" />
			</span>
		{/if}
		{#if icon === 'lock-right'}
			<span
				class="icon is-normal has-no-hover icon-padding-left"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={lock} alt="Lock" />
			</span>
			<span class:mr-1={!buttonClass.includes('is-small')} />
		{/if}
		{#if icon === 'arrowNext' || icon === 'arrowRight' || icon === 'next'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={longArrowRight} alt="Next" />
			</span>
		{/if}
		{#if icon === 'topRightArrow'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover icon-top-right-arrow"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={topRightArrow} alt="Go to" />
			</span>
		{/if}
		{#if icon === 'autoRenew'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={autoRenew} alt="Autorenew" />
			</span>
		{/if}
		{#if icon === 'refresh'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={refresh} alt="Refresh" />
			</span>
		{/if}
		{#if icon === 'launch'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={launch} alt="Launch" />
			</span>
		{/if}
		{#if icon === 'deposit'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={deposit} alt="Deposit" />
			</span>
		{/if}
		{#if icon === 'withdraw'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={withdraw} alt="Withdraw" />
			</span>
		{/if}
		{#if icon === 'web'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover icon-web"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={web} alt="Web Browser" />
			</span>
		{/if}
		{#if icon === 'goToWeb'}
			<span class:ml-1={!buttonClass.includes('is-small')} />
			<span
				class="icon is-normal has-no-hover icon-web"
				class:is-small={buttonClass.includes('is-small')}
				class:is-white={buttonClass.includes('is-primary') && !buttonClass.includes('is-outlined')}
				class:is-primary={buttonClass.includes('is-primary') && buttonClass.includes('is-outlined')}
				class:is-outlined={buttonClass.includes('is-outlined')}
			>
				<img src={goToWeb} alt="Web Browser" />
			</span>
		{/if}
	{/if}
</button>

<style lang="scss">
	.button {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition: width 444ms ease-out;

		.icon-padding-left {
			padding-left: 0.05rem;
		}

		.icon-web {
			padding-right: 0.15rem;
			padding-left: 0.05rem;
		}

		.icon-top-right-arrow {
			padding-right: 0.15rem;
		}

		&.is-loading:hover {
			cursor: wait !important;
		}

		&.button-config-choice {
			min-width: 182px !important;
		}

		&.button-export {
			min-width: 240px !important;
		}

		&.button-refresh {
			min-width: 96px !important;
		}

		&.button-vault {
			min-width: 258px !important;
		}

		&.extraction-width {
			min-width: 100px;
		}

		&:not(.has-no-minimun-width):not(.button-refresh):not(.extraction-width) {
			min-width: 171px;
		}
	}
</style>
