<script lang="ts">
    import { invalidate } from '$app/navigation';
    import { Button, Listgroup, ListgroupItem, Search } from 'flowbite-svelte';
    import { PlusOutline } from 'flowbite-svelte-icons';

	/** @type {import('./$types').PageData} */
	export let data;
    export let searchTerm = '';

    const fetchGames = () => {	
		fetch(`/api/game/search?query=${searchTerm}`)
            .then(res => res.json())
            .then(games => {
                data.games = games;
                invalidate('data.games');
            });
	}

    const deleteGame = (e: any) => {
        const id = e.target.getAttribute('data-id');
        fetch(`/api/game/${id}`, {
            method: 'DELETE'
        }).then(() => {
            location.reload();
        });
    }
</script>

<h1 class="text-2xl font-extrabold dark:text-white mb-4">Games</h1>
<Search type="text" 
    id="search-field" 
    placeholder="Search" 
    autocomplete="off"
    bind:value={searchTerm}
    on:input={fetchGames} />
<Listgroup class="mt-1">
    {#each data.games as game}
        <ListgroupItem>
            <div style="display: flex; align-items: center;">
                <div style="flex-grow: 1;">
                    <a href={`/game/${game.id}`}>{game.title}</a>
                </div>
                {#if data.canDelete}
                    <div>
                        <Button size="xs" on:click={deleteGame} data-id={game.id}>X</Button>
                    </div>
                {/if}
            </div>
        </ListgroupItem>
    {/each}
</Listgroup>
{#if data.canCreate}
    <Button size="xs" on:click={() => {location.href="/game/create"}} class="mt-2"><PlusOutline />Add Game</Button>
{/if}