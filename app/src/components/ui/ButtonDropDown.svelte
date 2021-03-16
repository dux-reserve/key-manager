<script>
	import { createEventDispatcher } from 'svelte';

	export let dropdownClass = '';
	export let dropdownDisabled = false;
	export let dropdownText = 'Dropdown button';
	export let fullWidth = false;
	export let hideIfSelected = true;
	export let title = '';
	export let options = [
		{ name: 'Example Choice 1', selected: false },
		{ name: 'Example Choice 2', selected: false, disabled: true, title: 'Hello' }, // disabled & title are optionnal
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

	const handleDropdownSelected = i => {
		for (let j in options) {
			options[j].selected = false;
		}

		options[i].selected = true;
		dispatch('dropdownSelected', i);
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

<div class="dropdown is-center" class:is-active={isClicked} class:is-fullwidth={fullWidth} on:click={handleClick} {title}>
	<div class="dropdown-trigger" class:is-fullwidth={fullWidth}>
		<button
			type="button"
			class="button {dropdownClass}"
			class:is-fullwidth={fullWidth}
			disabled={dropdownDisabled}
			aria-haspopup="true"
			aria-controls="dropdown-menu"
		>
			<span class="text">{dropdownText}</span>
			{#if isClicked && !dropdownDisabled}
				<span
					class="icon has-no-hover"
					class:is-white={dropdownClass.includes('is-primary') && !dropdownClass.includes('is-outlined')}
					class:is-primary={dropdownClass.includes('is-primary') && dropdownClass.includes('is-outlined')}
					class:is-outlined={dropdownClass.includes('is-outlined')}
				>
					<img src={arrowUp} alt="Up Arrow" />
				</span>
			{:else if !dropdownDisabled}
				<span
					class="icon has-no-hover"
					class:is-white={dropdownClass.includes('is-primary') && !dropdownClass.includes('is-outlined')}
					class:is-primary={dropdownClass.includes('is-primary') && dropdownClass.includes('is-outlined')}
					class:is-outlined={dropdownClass.includes('is-outlined')}
				>
					<img src={arrowDown} alt="Down Arrow" />
				</span>
			{/if}
		</button>
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

	.button {
		.text {
			width: 85%;
			padding-left: 25px;
			text-align: center;
		}

		.icon {
			text-align: right;
		}
	}

	.dropdown.is-active {
		.dropdown-menu {
			display: flex;
			justify-content: center;
			width: 100%;

			.dropdown-content {
				width: 80%;
				border-radius: 0;
				text-align: center;

				.dropdown-item {
					padding: 0.375rem 1rem;
					// padding-left: 2rem;

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

	.is-widther {
		min-width: 270px;
	}

	.is-fees-selector {
		width: 100%;
		max-width: 616px;
	}
</style>
