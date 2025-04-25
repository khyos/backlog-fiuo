<script lang="ts">
    import { 
        Badge,
        Button, 
        TabItem,
        Card,
        Heading,
        P
    } from "flowbite-svelte";
    import { BacklogRankingType } from "$lib/model/Backlog";
    import { getRandomItemA, getRandomItemB, orderByFightStore, startOrderByFight, updateItemA } from "$lib/stores/OrderByFightStore";
    import { get } from "svelte/store";
    import { AwardOutline, CheckCircleOutline, RefreshOutline, ThumbsDownOutline, ThumbsUpOutline } from "flowbite-svelte-icons";
    import type { BacklogItem } from "$lib/model/BacklogItem";
    import { backlogStore, refreshBacklog } from "../stores/BacklogStore";

    export let selectedTab: string = "filters";
    export let canEdit: boolean;

    // Event Callbacks
    export let onMoveBacklogItem: (srcRank: number, targetRank: number) => Promise<void>;

    $: store = $orderByFightStore;
    $: backlogStoreInst = $backlogStore;

    // Loading states
    let isLoading = false;

    const orderByEloFight = async (winner: string) => {
        isLoading = true;
        let backlogStoreInst = get(backlogStore);
        let store = get(orderByFightStore);
        if (!store.itemA || !store.itemB) {
            return;
        }
        let winnerItem: BacklogItem;
        let loserItem: BacklogItem;
        if (winner === "A") {
            winnerItem = store.itemA;
            loserItem = store.itemB;
        } else {
            winnerItem = store.itemB;
            loserItem = store.itemA;
        }
        
        try {
            await fetch(`/api/backlog/${backlogStoreInst.backlog.id}/elo`, {
                method: "POST",
                body: JSON.stringify({
                    winnerArtifactId: winnerItem.artifact.id,
                    loserArtifactId: loserItem.artifact.id,
                }),
            });
            
            await refreshBacklog();
            if (store.pickType === 'random') {
                await getRandomItemA();
            } else {
                await updateItemA();
            }
            await getRandomItemB();
        } catch (error) {
            console.error("Error updating ELO rankings:", error);
        } finally {
            isLoading = false;
        }
    }

    const orderByComparisonPickHigher = async () => {
        isLoading = true;
        try {
            let store = get(orderByFightStore);
            if (!store.itemA || !store.itemB) {
                return;
            }

            orderByFightStore.update(s => ({
                ...s,
                lowestValue: store.itemB.rank - 1
            }));

            let backlogStoreInst = get(backlogStore);
            
            if (store.itemB.rank < store.itemA.rank) {
                await onMoveBacklogItem(store.itemA.rank, store.itemB.rank);
                let newItemA = backlogStoreInst.backlog.backlogItems[store.itemB.rank - 1];
                orderByFightStore.update(s => ({
                    ...s,
                    itemA: newItemA
                }));
            }
            await getRandomItemB();
        } catch (error) {
            console.error("Error moving item higher:", error);
        } finally {
            isLoading = false;
        }
    }

    const orderByComparisonPickLower = async () => {
        isLoading = true;
        try {
            let store = get(orderByFightStore);
            if (!store.itemA || !store.itemB) {
                return;
            }

            orderByFightStore.update(s => ({
                ...s,
                highestValue: store.itemB.rank + 2
            }));

            let backlogStoreInst = get(backlogStore);
            
            if (store.itemB.rank > store.itemA.rank) {
                await onMoveBacklogItem(store.itemA.rank, store.itemB.rank);
                let newItemA = backlogStoreInst.backlog.backlogItems[store.itemB.rank - 1];
                orderByFightStore.update(s => ({
                    ...s,
                    itemA: newItemA
                }));
            }
            await getRandomItemB();
        } catch (error) {
            console.error("Error moving item lower:", error);
        } finally {
            isLoading = false;
        }
    }

    const startRanking = () => {
        isLoading = true;
        try {
            startOrderByFight();
        } catch (error) {
            console.error("Error starting ranking process:", error);
        } finally {
            isLoading = false;
        }
    }
</script>

<TabItem open={selectedTab == 'order'} title="Order" class="w-full" disabled={!canEdit}>
    <div class="p-4 bg-gray-50 rounded-lg">
        {#if !store.itemA || !store.itemB}
            <Card class="text-center mb-4">
                <Heading tag="h4" class="mb-2">Backlog Ordering</Heading>
                <P class="mb-4">
                    {#if backlogStoreInst.backlog.rankingType === BacklogRankingType.RANK}
                        Arrange your backlog items in order of priority by comparing them one by one.
                    {:else}
                        Compare items head-to-head to generate ELO rankings for your backlog.
                    {/if}
                </P>
                <Button 
                    color="blue" 
                    class="mx-auto" 
                    on:click={startRanking}
                    disabled={isLoading}
                >
                    <div class="flex items-center gap-2">
                        <RefreshOutline class="w-4 h-4" />
                        <span>Start Ordering</span>
                    </div>
                </Button>
            </Card>
        {:else}
            {#if backlogStoreInst.backlog.rankingType === BacklogRankingType.RANK}
                <div class="space-y-4">
                    <Card padding="md" class="relative">
                        <div class="absolute top-2 right-2">
                            <Badge color="blue" class="font-semibold">#{store.itemA.rank}</Badge>
                        </div>
                        <Heading tag="h5" class="pb-2">Item to Order</Heading>
                        <P class="font-medium">{store.itemA.artifact.title}</P>
                    </Card>
                    
                    <Card padding="md" class="relative">
                        <div class="absolute top-2 right-2">
                            <Badge color="blue" class="font-semibold">#{store.itemB.rank}</Badge>
                        </div>
                        <Heading tag="h5" class="pb-2">Compared to</Heading>
                        <P class="font-medium">{store.itemB.artifact.title}</P>
                    </Card>
                    
                    <div class="flex gap-2 justify-center">
                        <Button 
                            color="blue" 
                            on:click={orderByComparisonPickHigher}
                            disabled={isLoading}
                        >
                            <div class="flex items-center gap-2">
                                <ThumbsUpOutline class="w-4 h-4" />
                                <span>Higher</span>
                            </div>
                        </Button>

                        <Button 
                            color="green" 
                            on:click={() => startRanking()}
                            disabled={isLoading}
                        >
                            <div class="flex items-center gap-2">
                                <CheckCircleOutline class="w-4 h-4" />
                                <span>Keep</span>
                            </div>
                        </Button>
                    
                        <Button 
                            color="blue" 
                            on:click={orderByComparisonPickLower}
                            disabled={isLoading}
                        >
                            <div class="flex items-center gap-2">
                                <ThumbsDownOutline class="w-4 h-4" />
                                <span>Lower</span>
                            </div>
                        </Button>
                    </div>
                </div>
            {:else if backlogStoreInst.backlog.rankingType === BacklogRankingType.ELO}
                <Heading tag="h5" class="mb-4 text-center">Which item do you prefer?</Heading>
                <div class="grid grid-cols-2 gap-4">
                    <Card 
                        padding="sm" 
                        class="hover:bg-blue-50 transition-colors cursor-pointer relative"
                        on:click={() => orderByEloFight("A")}
                    >
                        <div class="absolute top-2 left-2 z-10">
                            <Badge color="blue" class="font-semibold flex items-center gap-1">
                                # {store.itemA.rank}
                            </Badge>
                        </div>
                        <div class="absolute top-2 right-2 z-10">
                            <Badge color="purple" class="font-semibold flex items-center gap-1">
                                <AwardOutline class="w-3 h-3" />
                                <span>{store.itemA.elo}</span>
                            </Badge>
                        </div>
                        <div class="relative mt-4 mb-2 overflow-hidden rounded-md">
                            <img 
                                src={store.itemAPoster}
                                alt=''
                                class="object-cover w-full h-full"
                            />
                        </div>
                        <P class="font-small text-center">{store.itemA.artifact.title} ({new Date(store.itemA.artifact.releaseDate).getFullYear()})</P>
                    </Card>
                    
                    <Card 
                        padding="sm" 
                        class="hover:bg-blue-50 transition-colors cursor-pointer relative"
                        on:click={() => orderByEloFight("B")}
                    >
                        <div class="absolute top-2 left-2 z-10">
                            <Badge color="blue" class="font-semibold flex items-center gap-1">
                                # {store.itemB.rank}
                            </Badge>
                        </div>
                        <div class="absolute top-2 right-2 z-10">
                            <Badge color="purple" class="font-semibold flex items-center gap-1">
                                <AwardOutline class="w-3 h-3" />
                                <span>{store.itemB.elo}</span>
                            </Badge>
                        </div>
                        <div class="relative mt-4 mb-2 overflow-hidden rounded-md">
                            <img 
                                src={store.itemBPoster} 
                                alt=''
                                class="object-cover w-full h-full"
                            />
                        </div>
                        <P class="font-small text-center">{store.itemB.artifact.title} ({new Date(store.itemB.artifact.releaseDate).getFullYear()})</P>
                    </Card>
                </div>
                
                <div class="mt-4 text-center">
                    <Button 
                        color="light" 
                        size="sm" 
                        on:click={startRanking}
                        disabled={isLoading}
                    >
                        <div class="flex items-center gap-2">
                            <RefreshOutline class="w-3 h-3" />
                            <span>Pick Different Items</span>
                        </div>
                    </Button>
                </div>
            {/if}
        {/if}
    </div>
</TabItem>