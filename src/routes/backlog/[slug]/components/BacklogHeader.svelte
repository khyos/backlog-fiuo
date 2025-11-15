<script lang="ts">
    import { Button, Toast } from "flowbite-svelte";
    import { CheckCircleSolid } from "flowbite-svelte-icons";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import { pageStore, toggleDrawer } from "../stores/PageStore";
    import { copyAiPrompt } from "../stores/BacklogStore";

    export let title: string;
    export let totalTime: number;
    export let showAiButton: boolean = true;
</script>

<div class="flex p-1">
    <h3
        class="p-1 text-xl font-medium text-gray-900 dark:text-white"
        style="flex-grow: 1; padding-left: 1rem"
    >
        {title} ({TimeUtil.formatDuration(totalTime)})
    </h3>
    {#if $pageStore.isCopiedToastVisible}
        <Toast class="fixed bottom-4 left-1/2 transform -translate-x-1/2" params={{ delay: 250, duration: 1000 }} dismissable={false}>
            {#snippet icon()}
                <CheckCircleSolid class="h-6 w-6" />
            {/snippet}
            Copied !
        </Toast>
    {/if}

    {#if showAiButton}
        <Button size="xs" class="mr-1" onclick={copyAiPrompt}>AI</Button>
    {/if}
    <Button size="xs" onclick={toggleDrawer}>Filters / Add</Button>
</div>