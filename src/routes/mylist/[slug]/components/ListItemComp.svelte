<script lang="ts">
    import { TableBodyCell, TableBodyRow } from "flowbite-svelte";
    import { userListStore } from "../stores/UserListStore";
    import type { Artifact } from "$lib/model/Artifact";

    export let artifact: Artifact;

    $: userListStoreInst = $userListStore;
</script>

<TableBodyRow>
    <TableBodyCell><a class='mr-1' href={`/${userListStoreInst.userList.artifactType}/${artifact.id}`}>{artifact.title}</a></TableBodyCell>
    <TableBodyCell>{artifact.userInfo?.score}</TableBodyCell>
    <TableBodyCell>{artifact.userInfo?.status}</TableBodyCell>
    <TableBodyCell>{artifact.userInfo?.startDate}</TableBodyCell>
    <TableBodyCell>{artifact.userInfo?.endDate}</TableBodyCell>
</TableBodyRow>