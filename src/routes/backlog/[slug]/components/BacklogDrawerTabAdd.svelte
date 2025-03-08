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
    import type { PageData } from "../$types";
    import type { Artifact } from "$lib/model/Artifact";
    import { addBacklogItem } from "$lib/services/BacklogService";
    
    export let selectedTab: string = "filters";
    export let canEdit: boolean;
    export let backlog: PageData['backlog'];
    export let refreshBacklog: () => Promise<void>;
    let searchArtifactTerm: string = "";
    let searchedArtifacts: Artifact[] = [];

    // Event Callbacks
    const fetchArtifacts = () => {
        fetch(
            `/api/${backlog.artifactType}/search?query=${searchArtifactTerm}`,
        )
            .then((res) => res.json())
            .then((artifacts) => {
                searchedArtifacts = artifacts;
            });
    };

    const addBacklogItemCb = async (e: any) => {
        const artifactId = e.currentTarget.getAttribute("data-id");
        await addBacklogItem(backlog.id, artifactId);
        refreshBacklog();
    };

</script>

<TabItem open={selectedTab == 'add'} title="Add" class="w-full" disabled={!canEdit}>
    <Label class="block mb-2">Add to backlog</Label>
    <Input
        type="text"
        id="search-field"
        placeholder="Search"
        autocomplete="off"
        bind:value={searchArtifactTerm}
        on:input={fetchArtifacts}
    />
    {#if searchedArtifacts?.length > 0}
        <Listgroup>
            {#each searchedArtifacts as artifact}
                {#if backlog.backlogItems.find((bi) => bi.artifact.id === artifact.id) != null}
                    <ListgroupItem>
                        <div style="display: inline-flex;">
                            {artifact.title}<CheckCircleOutline />
                        </div>
                    </ListgroupItem>
                {:else}
                    <ListgroupItem>
                        {artifact.title}
                        <Button
                            size="xs"
                            data-id={artifact.id}
                            on:click={addBacklogItemCb}
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
