<script lang="ts">
    import type { PageData } from "./$types";
    import { deleteBacklogItem, moveBacklogItemToOtherBacklog as moveBacklogItemToOtherBacklogAPI } from "$lib/services/BacklogService";
    import type { Price } from "$lib/types/itad/Price";
    import BacklogDrawer from "./components/BacklogDrawer.svelte";
    import BacklogHeader from "./components/BacklogHeader.svelte";
    import BacklogList from "./components/BacklogList.svelte";
    import BacklogModals from "./components/BacklogModals.svelte";
    import { filteredBacklogItems, initializeStore, refreshBacklog, backlogStore } from "./stores/BacklogStore";
    import { get } from "svelte/store";
    import { BacklogPageHelper } from "$lib/util/BacklogPageHelper";
    import { pageStore } from "./stores/PageStore";

    export let data: PageData;

    // initialize the shared store with server data
    initializeStore(data.backlog);

    const { genres, backlogTags, platforms } = BacklogPageHelper.convertModelInstances(data);

    // derive total time reactively from the backlog store
    $: totalTime = $backlogStore.backlog.backlogItems.reduce((acc, item) => acc + item.artifact.duration, 0);

    // create select options reactively from the store's backlog items
    let backlogItemsForSelect: {
        value: number;
        name: string;
    }[];
    $: backlogItemsForSelect = BacklogPageHelper.createBacklogItemsForSelect($backlogStore.backlog.backlogItems);
    let moveToRankSelected: number;
    let keepTagsSelected: boolean = false;
    let moveToBacklogSelected: number;
    let prices: Record<string, Price> = {};

    const deleteBacklogItemCb = async (e: MouseEvent) => {
        const artifactIdStr = (e.currentTarget as HTMLElement)?.getAttribute("data-id");
        if (!artifactIdStr) return;
        const artifactId = parseInt(artifactIdStr);
        await deleteBacklogItem(get(backlogStore).backlog.id, artifactId);
        refreshBacklog();
    };

    const moveBacklogItem = async (srcRank: number, targetRank: number) => {
        if (srcRank === targetRank) return Promise.resolve();
        return new Promise<void> (resolve => {
            fetch(`/api/backlog/${get(backlogStore).backlog.id}/move`, {
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
            moveBacklogItemToOtherBacklogAPI(get(backlogStore).backlog.id, moveToBacklogSelected, store.selectedBacklogItem.artifact.id, keepTagsSelected).then(() => {
                refreshBacklog().then(() => {
                    resolve();
                });
            });
        });
    }

    const fetchPricesCb = async () => {
        const b = get(backlogStore).backlog;
        prices = await BacklogPageHelper.fetchPricesForBacklog(b.artifactType, b.backlogItems);
    }
</script>

<BacklogList
    backlogItems={$filteredBacklogItems}
    canEdit={data.canEdit}
    {prices}
    onDeleteBacklogItem={deleteBacklogItemCb}
    onMoveBacklogItem={moveBacklogItem}
>
    <BacklogHeader 
        slot="header" 
        title={$backlogStore.backlog.title} 
        {totalTime} 
    />
</BacklogList>

<!-- Use the extracted drawer component -->
<BacklogDrawer 
    canEdit={data.canEdit}
    {genres}
    {backlogTags}
    {platforms}
    onMoveBacklogItem={moveBacklogItem}
    onFetchPrices={fetchPricesCb}
/>

<BacklogModals
    {backlogItemsForSelect}
    bind:moveToRankSelected
    bind:keepTagsSelected
    bind:moveToBacklogSelected
    onMoveBacklogItem={moveBacklogItem}
    {moveBacklogItemToOtherBacklog}
/>