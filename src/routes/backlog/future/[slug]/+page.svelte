<script lang="ts">
    import {
        Badge,
        Button,
    } from "flowbite-svelte";
    import {
        ClockSolid,
        PlusOutline,
    } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";
    import type { Price } from "$lib/types/itad/Price";
    import BacklogDrawer from "../../[slug]/components/BacklogDrawer.svelte";
    import BacklogHeader from "../../[slug]/components/BacklogHeader.svelte";
    import BacklogList from "../../[slug]/components/BacklogList.svelte";
    import BacklogModals from "../../[slug]/components/BacklogModals.svelte";
    import { backlogStore, initializeStore, refreshBacklog } from "../../[slug]/stores/BacklogStore";
    import { filteredBacklogItems } from "../../[slug]/stores/BacklogStore";
    import { pageStore, toggleDrawer } from "../../[slug]/stores/PageStore";
    import { get } from "svelte/store";
    import { moveBacklogItemToOtherBacklog as moveBacklogItemToOtherBacklogAPI } from "$lib/services/BacklogService";
    import { BacklogPageHelper } from "$lib/util/BacklogPageHelper";
    
    export let data: PageData;

    // Initialize stores
    initializeStore(data.backlog);
    
    // Convert plain objects to model instances using helper
    const { genres, backlogTags, platforms } = BacklogPageHelper.convertModelInstances(data);
    
    // Computed values
    $: backlogStoreInst = $backlogStore;
    $: totalTime = $filteredBacklogItems.reduce((acc, item) => acc + item.artifact.duration, 0);

    // Modal state
    let backlogItemsForSelect: Array<{value: number, name: string}> = [];
    let moveToRankSelected: number;
    let keepTagsSelected: boolean = false;
    let moveToBacklogSelected: number;
    let prices: Record<string, Price> = {};

    // Update backlog items for select when backlog changes
    $: if (backlogStoreInst?.backlog?.backlogItems) {
        backlogItemsForSelect = BacklogPageHelper.createBacklogItemsForSelect(backlogStoreInst.backlog.backlogItems);
    }

    // Future-specific methods  
    const onAddBacklogItem = async (artifactId: number): Promise<void> => {
        // For virtual future list, we add items by setting their status to wishlist
        // This works for items with no status or any other status
        const response = await fetch(`/api/artifact/userStatus`, {
            method: "POST",
            body: JSON.stringify({
                artifactIds: [artifactId],
                status: "wishlist"
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add item to future list');
        }
        
        await refreshBacklog();
    };

    const onDeleteBacklogItem = async (e: MouseEvent): Promise<void> => {
        const artifactIdStr = (e.currentTarget as HTMLElement)?.getAttribute("data-id");
        if (!artifactIdStr) return;
        
        const artifactId = parseInt(artifactIdStr, 10);
        
        // For virtual future list, we remove by changing status away from wishlist
        const response = await fetch(`/api/artifact/userStatus`, {
            method: "POST", 
            body: JSON.stringify({
                artifactIds: [artifactId],
                status: null
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove item from future list');
        }
        
        await refreshBacklog();
    };

    const onMoveBacklogItem = async (): Promise<void> => {
        // Future list is ordered by release date only - no manual reordering
        return Promise.resolve();
    };

    const onFetchPrices = async (): Promise<void> => {
        prices = await BacklogPageHelper.fetchPricesForBacklog(backlogStoreInst.backlog.artifactType, backlogStoreInst.backlog.backlogItems);
    };

    const moveBacklogItemToOtherBacklog = () => {
        return new Promise<void>((resolve, reject) => {
            let store = get(pageStore);
            if (!store.selectedBacklogItem) {
                reject();
                return;
            }
            moveBacklogItemToOtherBacklogAPI(backlogStoreInst.backlog.id, moveToBacklogSelected, store.selectedBacklogItem.artifact.id, keepTagsSelected).then(() => {
                refreshBacklog().then(() => {
                    resolve();
                });
            });
        });
    };

    const getDisplayTitle = () => {
        const type = backlogStoreInst.backlog.artifactType;
        return `${type.charAt(0).toUpperCase() + type.slice(1)} Coming Soon`;
    };
</script>

<svelte:head>
    <title>{getDisplayTitle()}</title>
</svelte:head>

<div class="mb-4 p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
    <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
            <Badge color="purple">
                <ClockSolid class="w-3 h-3 mr-1" />
                Virtual Future List
            </Badge>
            <span class="text-sm text-gray-600 dark:text-gray-400">
                This list automatically includes all {backlogStoreInst.backlog.artifactType}s marked as "wishlist" that are not yet released, ordered by release date.
            </span>
        </div>
    </div>
</div>

<BacklogList
    backlogItems={$filteredBacklogItems}
    canEdit={data.canEdit}
    {prices}
    onDeleteBacklogItem={onDeleteBacklogItem}
    onMoveBacklogItem={onMoveBacklogItem}
    isVirtualWishlist={true}
    {onAddBacklogItem}
>
    <BacklogHeader 
        slot="header" 
        title={getDisplayTitle()} 
        {totalTime} 
    />
    
    <div slot="empty" class="text-center py-12">
        <div class="mb-4">
            <ClockSolid class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No upcoming releases yet
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
            Start by marking some unreleased {backlogStoreInst.backlog.artifactType}s as "wishlist" to see them here.
        </p>
        <Button color="purple" onclick={toggleDrawer}>
            <PlusOutline class="w-4 h-4 mr-2" />
            Add Items
        </Button>
    </div>
</BacklogList>

<BacklogDrawer
    canEdit={data.canEdit}
    {genres}
    {backlogTags}
    {platforms}
    {onMoveBacklogItem}
    {onFetchPrices}
    {onAddBacklogItem}
/>

<BacklogModals
    {backlogItemsForSelect}
    bind:moveToRankSelected
    bind:keepTagsSelected
    bind:moveToBacklogSelected
    onMoveBacklogItem={onMoveBacklogItem}
    {moveBacklogItemToOtherBacklog}
/>

