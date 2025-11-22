<script lang="ts">
    import {
        Badge,
        Button,
        Checkbox,
        Input,
        Listgroup,
        ListgroupItem,
        Modal,
        Select,
        Toast,
    } from "flowbite-svelte";
    import {
    CheckCircleSolid,
        PlusOutline,
    } from "flowbite-svelte-icons";
    import { Tag } from "$lib/model/Tag";
    import type { PageData } from "./$types";
    import { deleteBacklogItem, moveBacklogItemToOtherBacklog as moveBacklogItemToOtherBacklogAPI } from "$lib/services/BacklogService";
    import { fetchPrices } from "$lib/services/PricesService";
    import type { Price } from "$lib/types/itad/Price";
    import BacklogDrawer from "../../[slug]/components/BacklogDrawer.svelte";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import BacklogItemComp from "../../[slug]/components/BacklogItemComp.svelte";
    import { pageStore, hideMoveToBacklog, hideMoveToRank, toggleDrawer } from "../../[slug]/stores/PageStore";
    import { copyAiPrompt, filteredBacklogItems, initializeStore, refreshBacklog } from "../../[slug]/stores/BacklogStore";
    import { tagStore } from "../../[slug]/stores/TagStore";
    import { Genre } from "$lib/model/Genre";
    import { Platform } from "$lib/model/game/Platform";
    import { get } from "svelte/store";
    import { addTag, createTag, fetchTags } from "../../[slug]/actions/TagActions";

    export let data: PageData;

    initializeStore(data.backlog);

    let backlogTags = data.backlogTags.map(backlogTag => Tag.fromJSON(backlogTag));
    let genres = data.genres.map(genre => Genre.fromJSON(genre));
    let platforms = data.platforms.map(platform => Platform.fromJSON(platform));

    let backlogItemsForSelect = data.backlog.backlogItems.map((bi) => {
        return {
            value: bi.rank,
            name: `${bi.rank} - ${bi.artifact.title}`
        };
    });
    let moveToRankSelected: number;

    let keepTagsSelected: boolean = false;
    let moveToBacklogSelected: number;

    let totalTime = data.backlog.backlogItems.reduce((acc, item) => {
        return acc + item.artifact.duration;
    }, 0);

    const deleteBacklogItemCb = async (e: MouseEvent) => {
        const artifactIdStr = (e.currentTarget as HTMLElement)?.getAttribute("data-id");
        if (!artifactIdStr) return;
        const artifactId = parseInt(artifactIdStr);
        await deleteBacklogItem(data.backlog.id, artifactId);
        refreshBacklog();
    };

    const moveBacklogItem = async (srcRank: number, targetRank: number) => {
        if (srcRank === targetRank) return Promise.resolve();
        return new Promise<void> (resolve => {
            fetch(`/api/backlog/${data.backlog.id}/move`, {
                method: "POST",
                body: JSON.stringify({
                    srcRank: srcRank,
                    targetRank: targetRank,
                }),
            }).then(() => {
                refreshBacklog().then(() => {
                    resolve();
                });
            });
        });
    };

    const moveBacklogItemToOtherBacklog = () => {
        return new Promise<void> ((resolve, reject) => {
            let store = get(pageStore);
            if (!store.selectedBacklogItem) {
                reject();
                return;
            }
            moveBacklogItemToOtherBacklogAPI(data.backlog.id, moveToBacklogSelected, store.selectedBacklogItem.artifact.id, keepTagsSelected).then(() => {
                refreshBacklog().then(() => {
                    resolve();
                });
            });
        });
    }

    let prices: Record<string, Price>;
    const fetchPricesCb = async () => {
        const artifactIds = data.backlog.backlogItems.map(bi => bi.artifact.id);
        prices = await fetchPrices(data.backlog.artifactType, artifactIds);  
    }
</script>

<Listgroup>
    <div class="flex p-1">
        <h3
            class="p-1 text-xl font-medium text-gray-900 dark:text-white"
            style="flex-grow: 1; padding-left: 1rem"
        >
            {data.backlog.title} ({TimeUtil.formatDuration(totalTime)})
        </h3>
        {#if $pageStore.isCopiedToastVisible}
            <Toast class="fixed bottom-4 left-1/2 transform -translate-x-1/2" params={{ delay: 250, duration: 1000 }} dismissable={false}>
                {#snippet icon()}
                    <CheckCircleSolid class="h-6 w-6" />
                {/snippet}
                Copied !
            </Toast>
        {/if}

        <Button size="xs" class="mr-1" onclick={copyAiPrompt}>AI</Button>
        <Button size="xs" onclick={toggleDrawer}>Filters / Add</Button>
    </div>
    {#each $filteredBacklogItems as backlogItem (backlogItem.artifact.id)}
        <ListgroupItem>
            <BacklogItemComp
                {backlogItem}
                canEdit={data.canEdit}
                {prices}
                onDeleteBacklogItem={deleteBacklogItemCb}
                onMoveBacklogItem={moveBacklogItem}
            />
        </ListgroupItem>
    {/each}
</Listgroup>

<!-- Use the extracted drawer component -->
<BacklogDrawer 
    canEdit={data.canEdit}
    {genres}
    {backlogTags}
    {platforms}
    onMoveBacklogItem={moveBacklogItem}
    onFetchPrices={fetchPricesCb}
/>

<!-- The Modals remain in the main file -->
<Modal size="xs" title="Add Tag" bind:open={$tagStore.showAddTag} autoclose>
    <div style="display: flex; align-items: center;" class="mb-2">
        <Input
            type="text"
            id="search-field-tag"
            placeholder="Search"
            autocomplete="off"
            class="mr-1"
            style="flex-grow: 1;"
            bind:value={$tagStore.searchTagTerm}
            oninput={fetchTags}
        />
        <Button
            size="xs"
            disabled={$tagStore.searchTagTerm.length < 2}
            onclick={createTag}><PlusOutline size="sm" /></Button
        >
    </div>
    {#each $tagStore.searchedTags as tag (tag.id)}
        <Button size="xs" class="m-1" onclick={() => addTag(tag.id)}
            >{tag.id}</Button
        >
    {/each}
</Modal>

<Modal size="xs" title="Move to Rank" bind:open={$pageStore.showMoveToRank} autoclose>
    Move <Badge class="mr-2 gap-1" color="blue"># {$pageStore.selectedBacklogItem!.rank}</Badge><b>{$pageStore.selectedBacklogItem!.artifact.title}</b> to
    <Select class="mt-2" items={backlogItemsForSelect} bind:value={moveToRankSelected} />
    <Button class="mt-2" onclick={() => {
        moveBacklogItem($pageStore.selectedBacklogItem!.rank, moveToRankSelected).then(() => {
            hideMoveToRank();
        });
    }}>Move</Button>
</Modal>

<Modal size="xs" title="Move to Backlog" bind:open={$pageStore.showMoveToBacklog} autoclose>
    Move <Badge class="mr-2 gap-1" color="blue"># {$pageStore.selectedBacklogItem!.rank}</Badge><b>{$pageStore.selectedBacklogItem!.artifact.title}</b> to
    <Select class="mt-2" items={$pageStore.backlogsForSelect} bind:value={moveToBacklogSelected} />
    <Checkbox bind:checked={keepTagsSelected}>Keep tags</Checkbox>
    <Button class="mt-2" onclick={() => {
        moveBacklogItemToOtherBacklog().then(() => {
            hideMoveToBacklog();
        });
    }}>Move</Button>
</Modal>