<script lang="ts">
    import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { CalendarMonthSolid, CheckCircleSolid } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";

    export let data: PageData;

    type AnimeRow = PageData['animes'][number] & {
        startDateInput: string;
        endDateInput: string;
        loading: boolean;
        done: boolean;
        error: string | null;
    };

    function toInputDate(dateStr: string | null): string {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    }

    let rows: AnimeRow[] = data.animes.map(a => ({
        ...a,
        startDateInput: toInputDate(a.animeStartDate),
        endDateInput: toInputDate(a.animeEndDate),
        loading: false,
        done: false,
        error: null
    }));

    async function applyDates(row: AnimeRow) {
        row.error = null;
        if (!row.startDateInput || !row.endDateInput) {
            row.error = 'Both start and end dates are required.';
            rows = rows;
            return;
        }
        row.loading = true;
        rows = rows;
        try {
            const res = await fetch(`/api/anime/${row.animeId}/episodeDates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate: row.startDateInput, endDate: row.endDateInput })
            });
            if (res.ok) {
                row.done = true;
            } else {
                const body = await res.json().catch(() => ({}));
                row.error = body?.message ?? `Error ${res.status}`;
            }
        } catch {
            row.error = 'Network error.';
        } finally {
            row.loading = false;
            rows = rows;
        }
    }

    $: pendingRows = rows.filter(r => !r.done);
</script>

<svelte:head>
    <title>Backlog - Anime Episode Dates</title>
</svelte:head>

<div class="p-4 max-w-6xl mx-auto">
    <h1 class="text-2xl font-bold mb-2 dark:text-white">Anime Episode Dates</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Set end dates for finished anime episodes that have no date. Dates are distributed evenly
        between the start and end dates you provide.
    </p>

    {#if rows.length === 0}
        <div class="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700">
            <CheckCircleSolid class="w-5 h-5 text-green-600 dark:text-green-300" />
            <p class="text-green-700 dark:text-green-200">
                All finished anime episodes already have end dates set.
            </p>
        </div>
    {:else}
        {#if pendingRows.length === 0}
            <div class="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 mb-6">
                <CheckCircleSolid class="w-5 h-5 text-green-600 dark:text-green-300" />
                <p class="text-green-700 dark:text-green-200">All done!</p>
            </div>
        {/if}

        <Table>
            <TableHead>
                <TableHeadCell>Anime</TableHeadCell>
                <TableHeadCell>Episodes missing dates</TableHeadCell>
                <TableHeadCell>Start date</TableHeadCell>
                <TableHeadCell>End date</TableHeadCell>
                <TableHeadCell></TableHeadCell>
            </TableHead>
            <TableBody>
                {#each rows as row (row.animeId)}
                    <TableBodyRow class={row.done ? 'opacity-50' : ''}>
                        <TableBodyCell>
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/anime/{row.animeId}" class="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                {row.title}
                            </a>
                        </TableBodyCell>
                        <TableBodyCell>
                            <Badge color="yellow">{row.episodesMissingDates}</Badge>
                        </TableBodyCell>
                        <TableBodyCell>
                            {#if row.done}
                                <span class="text-gray-400 dark:text-gray-500 text-sm">{row.startDateInput || '—'}</span>
                            {:else}
                                <input
                                    type="date"
                                    bind:value={row.startDateInput}
                                    class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            {/if}
                        </TableBodyCell>
                        <TableBodyCell>
                            {#if row.done}
                                <span class="text-gray-400 dark:text-gray-500 text-sm">{row.endDateInput || '—'}</span>
                            {:else}
                                <input
                                    type="date"
                                    bind:value={row.endDateInput}
                                    class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            {/if}
                        </TableBodyCell>
                        <TableBodyCell>
                            {#if row.done}
                                <div class="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <CheckCircleSolid class="w-4 h-4" />
                                    <span class="text-sm">Done</span>
                                </div>
                            {:else}
                                <div class="flex flex-col gap-1">
                                    <button
                                        class="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={row.loading}
                                        on:click={() => applyDates(row)}
                                    >
                                        <CalendarMonthSolid class="w-3 h-3 mr-1" />
                                        {row.loading ? 'Applying…' : 'Apply dates'}
                                    </button>
                                    {#if row.error}
                                        <p class="text-xs text-red-500">{row.error}</p>
                                    {/if}
                                </div>
                            {/if}
                        </TableBodyCell>
                    </TableBodyRow>
                {/each}
            </TableBody>
        </Table>
    {/if}
</div>
