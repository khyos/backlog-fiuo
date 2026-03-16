<script lang="ts">
    import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { ExclamationCircleOutline } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";
    import { ArtifactType } from "$lib/model/Artifact";

    export let data: PageData;

    const TYPE_LABEL: Record<string, string> = {
        [ArtifactType.GAME]:   'Game',
        [ArtifactType.MOVIE]:  'Movie',
        [ArtifactType.TVSHOW]: 'TV Show',
        [ArtifactType.ANIME]:  'Anime'
    };

    const TYPE_COLOR: Record<string, 'blue' | 'orange' | 'green' | 'purple' | 'indigo' | 'pink'> = {
        [ArtifactType.GAME]:   'blue',
        [ArtifactType.MOVIE]:  'orange',
        [ArtifactType.TVSHOW]: 'green',
        [ArtifactType.ANIME]:  'purple'
    };

    const ARTIFACT_HREF: Record<string, string> = {
        [ArtifactType.GAME]:   'game',
        [ArtifactType.MOVIE]:  'movie',
        [ArtifactType.TVSHOW]: 'tvshow',
        [ArtifactType.ANIME]:  'anime'
    };

    function fmtDate(d: string | null): string {
        if (!d) return '—';
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
    }
</script>

<div class="p-4 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold mb-2 dark:text-white">Anomalies</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Entries in your collection that may have inconsistent or missing data.
    </p>

    {#if data.groups.length === 0}
        <div class="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700">
            <ExclamationCircleOutline class="w-5 h-5 text-green-600 dark:text-green-300" />
            <p class="text-green-700 dark:text-green-200">No anomalies found — your collection looks clean!</p>
        </div>
    {:else}
        <div class="flex flex-col gap-8">
            {#each data.groups as group (group.key)}
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <ExclamationCircleOutline class="w-5 h-5 text-yellow-500" />
                        <h2 class="text-lg font-semibold dark:text-white">{group.label}</h2>
                        <Badge color="yellow">{group.entries.length}</Badge>
                    </div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{group.description}</p>
                    <Table hoverable>
                        <TableHead>
                            <TableHeadCell>Title</TableHeadCell>
                            <TableHeadCell>Type</TableHeadCell>
                            <TableHeadCell>Status</TableHeadCell>
                            <TableHeadCell>Score</TableHeadCell>
                            <TableHeadCell>Start date</TableHeadCell>
                            <TableHeadCell>End date</TableHeadCell>
                        </TableHead>
                        <TableBody>
                            {#each group.entries as entry (entry.artifactId + group.key)}
                                <TableBodyRow>
                                    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                    <TableBodyCell><a href="/{ARTIFACT_HREF[entry.type]}/{entry.artifactId}" class="hover:underline text-primary-600 dark:text-primary-400">{entry.title}</a></TableBodyCell>
                                    <TableBodyCell>
                                        <Badge color={TYPE_COLOR[entry.type] ?? 'dark'}>{TYPE_LABEL[entry.type] ?? entry.type}</Badge>
                                    </TableBodyCell>
                                    <TableBodyCell>{entry.status ?? '—'}</TableBodyCell>
                                    <TableBodyCell>{entry.score ?? '—'}</TableBodyCell>
                                    <TableBodyCell>{fmtDate(entry.startDate)}</TableBodyCell>
                                    <TableBodyCell>{fmtDate(entry.endDate)}</TableBodyCell>
                                </TableBodyRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {/each}
        </div>
    {/if}
</div>
