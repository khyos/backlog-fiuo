<script lang="ts">
    import {
        Table,
        TableBody,
        TableHead,
        TableHeadCell,
    } from "flowbite-svelte";
    import type { PageData } from "./$types";
    import ListItemComp from "./components/ListItemComp.svelte";
    import { userListStore, initializeStore } from "./stores/UserListStore";

    export let data: PageData;

    initializeStore(data.list);
</script>

<Table>
    <TableHead>
        <TableHeadCell>Title</TableHeadCell>
        <TableHeadCell>Last Seen</TableHeadCell>
        <TableHeadCell>Next</TableHeadCell>
        <TableHeadCell></TableHeadCell>
    </TableHead>
    <TableBody tableBodyClass="divide-y">
        {#each $userListStore.userList.artifacts as artifact}
            <ListItemComp
                {artifact}
            />
        {/each}
    </TableBody>
</Table>