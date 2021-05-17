<script>
	import { createEventDispatcher } from 'svelte';

	export let dropdownClass = '';
	export let dropdownDisabled = false;
	export let dropdownText = 'Dropdown Selection';
	export let fullWidth = false;
	export let hideIfSelected = true;
	export let title = '';
	export let options = [
		{ name: 'Example choice 1', selected: false },
		{ name: 'Example choice 2', selected: false, disabled: true, title: 'Hello' }, // disabled & title are optionnal
	];

	const dispatch = createEventDispatcher();

	const arrowDown = './img/icons/ui/arrow-drop-down.svg';
	const arrowUp = './img/icons/ui/arrow-drop-up.svg';

	let isClicked = false;

	const handleClick = () => {
		if (!dropdownDisabled) {
			isClicked = !isClicked;
		}
	};

	const handleDropdownSelected = selectedItem => {
		for (let i in options) {
			if (i !== selectedItem) {
				options[i].selected = false;
			}
		}

		options[selectedItem].selected = true;
		dispatch('dropdownSelected', selectedItem);
	};
</script>

{#if isClicked}
	<div
		class="background-click"
		on:click={() => {
			isClicked = false;
		}}
	/>
{/if}

<div class="dropdown is-right" class:is-active={isClicked} class:is-fullwidth={fullWidth} on:click={handleClick} {title}>
	<div class="dropdown-trigger" class:is-fullwidth={fullWidth}>
		<div
			class="dropdown-container {dropdownClass}"
			class:is-fullwidth={fullWidth}
			disabled={dropdownDisabled}
			aria-haspopup="true"
			aria-controls="dropdown-menu"
		>
			<span class="text">{dropdownText}</span>
			{#if isClicked && !dropdownDisabled}
				<span class="icon has-no-hover is-prussian-blue"><img src={arrowUp} alt="Up Arrow" /></span>
			{:else if !dropdownDisabled}
				<span class="icon has-no-hover is-prussian-blue"><img src={arrowDown} alt="Down Arrow" /></span>
			{/if}
		</div>
	</div>
	<div class="dropdown-menu" id="dropdown-menu" role="menu">
		<div class="dropdown-content">
			{#each options as { name, selected, disabled, title }, i}
				{#if !selected && hideIfSelected}
					<li
						class="dropdown-item is-family-primary"
						class:is-active={selected}
						class:is-disabled={disabled}
						title={title ? title : ''}
						on:click={() => {
							if (!disabled) {
								handleDropdownSelected(i);
							}
						}}
					>
						{name}
					</li>
				{/if}
			{/each}
		</div>
	</div>
</div>

<style lang="scss">
	.background-click {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 1;
		overflow: hidden !important;
		width: 100vw;
		height: 100vh;
	}

	.dropdown-container {
		display: flex;
		align-items: center;

		.text {
			vertical-align: middle;
			margin-left: 0.25rem;
			white-space: nowrap;
		}

		.icon {
			text-align: right;
		}
	}

	.dropdown-container:hover {
		color: #c3283d;
		cursor: pointer;
		img {
			filter: invert(26%) sepia(100%) saturate(1669%) hue-rotate(331deg) brightness(78%) contrast(99%);
		}
	}

	.dropdown {
		vertical-align: baseline !important;

		&.is-active {
			color: #c3283d;

			img {
				filter: invert(26%) sepia(100%) saturate(1669%) hue-rotate(331deg) brightness(78%) contrast(99%);
			}

			.dropdown-menu {
				min-width: 1rem !important;
				margin-top: 2px;

				.dropdown-content {
					border-radius: 0;
					text-align: right;

					.dropdown-item {
						padding: 0.375rem 1rem;
					}

					&.is-disabled:hover {
						cursor: not-allowed;
					}

					&:not(.is-disabled):hover {
						cursor: pointer;
					}
				}
			}
		}
	}
</style>
