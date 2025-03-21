<script lang="ts">
    import type { IArtifact, ArtifactType } from '$lib/model/Artifact';
    import { Button, Listgroup, ListgroupItem, Search } from 'flowbite-svelte';
    import { PlusOutline, TrashBinSolid } from 'flowbite-svelte-icons';
    
    export let artifacts: IArtifact[] = [];
    export let artifactType: ArtifactType; // 'movie' or 'game'
    export let permissions: { canCreate: boolean, canDelete: boolean };
    export let title: string;
    
    let searchTerm = '';
    let isSearching = false;

    async function searchArtifacts() {
        isSearching = true;
        
        try {
            const response = await fetch(`/api/${artifactType}/search?query=${encodeURIComponent(searchTerm)}`);
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            
            const result = await response.json();
            artifacts = result;
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            isSearching = false;
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchArtifacts();
        }
    }

    async function deleteArtifact(artifactId: number) {
        if (!confirm(`Are you sure you want to delete this ${artifactType}?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/${artifactType}/${artifactId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Delete failed: ${response.status}`);
            }
            
            artifacts = artifacts.filter(artifact => artifact.id !== artifactId);
        } catch (error) {
            console.error('Delete error:', error);
        }
    }

    function handleArtifactClick(event: MouseEvent, artifactId: number) {
        if (event.button === 1 || (event.button === 0 && (event.ctrlKey || event.metaKey))) {
            window.open(`/${artifactType}/${artifactId}`, '_blank');
        } else if (event.button === 0) {
            window.location.href = `/${artifactType}/${artifactId}`;
        }
    }

    function navigateToCreate() {
        window.location.href = `/${artifactType}/create`;
    }
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center">
        <h1 class="text-2xl font-extrabold dark:text-white">{title}</h1>
        
        {#if permissions.canCreate}
            <Button size="sm" on:click={navigateToCreate}>
                <PlusOutline class="mr-2 h-4 w-4" />
                Add {artifactType.charAt(0).toUpperCase() + artifactType.slice(1)}
            </Button>
        {/if}
    </div>

    <div class="search-container">
        <Search 
            type="text"
            id="search-field"
            placeholder="Search {artifactType}s..." 
            autocomplete="off"
            bind:value={searchTerm}
            on:keydown={handleKeyDown}
        />
        <Button 
            size="sm"
            class="ml-2"
            disabled={isSearching}
            on:click={searchArtifacts}
        >
            {isSearching ? 'Searching...' : 'Search'}
        </Button>
    </div>

    {#if artifacts.length === 0}
        <div class="p-4 text-center text-gray-500 dark:text-gray-400">
            No {artifactType}s found
        </div>
    {:else}
        <Listgroup class="w-full">
            {#each artifacts as artifact (artifact.id)}
                <ListgroupItem>
                    <div class="flex justify-between items-center w-full">
                        <button 
                            class="text-left cursor-pointer hover:underline flex-grow"
                            on:click={(event) => handleArtifactClick(event, artifact.id)}
                            on:auxclick={(event) => handleArtifactClick(event, artifact.id)}
                        >
                            {artifact.title}
                        </button>
                        
                        {#if permissions.canDelete}
                            <Button 
                                size="xs" 
                                color="red"
                                on:click={() => deleteArtifact(artifact.id)}
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