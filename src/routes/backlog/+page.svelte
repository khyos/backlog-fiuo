<script lang="ts">
    import { Button, Input, Listgroup, ListgroupItem } from "flowbite-svelte";
    import { PlusOutline, SearchOutline, TrashBinSolid } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";

	export let data: PageData;
    export let searchTerm = '';
    let isSearching = false;

    async function searchBacklogs() {	
        isSearching = true;
        
        try {
            const response = await fetch(`/api/backlog/search?query=${encodeURIComponent(searchTerm)}`);
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            
            const backlogs = await response.json();
            data.backlogs = backlogs;
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            isSearching = false;
        }
	}

    function handleKeyUp(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchBacklogs();
        }
    }

    async function deleteBacklog(backlogId: number) {
        if (!confirm('Are you sure you want to delete this backlog?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/backlog/${backlogId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Delete failed: ${response.status}`);
            }
            
            data.backlogs = data.backlogs.filter(backlog => backlog.id !== backlogId);
        } catch (error) {
            console.error('Delete error:', error);
        }
    }

    function handleBacklogClick(event: MouseEvent, backlogId: number) {
        if (event.button === 1 || (event.button === 0 && (event.ctrlKey || event.metaKey))) {
            window.open(`/backlog/${backlogId}`, '_blank');
        } else if (event.button === 0) {
            window.location.href = `/backlog/${backlogId}`;
        }
    }

    function navigateToCreateBacklog() {
        window.location.href = '/backlog/create';
    }
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center">
        <h1 class="text-2xl font-extrabold dark:text-white">Backlogs</h1>
        
        {#if data.permissions.canCreate}
            <Button size="sm" onclick={navigateToCreateBacklog}>
                <PlusOutline class="mr-2 h-4 w-4" />
                Add Backlog
            </Button>
        {/if}
    </div>

    <div class="search-container">
        <Input
            id="search-field"
            class="ps-9"
            placeholder="Search backlogs..." 
            autocomplete="off"
            bind:value={searchTerm}
            onkeyup={handleKeyUp}>
            {#snippet left()}
                <SearchOutline />
            {/snippet}
            {#snippet right()}
                <Button 
                    size="xs"
                    class="ml-2"
                    disabled={isSearching}
                    onclick={searchBacklogs}
                >
                    {isSearching ? 'Searching...' : 'Search'}
                </Button>
            {/snippet}
        </Input>
    </div>

    {#if data.backlogs.length === 0}
        <div class="p-4 text-center text-gray-500 dark:text-gray-400">
            No backlogs found
        </div>
    {:else}
        <Listgroup class="mt-1">
            {#each data.backlogs as backlog}
                <ListgroupItem>
                    <div class="flex justify-between items-center w-full">
                        <button 
                            class="text-left cursor-pointer hover:underline flex-grow"
                            on:click={(event) => handleBacklogClick(event, backlog.id)}
                            on:auxclick={(event) => handleBacklogClick(event, backlog.id)}
                        >
                            {backlog.title}
                        </button>

                        {#if data.permissions.canEdit}
                            <Button 
                                size="xs" 
                                color="red"
                                onclick={() => deleteBacklog(backlog.id)}
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

<style>
    .search-container {
        display: flex;
        align-items: center;
    }
</style>