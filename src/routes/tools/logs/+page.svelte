<script lang="ts">
    import { Button, Input, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
    import type { PageData } from './$types';

    export let data: PageData;
    let search = '';

    $: filteredLogs = data.logs.filter((log) => {
        const matchesSearch = !search.trim() || log.message.toLowerCase().includes(search.trim().toLowerCase());
        return matchesSearch;
    });

    const refresh = () => window.location.reload();
</script>

<svelte:head>
    <title>Backlog - Server Logs</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Server Logs</h1>
            <p class="mt-2 text-gray-500 dark:text-gray-400">Logs captured since the server started.</p>
        </div>
        <Button onclick={refresh}>Refresh</Button>
    </div>

    <div class="mb-6">
        <Input bind:value={search} placeholder="Filter messages" />
    </div>

    <div class="overflow-x-auto">
        <Table striped>
            <TableHead>
                <TableHeadCell>Time</TableHeadCell>
                <TableHeadCell>Message</TableHeadCell>
            </TableHead>
            <TableBody>
                {#each filteredLogs as log (log.id)}
                    <TableBodyRow>
                        <TableBodyCell class="whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableBodyCell>
                        <TableBodyCell class="whitespace-pre-wrap break-all">{log.message}</TableBodyCell>
                    </TableBodyRow>
                {:else}
                    <TableBodyRow>
                        <TableBodyCell colspan={2}>No matching logs.</TableBodyCell>
                    </TableBodyRow>
                {/each}
            </TableBody>
        </Table>
    </div>
</div>