<script lang="ts">
	import type { ActionData } from './$types';
    import { Alert, Button, Input, Label } from 'flowbite-svelte';

	export let form: ActionData;
</script>

<h2 class="text-4xl font-extrabold dark:text-white mb-6">Sign In</h2>
<form method="post">
    <div class="mb-6">
        <Label for="username">Username:</Label>
        <Input type="text" id="username" name="username" />
    </div>
    <div class="mb-6">
        <Label for="password">Password:</Label>
        <Input type="password" id="password" name="password" />
    </div>
    <div style="display: flex; align-items: center;">
        <Button id="createButton" type="submit">Sign In</Button>
        {#if form?.error != null}
            <Alert class="ml-4" style="flex-grow:1" color="red" dismissable>
                {form.error}
            </Alert>
        {/if}
    </div>
</form>
