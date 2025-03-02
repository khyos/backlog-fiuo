<script lang="ts">
    import { Button, Listgroup, ListgroupItem, Search } from 'flowbite-svelte';
    import { PlusOutline, TrashBinSolid } from 'flowbite-svelte-icons';
    import type { PageData } from './$types';

	export let data: PageData;
    export let searchTerm = '';
    let isSearching = false;

    async function searchGames() {
        isSearching = true;
        
        try {
            const response = await fetch(`/api/game/search?query=${encodeURIComponent(searchTerm)}`);
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            
            const games = await response.json();
            data.games = games;
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            isSearching = false;
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchGames();
        }
    }

    async function deleteGame(gameId: number) {
        if (!confirm('Are you sure you want to delete this game?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/game/${gameId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Delete failed: ${response.status}`);
            }
            
            data.games = data.games.filter(game => game.id !== gameId);
        } catch (error) {
            console.error('Delete error:', error);
        }
    }

    function navigateToGame(gameId: number) {
        window.location.href = `/game/${gameId}`;
    }

    function navigateToCreateGame() {
        window.location.href = '/game/create';
    }
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center">
        <h1 class="text-2xl font-extrabold dark:text-white">Games</h1>
        
        {#if data.permissions.canCreate}
            <Button size="sm" on:click={navigateToCreateGame}>
                <PlusOutline class="mr-2 h-4 w-4" />
                Add Game
            </Button>
        {/if}
    </div>

    <div class="search-container">
        <Search 
            type="text"
            id="search-field"
            placeholder="Search games..." 
            autocomplete="off"
            bind:value={searchTerm}
            on:keydown={handleKeyDown}
        />
        <Button 
            size="sm"
            class="ml-2"
            disabled={isSearching}
            on:click={searchGames}
        >
            {isSearching ? 'Searching...' : 'Search'}
        </Button>
    </div>

    {#if data.games.length === 0}
        <div class="p-4 text-center text-gray-500 dark:text-gray-400">
            No games found
        </div>
    {:else}
        <Listgroup class="w-full">
            {#each data.games as game (game.id)}
                <ListgroupItem>
                    <div class="flex justify-between items-center w-full">
                        <button 
                            class="text-left cursor-pointer hover:underline flex-grow"
                            on:click={() => navigateToGame(game.id)}
                        >
                            {game.title}
                        </button>
                        
                        {#if data.permissions.canDelete}
                            <Button 
                                size="xs" 
                                color="red"
                                on:click={() => deleteGame(game.id)}
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