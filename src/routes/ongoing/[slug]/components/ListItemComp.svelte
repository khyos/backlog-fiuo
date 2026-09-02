<script lang="ts">
    import { Button, TableBodyCell, TableBodyRow } from "flowbite-svelte";
    import { updateStatus, userListStore } from "../stores/UserListStore";
    import { type Artifact } from "$lib/model/Artifact";
    import { CirclePauseSolid, ClapperboardPlaySolid, ClockArrowOutline } from "flowbite-svelte-icons";
    import { UserArtifactStatus } from "$lib/model/UserArtifact";
    import { TimeUtil } from "$lib/util/TimeUtil";

    export let artifact: Artifact;

    $: userListStoreInst = $userListStore;
    let lastAndNext = artifact.lastAndNextOngoing;
    $: { void $userListStore; lastAndNext = artifact.lastAndNextOngoing; }
</script>

<TableBodyRow class="text-gray-950 border-gray-300">
    <TableBodyCell>
        <div style="display: inline-flex">
            {#if artifact.userInfo?.status === UserArtifactStatus.ON_GOING}
            <ClapperboardPlaySolid size="sm" color="green" class="mr-1" style='margin-top:auto; margin-bottom:auto'/>
            {:else if artifact.userInfo?.status === UserArtifactStatus.ON_HOLD}
            <CirclePauseSolid size="sm" color="orange" class="mr-1" style='margin-top:auto; margin-bottom:auto'/>
            {/if}
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
            <a class='mr-1' href={`/${userListStoreInst.userList.artifactType}/${artifact.id}`}>{artifact.title}</a>
        </div>
    </TableBodyCell>
    <TableBodyCell>
        {lastAndNext.last?.numbering}
        <br />
        <span class="font-normal truncate block max-w-xs" title={lastAndNext.last?.title}>{lastAndNext.last?.title}</span>
    </TableBodyCell>
    <TableBodyCell>
        <div style="display: inline-flex">
            {#if lastAndNext.next}
                {lastAndNext.next?.numbering} - {TimeUtil.formatDate(lastAndNext.next?.releaseDate)}
                {#if lastAndNext.next?.releaseDate && new Date() < lastAndNext.next?.releaseDate}
                <ClockArrowOutline size="xs" color="navy" class="ml-1" style='transform: scale(-1, 1); margin-top:auto; margin-bottom:auto'/>
                {/if}
            {:else}
                -
            {/if}
        </div>
        <br />
        <span class="font-normal truncate block max-w-xs" title={lastAndNext.next?.title}>{lastAndNext.next?.title}</span>
    </TableBodyCell>
    <TableBodyCell>
        {#if lastAndNext.next}
            <Button size="xs" onclick={() => updateStatus(lastAndNext.next!.id)}>Seen</Button>
        {/if}
    </TableBodyCell>
</TableBodyRow>