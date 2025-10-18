<script lang="ts">
    import {
        Button,
        Table,
        TableBody,
        TableHead,
        TableHeadCell,
    } from "flowbite-svelte";
    import type { PageData } from "./$types";
    import ListDrawer from "./components/ListDrawer.svelte";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import ListItemComp from "./components/ListItemComp.svelte";
    import { toggleDrawer } from "./stores/PageStore";
    import { filteredArtifacts, initializeStore } from "./stores/UserListStore";
    import { Genre } from "$lib/model/Genre";
    import { Platform } from "$lib/model/game/Platform";
    import { ArtifactType } from "$lib/model/Artifact";

    export let data: PageData;

    initializeStore(data.list);

    let genres = data.genres.map(genre => Genre.fromJSON(genre));
    let platforms = data.platforms.map(platform => Platform.fromJSON(platform));

    let totalTime = data.list.artifacts.reduce((acc, artifact) => {
        return acc + artifact.duration;
    }, 0);
</script>

<div style="display:flex">
    <h3
        class="p-1 text-xl font-medium text-gray-900 dark:text-white"
        style="flex-grow: 1; padding-left: 1rem"
    >
        {data.list.artifactType} ({TimeUtil.formatDuration(totalTime)})
    </h3>
    <Button onclick={toggleDrawer}>Filters / Add</Button>
</div>
<Table>
    <TableHead>
        <TableHeadCell>Title</TableHeadCell>
        <TableHeadCell>Score</TableHeadCell>
        <TableHeadCell>Status</TableHeadCell>
        {#if data.list.artifactType === ArtifactType.MOVIE}
        <TableHeadCell>Date</TableHeadCell>
        {:else}
        <TableHeadCell>Start Date</TableHeadCell>
        <TableHeadCell>End Date</TableHeadCell>
        {/if}
    </TableHead>
    <TableBody>
        {#each $filteredArtifacts as artifact}
            <ListItemComp
                {artifact}
            />
        {/each}
    </TableBody>
</Table>

<ListDrawer 
    {genres}
    {platforms}
/>