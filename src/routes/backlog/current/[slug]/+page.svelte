<script lang="ts">
    import {
        Badge,
        Button,
        Modal,
    } from "flowbite-svelte";
    import {
        CheckCircleSolid,
        PlusOutline,
        CogSolid,
    } from "flowbite-svelte-icons";
    import type { PageData } from "../../current/[slug]/$types";
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
    import { BacklogRankingType } from "$lib/model/Backlog";
    
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
    
    // Ranking type configuration
    let showRankingTypeModal = false;
    let currentRankingType = data.currentRankingType || BacklogRankingType.ELO;
    
    const rankingTypeOptions = [
        { value: BacklogRankingType.ELO, name: "ELO Rating System" },
        { value: BacklogRankingType.RANK, name: "Manual Ranking" }
    ];

    // Update backlog items for select when backlog changes
    $: if (backlogStoreInst?.backlog?.backlogItems) {
        backlogItemsForSelect = BacklogPageHelper.createBacklogItemsForSelect(backlogStoreInst.backlog.backlogItems);
    }

    // Wishlist-specific methods  
    const onAddBacklogItem = async (artifactId: number): Promise<void> => {
        // For virtual wishlist, we add items by setting their status to wishlist
        // This works for items with no status or any other status
        const response = await fetch(`/api/artifact/userStatus`, {
            method: "POST",
            body: JSON.stringify({
                artifactIds: [artifactId],
                status: "wishlist"
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add item to wishlist');
        }
        
        await refreshBacklog();
    };

    const onDeleteBacklogItem = async (e: MouseEvent): Promise<void> => {
        const artifactIdStr = (e.currentTarget as HTMLElement)?.getAttribute("data-id");
        if (!artifactIdStr) return;
        
        const artifactId = parseInt(artifactIdStr, 10);
        
        // For virtual wishlist, we remove by changing status away from wishlist
        const response = await fetch(`/api/artifact/userStatus`, {
            method: "POST", 
            body: JSON.stringify({
                artifactIds: [artifactId],
                status: null
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove item from wishlist');
        }
        
        await refreshBacklog();
    };

    const onMoveBacklogItem = async (srcRank: number, targetRank: number): Promise<void> => {
        if (srcRank === targetRank) return Promise.resolve();
        return new Promise<void>(resolve => {
            fetch(`/api/backlog/current/${backlogStoreInst.backlog.artifactType}/move`, {
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
        return `${type.charAt(0).toUpperCase() + type.slice(1)} Current Backlog`;
    };
    
    const changeRankingType = async () => {
        try {
            const response = await fetch(`/api/backlog/current/${backlogStoreInst.backlog.artifactType}/ranking-type`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    rankingType: currentRankingType
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to change ranking type');
            }
            
            showRankingTypeModal = false;
            await refreshBacklog();
        } catch (error) {
            console.error('Error changing ranking type:', error);
        }
    };
    
    const getRankingTypeDescription = (rankingType: BacklogRankingType) => {
        switch (rankingType) {
            case BacklogRankingType.ELO:
                return "Use the ELO rating system to prioritize items by comparing them head-to-head. Items with higher ELO ratings are ranked higher.";
            case BacklogRankingType.RANK:
                return "Manually drag and drop items to set their exact position. Perfect for when you know exactly how you want to order your wishlist.";
            default:
                return "";
        }
    };
</script>

<svelte:head>
    <title>{getDisplayTitle()}</title>
</svelte:head>

<div class="mb-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
    <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
            <Badge color="blue">
                <CheckCircleSolid class="w-3 h-3 mr-1" />
                Virtual Wishlist
            </Badge>
            <span class="text-sm text-gray-600 dark:text-gray-400">
                This list automatically includes all {backlogStoreInst.backlog.artifactType}s marked as "wishlist".
                {#if backlogStoreInst.backlog.rankingType === BacklogRankingType.ELO}
                    Use the ELO ranking system to prioritize what to play/watch next!
                {:else if backlogStoreInst.backlog.rankingType === BacklogRankingType.RANK}
                    Drag and drop items to manually organize your priorities!
                {/if}
            </span>
        </div>
        {#if data.canEdit}
            <Button 
                size="xs" 
                color="light" 
                class="!p-1.5"
                onclick={() => showRankingTypeModal = true}
                title="Configure ranking system"
            >
                <CogSolid class="w-4 h-4" />
            </Button>
        {/if}
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
            <PlusOutline class="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No wishlist items yet
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
            Start by marking some {backlogStoreInst.backlog.artifactType}s as "wishlist" to see them here.
        </p>
        <Button color="blue" onclick={toggleDrawer}>
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

<!-- Ranking Type Configuration Modal -->
<Modal bind:open={showRankingTypeModal} title="Configure Wishlist Ranking System">
    <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
            Choose how you want your wishlist items to be ordered:
        </p>
        
        <div class="space-y-3">
            {#each rankingTypeOptions as option (option.value)}
                <div class="flex items-start space-x-3">
                    <input
                        type="radio"
                        id={option.value}
                        name="rankingType"
                        value={option.value}
                        bind:group={currentRankingType}
                        class="mt-1"
                    />
                    <div class="flex-1">
                        <label for={option.value} class="font-medium text-gray-900 dark:text-white cursor-pointer">
                            {option.name}
                        </label>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            {getRankingTypeDescription(option.value)}
                        </p>
                    </div>
                </div>
            {/each}
        </div>
        
        {#if currentRankingType !== data.currentRankingType}
            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p class="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Changing the ranking system will reorganize your wishlist according to the new rules.
                    {#if currentRankingType === BacklogRankingType.ELO}
                        Items without ELO ratings will start with a default rating of 1200.
                    {:else if currentRankingType === BacklogRankingType.RANK}
                        Items will be arranged in their current order, which you can then manually adjust.
                    {/if}
                </p>
            </div>
        {/if}
        
        <div class="flex space-x-2 mt-6">
            <Button color="blue" onclick={changeRankingType} disabled={currentRankingType === data.currentRankingType}>
                Apply Changes
            </Button>
            <Button color="alternative" onclick={() => {
                currentRankingType = data.currentRankingType;
                showRankingTypeModal = false;
            }}>
                Cancel
            </Button>
        </div>
    </div>
</Modal>