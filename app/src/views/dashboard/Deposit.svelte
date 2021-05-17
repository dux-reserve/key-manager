<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import QrCode from 'svelte-qrcode';
	import * as animateScroll from 'svelte-scrollto';
	import { configSelectedCurrentData, bitcoinTestnetNetwork } from '../../store';
	import { isObjectEmpty } from '../../utils/helpers';
	import Button from '../../components/ui/Button.svelte';
	import Loading from '../../components/ui/Loading.svelte';
	import CurrentConfigDetails from '../../components/config/CurrentConfigDetails.svelte';

	export let currentPendingAmount = 0;
	export let configDropdownArray = [];
	export let configurationDropDownSelectedChoice = 0;

	const dispatch = createEventDispatcher();

	const contentCopy = './img/icons/ui/content-copy.svg';

	let unusedAddressIndex = 0;
	let lastUnusedAddressData = '';
	let qrCodeData = '';
	let copyTooltip = false;
	let loaded = false;

	$: if (
		!isObjectEmpty($configSelectedCurrentData) &&
		$configSelectedCurrentData.unusedAddresses &&
		lastUnusedAddressData !== $configSelectedCurrentData.unusedAddresses[unusedAddressIndex].address
	) {
		lastUnusedAddressData = $configSelectedCurrentData.unusedAddresses[unusedAddressIndex].address;

		// Hack to rerender the QRCode
		qrCodeData = '';
		setTimeout(() => {
			qrCodeData = 'bitcoin:' + $configSelectedCurrentData.unusedAddresses[unusedAddressIndex].address;
			loaded = true;
		}, 0);
	}

	const handleGenerateNewAddress = () => {
		if (unusedAddressIndex < $configSelectedCurrentData.unusedAddresses.length - 1) {
			unusedAddressIndex += 1;
		} else {
			unusedAddressIndex = 0;
		}
	};

	const handleCopyAddress = () => {
		window.api.ipcRenderer.invoke('os:copy-to-clipboard', { string: $configSelectedCurrentData.unusedAddresses[unusedAddressIndex].address });
		if (!copyTooltip) {
			copyTooltip = true;
			setTimeout(() => {
				copyTooltip = false;
			}, 3021);
		}
	};

	const handleCurrentConfigChangeFromDropdown = ({ detail }) => {
		dispatch('dropdownSelected', detail);
	};

	onMount(() => {
		animateScroll.scrollToTop();

		if ($configSelectedCurrentData.unusedAddresses && $configSelectedCurrentData.unusedAddresses[unusedAddressIndex].address) {
			qrCodeData = 'bitcoin:' + $configSelectedCurrentData.unusedAddresses[unusedAddressIndex].address;
			loaded = true;
		}
	});
</script>

<CurrentConfigDetails
	{currentPendingAmount}
	{configDropdownArray}
	{configurationDropDownSelectedChoice}
	on:dropdownSelected={handleCurrentConfigChangeFromDropdown}
/>

<div class="columns">
	<div class="column">
		<h3 class="title is-4">
			{$_('dashboard.receiving.title', { default: 'Receiving details' })}
			{#if $bitcoinTestnetNetwork}
				<span class="is-size-5">(TESTNET)</span>
			{/if}
		</h3>
	</div>
</div>
<div class="columns">
	<div class="column">
		<div class="card action">
			<div class="card-content">
				{#if !loaded || !$configSelectedCurrentData.config}
					<div class="loading-container">
						<Loading text={$_('dashboard.receiving.loading', { default: 'Loading data' })} />
					</div>
				{:else}
					{#if copyTooltip}
						<span class="floating-message title is-6 has-text-weight-medium is-primary"
							>{$_('dashboard.receiving.clipboard', { default: 'Copied to clipboard' })} ✓</span
						>
					{/if}
					<div class="columns is-multiline">
						<div class="column is-4-widescreen is-5-desktop is-12-tablet">
							<div class="qrcode-img mt-4" data-tooltip={$_('dashboard.receiving.tooltip', { default: 'Click to copy receiving address' })}>
								{#if qrCodeData}
									<div class="is-clickable" on:click={handleCopyAddress}>
										<QrCode size="242" value={qrCodeData} background="#fefefe" />
									</div>
								{/if}
							</div>
						</div>
						<div class="column is-8-widescreen is-7-desktop is-12-tablet has-text-left">
							<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">
								{$_('dashboard.receiving.subtitle', { default: 'Destination address' })}
								<span
									class="icon is-prussian-blue is-inline-block ml-3"
									title={$_('dashboard.receiving.tooltip', { default: 'Click to copy receiving address' })}
									on:click={handleCopyAddress}
								>
									<img src={contentCopy} alt="Copy to clipboard" />
								</span>
							</h5>
							<p
								class="is-size-5 is-clickable has-text-multiline mb-4 is-selectable"
								on:click={handleCopyAddress}
								title={$_('dashboard.receiving.tooltip', { default: 'Click to copy receiving address' })}
							>
								{$configSelectedCurrentData.unusedAddresses
									? $configSelectedCurrentData.unusedAddresses[unusedAddressIndex].address
									: $_('dashboard.receiving.error_1', { default: 'error on generating address' })}
							</p>
							<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">{$_('dashboard.receiving.receive_to', { default: 'Receive to' })}</h5>
							<p class="is-size-5 is-capitalized has-text-multiline mb-4">{$configSelectedCurrentData.name}</p>
						</div>
					</div>
					<div class="buttons is-right">
						<Button
							text={$_('dashboard.receiving.button_cta_2', { default: 'View transactions history"' })}
							buttonClass="is-primary is-outlined"
							buttonLink={'/dashboard?view=transactions,id=' + $configSelectedCurrentData.config.id}
						/>
						<Button
							text={$_('dashboard.receiving.button_cta', { default: 'Generate new address' })}
							buttonClass="is-primary"
							on:buttonClicked={handleGenerateNewAddress}
						/>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.card.action {
		.card-content {
			padding: 2rem;
		}

		.qrcode-img {
			display: flex;
			justify-content: center;
			align-items: center;
			width: auto;
			min-height: 249px;
			padding: 0 !important;
			user-select: none !important;
			object-fit: cover;

			.is-clickable {
				&:hover {
					filter: opacity(75%);
				}

				&:active {
					position: relative;
					top: 1px;
				}
			}
		}

		.tooltip-copy {
			margin-left: 0.21rem;
			// color: #fafafa;
			font-size: 0.75rem;
		}

		.icon {
			&:hover {
				filter: opacity(75%);
			}

			&:active {
				position: relative;
				top: 1px;
			}
		}

		p.is-clickable:hover {
			color: #565656;
		}

		.buttons {
			margin-top: 2rem;
			margin-bottom: 0.15rem;
		}
	}

	.floating-message {
		position: absolute;
		top: 2.5rem;
		right: 2.5rem;
	}

	[data-tooltip]:hover {
		cursor: default !important;
	}

	[data-tooltip]::before {
		bottom: 107.75%;
		width: 250px;
	}

	@media screen and (min-width: 1011px) {
		.card.action {
			.card-content {
				padding: 2.5rem;
			}

			.buttons {
				margin-top: 0.25rem;
				margin-bottom: 0;
			}
		}
	}
</style>
