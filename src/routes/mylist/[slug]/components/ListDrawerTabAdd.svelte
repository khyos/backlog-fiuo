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
    import { addUserListItem } from "$lib/services/UserListService";
    import { userListStore, refreshUserList } from "../stores/UserListStore";
    
    export let selectedTab: string = "filters";
    let searchArtifactTerm: string = "";
    let searchedArtifacts: Artifact[] = [];

    // Event Callbacks
    const fetchArtifacts = () => {
        fetch(
            `/api/${$userListStore.userList.artifactType}/search?query=${searchArtifactTerm}`,
        )
            .then((res) => res.json())
            .then((artifacts) => {
                searchedArtifacts = artifacts;
            });
    };

    const addUserListItemCb = async (e: any) => {
        const artifactId = e.currentTarget.getAttribute("data-id");
        await addUserListItem($userListStore.userList.userId, artifactId, status);
        refreshUserList();
    };

</script>

<TabItem open={selectedTab == 'add'} title="Add" class="w-full">
    <Label class="block mb-2">Add to List</Label>
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
                {#if $userListStore.userList.userListItems.find((uli) => uli.artifact.id === artifact.id) != null}
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
                            on:click={addUserListItemCb}
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
