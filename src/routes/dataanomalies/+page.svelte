<script lang="ts">
    import { Badge, Button, Spinner, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte";
    import { ExclamationCircleOutline } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";
    import { ArtifactType } from "$lib/model/Artifact";
    import type { DataAnomalyEntry } from "./+page.server";

    export let data: PageData;

    const TYPE_LABEL: Record<string, string> = {
        [ArtifactType.GAME]:   'Game',
        [ArtifactType.MOVIE]:  'Movie',
        [ArtifactType.TVSHOW]: 'TV Show',
        [ArtifactType.ANIME]:  'Anime'
    };

    const TYPE_COLOR: Record<string, 'blue' | 'orange' | 'green' | 'purple'> = {
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

    let filteredAnimeEntries: DataAnomalyEntry[] | null = null;
    let filteringAnime = false;

    $: displayGroups = data.groups.map(group => {
        if (group.key === 'anime_no_episodes' && filteredAnimeEntries !== null) {
            return { ...group, entries: filteredAnimeEntries };
        }
        return group;
    }).filter(g => g.entries.length > 0);

    async function filterAnimeByMAL() {
        filteringAnime = true;
        try {
            const res = await fetch('/api/dataanomalies/filter-anime');
            if (res.ok) {
                filteredAnimeEntries = await res.json();
            }
        } finally {
            filteringAnime = false;
        }
    }
</script>

<div class="p-4 max-w-5xl mx-auto">
    <h1 class="text-2xl font-bold mb-2 dark:text-white">Data Anomalies</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Artifacts in the database that may have missing or incomplete data.
    </p>

    {#if displayGroups.length === 0}
        <div class="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700">
            <ExclamationCircleOutline class="w-5 h-5 text-green-600 dark:text-green-300" />
            <p class="text-green-700 dark:text-green-200">No anomalies found — the data looks clean!</p>
        </div>
    {:else}
        <div class="flex flex-col gap-8">
            {#each displayGroups as group (group.key)}
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <ExclamationCircleOutline class="w-5 h-5 text-yellow-500" />
                        <h2 class="text-lg font-semibold dark:text-white">{group.label}</h2>
                        <Badge color="yellow">{group.entries.length}</Badge>
                        {#if group.key === 'anime_no_episodes'}
                            {#if filteredAnimeEntries !== null}
                                <Badge color="green">filtered via MAL</Badge>
                            {:else}
                                <Button size="xs" color="light" disabled={filteringAnime} onclick={filterAnimeByMAL}>
                                    {#if filteringAnime}
                                        <Spinner size="4" class="mr-2" />Filtering…
                                    {:else}
                                        Filter single-episode anime via MAL
                                    {/if}
                                </Button>
                            {/if}
                        {/if}
                    </div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{group.description}</p>
                    <Table hoverable>
                        <TableHead>
                            <TableHeadCell>Title</TableHeadCell>
                            <TableHeadCell>Type</TableHeadCell>
                        </TableHead>
                        <TableBody>
                            {#each group.entries as entry (entry.artifactId)}
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
                                </TableBodyRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {/each}
        </div>
    {/if}
</div>
