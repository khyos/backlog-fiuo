<script lang="ts">
    import { invalidate } from "$app/navigation";
    import { Button, Listgroup, ListgroupItem, Search } from "flowbite-svelte";
    import { PlusOutline } from "flowbite-svelte-icons";

	/** @type {import('./$types').PageData} */
	export let data;
    export let searchTerm = '';

    const searchBacklog = () => {	
		
	}

    const deleteBacklog = (e: any) => {
        const id = e.target.getAttribute('data-id');
        fetch(`/api/backlog/${id}`, {
            method: 'DELETE'
        }).then(() => {
            invalidate("data");
        });
    }
</script>

<h1 class="text-2xl font-extrabold dark:text-white mb-4">Backlogs</h1>
<Search type="text" 
    id="search-field" 
    placeholder="Search" 
    autocomplete="off"
    bind:value={searchTerm}
    on:input={searchBacklog} />
<Listgroup class="mt-1">
    {#each data.backlogs as backlog}
        <ListgroupItem>
            <div style="display: flex; align-items: center;">
                <div style="flex-grow: 1;">
                    <a href={`/backlog/${backlog.id}`}>{backlog.title}</a>
                </div>
                <div>
                    <Button size="xs" on:click={deleteBacklog} data-id={backlog.id}>X</Button>
                </div>
            </div>
        </ListgroupItem>
    {/each}
</Listgroup>
{#if data.canCreate}
    <Button size="xs" on:click={() => {location.href="/backlog/create"}} class="mt-2"><PlusOutline />Add Backlog</Button>
{/if}
