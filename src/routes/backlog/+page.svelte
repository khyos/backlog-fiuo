<script lang="ts">
    import { Button, Input, Listgroup, ListgroupItem } from "flowbite-svelte";
    import { PlusOutline, SearchOutline, TrashBinSolid, ClockSolid, ClapperboardPlaySolid, ImageSolid, RocketSolid, ForwardSolid } from "flowbite-svelte-icons";
    import { ArtifactType } from "$lib/model/Artifact";
    import type { PageData } from "./$types";

	export let data: PageData;
    let searchTerm = '';
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
    <!-- Backlog Sections Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Current Backlogs Section -->
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div class="flex items-center mb-4">
                <ClockSolid class="w-5 h-5 text-green-500 mr-2" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Current Backlogs</h2>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <Button 
                    color="blue" 
                    size="sm" 
                    onclick={() => window.location.href = `/backlog/current/${ArtifactType.GAME}`}
                    class="w-full"
                >
                    <RocketSolid class="w-3 h-3 mr-2" />
                    Game
                </Button>
                <Button 
                    color="purple" 
                    size="sm" 
                    onclick={() => window.location.href = `/backlog/current/${ArtifactType.MOVIE}`}
                    class="w-full"
                >
                    <ClapperboardPlaySolid class="w-3 h-3 mr-2" />
                    Movie
                </Button>
                <Button 
                    color="green" 
                    size="sm" 
                    onclick={() => window.location.href = `/backlog/current/${ArtifactType.TVSHOW}`}
                    class="w-full"
                >
                    <ImageSolid class="w-3 h-3 mr-2" />
                    TV Show
                </Button>
                <Button 
                    color="orange" 
                    size="sm" 
                    onclick={() => window.location.href = `/backlog/current/${ArtifactType.ANIME}`}
                    class="w-full"
                >
                    <ImageSolid class="w-3 h-3 mr-2" />
                    Anime
                </Button>
            </div>
        </div>
        <!-- Coming Soon Section -->
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div class="flex items-center mb-4">
                <ForwardSolid class="w-5 h-5 text-green-500 mr-2" />
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Coming Soon</h2>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <Button 
                    color="blue" 
                    size="sm" 
                    onclick={() => window.location.href = `/backlog/future/${ArtifactType.GAME}`}
                    class="w-full"
                >
                    <RocketSolid class="w-3 h-3 mr-2" />
                    Game
                </Button>
                <Button 
                    color="purple" 
                    size="sm" 
                    onclick={() => window.location.href = `/backlog/future/${ArtifactType.MOVIE}`}
                    class="w-full"
                >
                    <ClapperboardPlaySolid class="w-3 h-3 mr-2" />
                    Movie
                </Button>
                <Button 
                    color="green" 
                    size="sm" 
                    onclick={() => window.location.href = `/backlog/future/${ArtifactType.TVSHOW}`}
                    class="w-full"
                >
                    <ImageSolid class="w-3 h-3 mr-2" />
                    TV Show
                </Button>
                <Button 
                    color="orange" 
                    size="sm" 
                    onclick={() => window.location.href = `/backlog/future/${ArtifactType.ANIME}`}
                    class="w-full"
                >
                    <ImageSolid class="w-3 h-3 mr-2" />
                    Anime
                </Button>
            </div>
        </div>
    </div>

    <!-- Regular Backlogs Section -->
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Your Backlogs</h2>
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
            {#each data.backlogs as backlog (backlog.id)}
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