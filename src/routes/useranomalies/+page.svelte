<script lang="ts">
    import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { ExclamationCircleOutline } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";
    import { ArtifactType } from "$lib/model/Artifact";
    import { UserArtifactStatus } from "$lib/model/UserArtifact";

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

    let updatingId: number | null = null;
    let deletingId: number | null = null;

    function fmtDate(d: string | null): string {
        if (!d) return '—';
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
    }

    async function deleteEntry(artifactId: number) {
        deletingId = artifactId;
        try {
            const response = await fetch('/api/artifact/userStatus', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artifactId })
            });
            if (response.ok) {
                data.groups = data.groups.map(g => ({
                    ...g,
                    entries: g.entries.filter(e => e.artifactId !== artifactId)
                })).filter(g => g.entries.length > 0);
            }
        } finally {
            deletingId = null;
        }
    }

    async function setAsFinished(artifactId: number) {
        updatingId = artifactId;
        try {
            const response = await fetch('/api/artifact/userStatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artifactIds: [artifactId], status: UserArtifactStatus.FINISHED })
            });
            
            if (response.ok) {
                // Remove the entry from the data
                data.groups = data.groups.map(g => ({
                    ...g,
                    entries: g.entries.filter(e => e.artifactId !== artifactId)
                })).filter(g => g.entries.length > 0);
            }
        } finally {
            updatingId = null;
        }
    }
</script>

<div class="p-4 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold mb-2 dark:text-white">User Anomalies</h1>
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
                            {#if group.key === 'end_date_not_finished'}
                                <TableHeadCell>Action</TableHeadCell>
                            {:else if group.key === 'orphaned_artifact'}
                                <TableHeadCell>Actions</TableHeadCell>
                            {/if}
                        </TableHead>
                        <TableBody>
                            {#each group.entries as entry (entry.artifactId + group.key)}
                                <TableBodyRow>
                                    <TableBodyCell>
                                        {#if entry.type && ARTIFACT_HREF[entry.type]}
                                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                            <a href="/{ARTIFACT_HREF[entry.type]}/{entry.artifactId}" class="hover:underline text-primary-600 dark:text-primary-400">{entry.title}</a>
                                        {:else}
                                            <span class="text-gray-500 dark:text-gray-400">ID: {entry.artifactId}</span>
                                        {/if}
                                    </TableBodyCell>
                                    <TableBodyCell>
                                        <Badge color={entry.type ? TYPE_COLOR[entry.type] : 'gray'}>{entry.type ? (TYPE_LABEL[entry.type] ?? entry.type) : 'Unknown'}</Badge>
                                    </TableBodyCell>
                                    <TableBodyCell>{entry.status ?? '—'}</TableBodyCell>
                                    <TableBodyCell>{entry.score ?? '—'}</TableBodyCell>
                                    <TableBodyCell>{fmtDate(entry.startDate)}</TableBodyCell>
                                    <TableBodyCell>{fmtDate(entry.endDate)}</TableBodyCell>
                                    {#if group.key === 'end_date_not_finished'}
                                        <TableBodyCell>
                                            <button 
                                                class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={updatingId === entry.artifactId}
                                                on:click={() => setAsFinished(entry.artifactId)}
                                            >
                                                {updatingId === entry.artifactId ? 'Setting...' : 'Set Finished'}
                                            </button>
                                        </TableBodyCell>
                                    {:else if group.key === 'orphaned_artifact'}
                                        <TableBodyCell>
                                            <button 
                                                class="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={deletingId === entry.artifactId}
                                                on:click={() => deleteEntry(entry.artifactId)}
                                            >
                                                {deletingId === entry.artifactId ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </TableBodyCell>
                                    {/if}
                                </TableBodyRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {/each}
        </div>
    {/if}
</div>
