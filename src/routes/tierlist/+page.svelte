<script lang="ts">
    import { Button, Listgroup, ListgroupItem } from "flowbite-svelte";
    import { TrashBinSolid } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";

	export let data: PageData;

    async function deleteTierList(tierListId: number) {
        if (!confirm('Are you sure you want to delete this tier list?')) {
            return;
        }

        try {
            const response = await fetch(`/api/tierlist/${tierListId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Delete failed: ${response.status}`);
            }

            data.tierLists = data.tierLists.filter(tierList => tierList.id !== tierListId);
        } catch (error) {
            console.error('Delete error:', error);
        }
    }

    function handleTierListClick(event: MouseEvent, tierListId: number) {
        if (event.button === 1 || (event.button === 0 && (event.ctrlKey || event.metaKey))) {
            window.open(`/tierlist/${tierListId}`, '_blank');
        } else if (event.button === 0) {
            window.location.href = `/tierlist/${tierListId}`;
        }
    }
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center">
        <h1 class="text-2xl font-extrabold dark:text-white">Tier Lists</h1>
    </div>

    {#if data.tierLists.length === 0}
        <div class="p-4 text-center text-gray-500 dark:text-gray-400">
            No tier lists found
        </div>
    {:else}
        <Listgroup class="mt-1">
            {#each data.tierLists as tierList (tierList.id)}
                <ListgroupItem>
                    <div class="flex justify-between items-center w-full">
                        <button
                            class="text-left cursor-pointer hover:underline flex-grow"
                            on:click={(event) => handleTierListClick(event, tierList.id)}
                            on:auxclick={(event) => handleTierListClick(event, tierList.id)}
                        >
                            {tierList.title}
                        </button>

                        {#if data.permissions.canEdit}
                            <Button
                                size="xs"
                                color="red"
                                onclick={() => deleteTierList(tierList.id)}
                                class="ml-2"
                            >
                                <TrashBinSolid class="h-3 w-3" />
                            </Button>
                        {/if}
                    </div>
                </ListgroupItem>
            {/each}
        </Listgroup>
    {/if}
</div>
