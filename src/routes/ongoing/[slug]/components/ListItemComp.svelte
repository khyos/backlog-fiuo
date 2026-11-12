<script lang="ts">
    import { Button, TableBodyCell, TableBodyRow } from "flowbite-svelte";
    import { updateStatus, userListStore } from "../stores/UserListStore";
    import { type Artifact } from "#lib/model/Artifact";
    import { CirclePauseSolid, ClapperboardPlaySolid, ClockArrowOutline } from "flowbite-svelte-icons";
    import { UserArtifactStatus } from "#lib/model/UserArtifact";
    import { TimeUtil } from "#lib/util/TimeUtil";
    import { ArtifactTypeUtil } from "#lib/model/ArtifactTypeUtil";

    export let artifact: Artifact;

    $: userListStoreInst = $userListStore;
    let trackingProgress = artifact.getOngoingTrackingProgress();
    $: hasNext = trackingProgress.some((progress) => progress.next !== null);
    $: {
        void $userListStore;
        trackingProgress = artifact.getOngoingTrackingProgress();
    }
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
        {#each trackingProgress as progress (progress.childType)}
            {#if progress.last}
                <div>{ArtifactTypeUtil.getTypeName(progress.childType)} {progress.last.numbering}</div>
                <span class="font-normal truncate block max-w-xs" title={progress.last.title}>{progress.last.title}</span>
            {/if}
        {/each}
    </TableBodyCell>
    <TableBodyCell>
        {#if hasNext}
            {#each trackingProgress as progress (progress.childType)}
                {#if progress.next}
                    <div class="inline-flex">
                        {ArtifactTypeUtil.getTypeName(progress.childType)} {progress.next.numbering} - {TimeUtil.formatDate(progress.next.releaseDate)}
                        {#if progress.next.releaseDate && new Date() < progress.next.releaseDate}
                            <ClockArrowOutline size="xs" color="navy" class="ml-1" style='transform: scale(-1, 1); margin-top:auto; margin-bottom:auto'/>
                        {/if}
                    </div>
                    <span class="font-normal truncate block max-w-xs" title={progress.next.title}>{progress.next.title}</span>
                {/if}
            {/each}
        {:else}
            -
        {/if}
    </TableBodyCell>
    <TableBodyCell>
        {#each trackingProgress as progress (progress.childType)}
            {#if progress.next}
                <div>
                    <Button size="xs" class="mb-1" onclick={() => updateStatus(progress.next!.id)}>
                        Seen {ArtifactTypeUtil.getTypeName(progress.childType).toLowerCase()}
                    </Button>
                </div>
            {/if}
        {/each}
    </TableBodyCell>
</TableBodyRow>