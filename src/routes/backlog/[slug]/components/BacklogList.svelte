<script lang="ts">
    import { Listgroup, ListgroupItem } from "flowbite-svelte";
    import BacklogItemComp from "./BacklogItemComp.svelte";
    import type { BacklogItem } from "$lib/model/BacklogItem";
    import type { Price } from "$lib/types/itad/Price";

    export let backlogItems: BacklogItem[];
    export let canEdit: boolean;
    export let prices: Record<string, Price> = {};
    export let onDeleteBacklogItem: (e: MouseEvent) => Promise<void>;
    export let onMoveBacklogItem: (srcRank: number, targetRank: number) => Promise<void>;
    export let isVirtualWishlist: boolean = false;
    export let onAddBacklogItem: ((artifactId: number) => Promise<void>) | undefined = undefined;
</script>

<Listgroup>
    <slot name="header" />
    
    {#if backlogItems.length > 0}
        {#each backlogItems as backlogItem (backlogItem.artifact.id)}
            <ListgroupItem>
                <BacklogItemComp
                    {backlogItem}
                    {canEdit}
                    {prices}
                    {onDeleteBacklogItem}
                    {onMoveBacklogItem}
                    {isVirtualWishlist}
                    {onAddBacklogItem}
                />
            </ListgroupItem>
        {/each}
    {:else}
        <ListgroupItem>
            <slot name="empty" />
        </ListgroupItem>
    {/if}
</Listgroup>