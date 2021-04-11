<script>
	export let strengthId = 0;
	export let isInvisible = false;
</script>

<div
	class="strength-lines"
	class:is-weak={strengthId === 1}
	class:is-medium={strengthId === 2}
	class:is-safe={strengthId === 3}
	class:is-strong={strengthId === 4}
	class:is-invisible={isInvisible}
>
	<div class="line" />
	<div class="line" />
	<div class="line" />
	<div class="line" />
</div>
