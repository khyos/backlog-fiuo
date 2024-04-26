<script lang="ts">
    import { invalidate } from '$app/navigation';
    import { Button, Listgroup, ListgroupItem, Search } from 'flowbite-svelte';
    import { PlusOutline } from 'flowbite-svelte-icons';

	/** @type {import('./$types').PageData} */
	export let data;
    export let searchTerm = '';

    const fetchMovies = () => {	
		fetch(`/api/movie/search?query=${searchTerm}`)
            .then(res => res.json())
            .then(movies => {
                data.movies = movies;
                invalidate('data.movies');
            });
	}

    const deleteMovie = (e: any) => {
        const id = e.target.getAttribute('data-id');
        fetch(`/api/movie/${id}`, {
            method: 'DELETE'
        }).then(() => {
            location.reload();
        });
    }
</script>

<h1 class="text-2xl font-extrabold dark:text-white mb-4">Movies</h1>
<Search type="text" 
    id="search-field" 
    placeholder="Search" 
    autocomplete="off"
    bind:value={searchTerm}
    on:input={fetchMovies} />
<Listgroup class="mt-1">
    {#each data.movies as movie}
        <ListgroupItem>
            <div style="display: flex; align-items: center;">
                <div style="flex-grow: 1;">
                    <a href={`/movie/${movie.id}`}>{movie.title}</a>
                </div>
                {#if data.canDelete}
                    <div>
                        <Button size="xs" on:click={deleteMovie} data-id={movie.id}>X</Button>
                    </div>
                {/if}
            </div>
        </ListgroupItem>
    {/each}
</Listgroup>
{#if data.canCreate}
    <Button size="xs" on:click={() => {location.href="/movie/create"}} class="mt-2"><PlusOutline />Add Movie</Button>
{/if}