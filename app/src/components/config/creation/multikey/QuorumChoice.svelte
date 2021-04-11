<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as animateScroll from 'svelte-scrollto';
	import Button from '../../../ui/Button.svelte';

	const dispatch = createEventDispatcher();

	const handle2of3Selected = () => {
		dispatch('userSelect2of3');
	};

	onMount(async () => {
		animateScroll.scrollToTop();
	});
</script>

<div class="container">
	<div class="columns has-text-centered is-centered is-multiline">
		<div class="column is-4">
			<div class="card">
				<div class="card-content is-fullheight has-smaller-padding-bottom">
					<div class="card-title">
						<h2 class="title is-4 has-subtitle-margin">{$_('creation.quorum_choice.2of3_title', { default: '2 of 3 Keys' })}</h2>
					</div>
					<p class="mb-6">
						{$_('creation.quorum_choice.2of3_paragraph', {
							default: 'Simple set of 3 hardware devices where only 2 are required to spend. For medium-sized holdings',
						})}.
					</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button
								text={$_('creation.quorum_choice.2of3_button', { default: 'Add 3 keys' })}
								buttonClass="is-primary"
								icon="arrowRight"
								on:buttonClicked={handle2of3Selected}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="card">
				<div class="card-content is-fullheight has-smaller-padding-bottom">
					<div class="card-title">
						<h2 class="title is-4 has-subtitle-margin">{$_('creation.quorum_choice.3of5_title', { default: '3 of 5 Keys' })}</h2>
					</div>
					<p class="mb-6">
						{$_('creation.quorum_choice.3of5_paragraph', {
							default: 'Set of 5 hardware devices where only 3 are required to spend. For large holdings or team sharing{',
						})}.
					</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button text={$_('creation.quorum_choice.3of5_button', { default: 'Soon' })} buttonClass="is-primary" buttonDisabled />
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="column is-4">
			<div class="card">
				<div class="card-content is-fullheight has-smaller-padding-bottom">
					<div class="card-title">
						<h2 class="title is-4 has-subtitle-margin">{$_('creation.quorum_choice.custom_title', { default: 'Custom' })}</h2>
					</div>
					<p class="mb-6">
						{$_('creation.quorum_choice.custom_paragraph', {
							default: 'Create vaults with M of N hardware devices up to a maximum of 15. Only for advanced users',
						})}.
					</p>
					<div class="card-bottom">
						<div class="buttons is-centered">
							<Button text={$_('creation.quorum_choice.custom_button', { default: 'Soon' })} buttonClass="is-primary" buttonDisabled />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.card {
		width: 440px;
		height: 388px;
	}
</style>
