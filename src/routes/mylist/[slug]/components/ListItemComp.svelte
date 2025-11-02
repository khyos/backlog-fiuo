<script lang="ts">
    import { TableBodyCell, TableBodyRow } from "flowbite-svelte";
    import { userListStore } from "../stores/UserListStore";
    import { ArtifactType, type Artifact } from "$lib/model/Artifact";

    export let artifact: Artifact;

    $: userListStoreInst = $userListStore;
</script>

<TableBodyRow>
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <TableBodyCell><a class='mr-1' href={`/${userListStoreInst.userList.artifactType}/${artifact.id}`}>{artifact.title}</a></TableBodyCell>
    <TableBodyCell>{artifact.userInfo?.score}</TableBodyCell>
    <TableBodyCell>{artifact.userInfo?.status}</TableBodyCell>
    {#if artifact.type === ArtifactType.MOVIE}
    <TableBodyCell>{artifact.userInfo?.startDate?.toLocaleDateString()}</TableBodyCell>
    {:else}
    <TableBodyCell>{artifact.userInfo?.startDate?.toLocaleDateString()}</TableBodyCell>
    <TableBodyCell>{artifact.userInfo?.endDate?.toLocaleDateString()}</TableBodyCell>
    {/if}
</TableBodyRow>