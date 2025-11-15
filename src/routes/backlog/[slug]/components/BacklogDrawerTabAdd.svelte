<script lang="ts">
    import { 
        Button, 
        Input, 
        Label, 
        Listgroup, 
        ListgroupItem, 
        TabItem, 
    } from "flowbite-svelte";
    import {
        CheckCircleOutline,
        PlusOutline,
    } from "flowbite-svelte-icons";
    import type { Artifact } from "$lib/model/Artifact";
    import { addBacklogItem } from "$lib/services/BacklogService";
    import { backlogStore, refreshBacklog } from "../stores/BacklogStore";
    
    export let selectedTab: string = "filters";
    export let canEdit: boolean;
    export let onAddBacklogItem: ((artifactId: number) => Promise<void>) | undefined = undefined;
    let searchArtifactTerm: string = "";
    let searchedArtifacts: Artifact[] = [];
    
    // Check if this is a virtual wishlist (backlog id = -1)
    $: isVirtualWishlist = $backlogStore.backlog.id === -1;

    // Event Callbacks
    const fetchArtifacts = () => {
        fetch(
            `/api/${$backlogStore.backlog.artifactType}/search?query=${searchArtifactTerm}`,
        )
            .then((res) => res.json())
            .then((artifacts) => {
                searchedArtifacts = artifacts;
            });
    };

    const addBacklogItemCb = async (e: MouseEvent) => {
        const artifactIdStr = (e.currentTarget as HTMLElement)?.getAttribute("data-id");
        if (!artifactIdStr) return;
        const artifactId = parseInt(artifactIdStr);
        
        if (isVirtualWishlist && onAddBacklogItem) {
            // For virtual wishlist, use the provided wishlist add function
            await onAddBacklogItem(artifactId);
        } else {
            // For regular backlogs, use the standard backlog add function
            await addBacklogItem($backlogStore.backlog.id, artifactId);
        }
        
        refreshBacklog();
    };

</script>

<TabItem open={selectedTab == 'add'} title="Add" class="w-full" disabled={!canEdit}>
    <Label class="block mb-2">{isVirtualWishlist ? 'Add to wishlist' : 'Add to backlog'}</Label>
    <Input
        id="search-field"
        placeholder="Search"
        autocomplete="off"
        bind:value={searchArtifactTerm}
        onkeyup={fetchArtifacts}
    />
    {#if searchedArtifacts?.length > 0}
        <Listgroup>
            {#each searchedArtifacts as artifact (artifact.id)}
                {#if $backlogStore.backlog.backlogItems.find((bi) => bi.artifact.id === artifact.id) != null}
                    <ListgroupItem class="flex justify-between items-center w-full">
                        <div class="flex-auto overflow-hidden text-ellipsis">{artifact.title}</div>
                        <CheckCircleOutline class="flex-none" />
                    </ListgroupItem>
                {:else}
                    <ListgroupItem class="flex justify-between items-center w-full">
                        <div class="flex-auto overflow-hidden text-ellipsis">{artifact.title}</div>
                        <Button
                            size="xs"
                            class="flex-none"
                            data-id={artifact.id}
                            onclick={addBacklogItemCb}
                        >
                            <PlusOutline size="xs" />
                        </Button>
                    </ListgroupItem>
                {/if}
            {/each}
        </Listgroup>
    {:else if searchArtifactTerm.length > 0}
        <p class="text-sm text-gray-500 dark:text-gray-400">
            No results
        </p>
    {/if}
</TabItem>
