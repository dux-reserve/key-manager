<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';

	const dispatch = createEventDispatcher();

	const keyIcon = './img/icons/ui/single-key.svg';

	export let exportedName = '';
	let name = exportedName;

	const dispatchInputValue = () => {
		dispatch('walletNameChange', name);
	};

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns is-centered">
		<div class="column is-7">
			<div class="card">
				<div class="card-content is-fullheight">
					<div class="card-title has-text-centered">
						<span class="icon is-primary is-normal has-no-hover"><img class="image-key" src={keyIcon} alt="Key Icon" /></span>
						<span class="icon is-primary is-normal has-no-hover ml-3 mr-3"><img class="image-key" src={keyIcon} alt="Key Icon" /></span>
						<span class="icon is-prussian-blue is-normal has-no-hover"><img class="image-key" src={keyIcon} alt="Key Icon" /></span>
						<h2 class="title is-4 has-subtitle-margin has-text-centered">{$_('creation.vault_details.title', { default: 'Multiple hardware devices' })}</h2>
					</div>
					<div class="card-body">
						<div class="columns">
							<div class="column is-10 is-offset-1">
								<div class="field">
									<label class="label" for="walletName">{$_('creation.vault_details.label_name', { default: 'Vault name' })}</label>
									<div class="control">
										<input
											id="walletName"
											class="input"
											type="text"
											maxlength="36"
											placeholder={$_('creation.vault_details.name_placeholder', { default: 'Example: Cold Storage' })}
											bind:value={name}
											on:keyup={dispatchInputValue}
											autofocus
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.card {
		height: 388px;

		.card-body {
			margin-bottom: 5rem;
		}
	}

	.image-key {
		margin-bottom: 2.125rem;
	}
</style>
