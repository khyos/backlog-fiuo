<script lang="ts">
    import { Badge, Button, Dropdown, DropdownItem } from "flowbite-svelte";
    import { AwardOutline, ChevronDownOutline, TagSolid } from "flowbite-svelte-icons";
    import { draggable, dropzone } from "./dnd";
    import { BacklogRankingType } from "$lib/model/Backlog";
    import type { Price } from "$lib/types/itad/Price";
    import { startOrderByFight } from "$lib/stores/OrderByFightStore";
    import type { BacklogItem } from "$lib/model/BacklogItem";
    import { showMoveToBacklog, showMoveToRank } from "../stores/PageStore";
    import { openLink } from "$lib/services/LinkService";
    import { LinkType } from "$lib/model/Link";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import { removeTag, showAddTag } from "../actions/TagActions";
    import { backlogStore } from "../stores/BacklogStore";

    export let backlogItem: BacklogItem;
    export let canEdit: boolean = false;
    export let prices: Record<string, Price> | undefined = undefined;

    $: backlogStoreInst = $backlogStore;
    
    // Events
    export let onDeleteBacklogItem: (e: MouseEvent) => void;
    export let onMoveBacklogItem: (srcRank: number, targetRank: number) => Promise<void>;

    let showFullTags = false;

    const showTags = () => {
        showFullTags = true;
    };

    const getPriceTagColor = (price: Price) => {
        if (!price.historyLow) {
            return "primary";
        }
        if (price.current <= price.historyLow) {
            return "green";
        }
        if (price.current <= price.historyLow * 1.10) {
            return "purple"
        }
        return "primary";
    }
</script>

<div
    class="w-full"
    use:draggable={{ canEdit: canEdit && backlogStoreInst.backlog.rankingType === BacklogRankingType.RANK, rank: backlogItem.rank }}
    use:dropzone={{ canEdit: canEdit && backlogStoreInst.backlog.rankingType === BacklogRankingType.RANK, rank: backlogItem.rank, onDrop: onMoveBacklogItem }}
>
    <div class="flex items-center">
        <div style="display: inline-flex; flex-grow: 1; align-items: center;">
            <Badge color="blue" class="font-semibold flex items-center gap-1 mr-2" style="white-space: nowrap;">
                # {backlogItem.rank}
            </Badge>
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
            <a class='mr-1' href={`/${backlogStoreInst.backlog.artifactType}/${backlogItem.artifact.id}`}>{backlogItem.artifact.title}</a>
            <div class="{showFullTags ? '' : 'hidden md:block'}">
                {#each backlogItem.tags as tag (tag.id)}
                    <Badge class="ml-1 pr-0">
                        {tag.id}
                        {#if canEdit}
                            <Button
                                id="deleteTag"
                                size="xs"
                                onclick={() => removeTag(backlogItem.artifact.id, tag.id)}
                                class="px-2.5 py-0"
                                style="background-color: transparent; color: var(--tw-text-opacity)"
                            >x</Button>
                        {/if}
                    </Badge>
                {/each}
            </div>
        </div>
        <div id="compactTags" class="{showFullTags ? 'hidden' : 'block md:hidden'}">
            {#if backlogItem.tags.length > 0}
                <Badge class="font-semibold flex items-center gap-1 ml-1 mr-1">
                    <Button
                        id="showTags"
                        size="xs"
                        onclick={() => showTags()}
                        class="px-0 py-0 flex items-center gap-1 "
                        style="background-color: transparent; color: var(--tw-text-opacity)"
                    >
                        <TagSolid class="w-3 h-3" />
                        <span>{backlogItem.tags.length}</span>
                    </Button>
                    
                </Badge>
            {/if}
        </div>
        {#if prices?.[backlogItem.artifact.id]}
            <Badge color={getPriceTagColor(prices[backlogItem.artifact.id])} class="mr-1">
                <button on:click={() => openLink(backlogStoreInst.backlog.artifactType, LinkType.ITAD, prices[backlogItem.artifact.id].id)}>
                    {prices[backlogItem.artifact.id].current}€ / {prices[backlogItem.artifact.id].historyLow}€
                </button>
            </Badge>
        {/if}
        {#if backlogStoreInst.backlog.rankingType === BacklogRankingType.ELO}
            <Badge color="purple" class="font-semibold flex items-center gap-1 mr-2">
                <AwardOutline class="w-3 h-3" />
                <span>{backlogItem.elo}</span>
            </Badge>
        {/if}
        {#if backlogStoreInst.backlog.rankingType === BacklogRankingType.WISHLIST}
            <Badge class="mr-1">{TimeUtil.formatDate(backlogItem.artifact.releaseDate)}</Badge>
        {/if}
        {#if canEdit}
            <Button size="xs" color="light" class="!p-1.5">
                <ChevronDownOutline class="w-4 h-4" />
            </Button>
            <Dropdown>
                <DropdownItem onclick={() => showAddTag(backlogItem)}>Add Tag</DropdownItem>
                {#if backlogStoreInst.backlog.rankingType === BacklogRankingType.RANK}
                    <DropdownItem onclick={() => showMoveToRank(backlogItem)}>Move to Rank</DropdownItem>
                    <DropdownItem onclick={() => startOrderByFight(backlogItem.artifact.id)}>Order by Comparison</DropdownItem>
                {:else if backlogStoreInst.backlog.rankingType === BacklogRankingType.ELO}
                    <DropdownItem onclick={() => startOrderByFight(backlogItem.artifact.id)}>Order by Elo</DropdownItem>
                {/if}
                <DropdownItem onclick={() => showMoveToBacklog(backlogItem)}>Move to other Backlog</DropdownItem>
                <DropdownItem data-id={backlogItem.artifact.id} onclick={onDeleteBacklogItem}>Delete</DropdownItem>
            </Dropdown>
        {/if}
    </div>
</div>