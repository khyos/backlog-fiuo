<script lang="ts">
    import { Badge, Button, Dropdown, DropdownItem } from "flowbite-svelte";
    import { AwardOutline, ChevronDownOutline, TagSolid } from "flowbite-svelte-icons";
    import { draggable, dropzone } from "./dnd";
    import { Backlog, BacklogRankingType } from "$lib/model/Backlog";
    import type { Price } from "$lib/types/Price";
    import { startOrderByFight } from "$lib/stores/OrderByFightStore";
    import type { BacklogItem } from "$lib/model/BacklogItem";
    import type { ArtifactType } from "$lib/model/Artifact";
    import { backlogPageState } from "../stores/MainStore";
    import { openLink } from "$lib/services/LinkService";
    import { LinkType } from "$lib/model/Link";
    import { TimeUtil } from "$lib/util/TimeUtil";

    export let backlog: Backlog;
    export let backlogItem: BacklogItem;
    export let canEdit: boolean = false;
    export let backlogType: string;
    export let rankingType: string;
    export let prices: Record<string, Price> | undefined = undefined;
    
    // Events
    export let onOpenTags: (artifactId: number) => void;
    export let onMoveToRank: (backlogItem: any) => void;
    export let onMoveToBacklog: (backlogItem: any) => void;
    export let onDeleteBacklogItem: (e: any) => void;
    export let onMoveBacklogItem: (srcRank: number, targetRank: number) => Promise<void>;

    let showFullTags = false;

    const showTags = () => {
        showFullTags = true;
    };

    const removeTag = (artifactId: number, tagId: string) => {
        fetch(`/api/backlog/${backlog.id}/tag`, {
            method: "DELETE",
            body: JSON.stringify({
                artifactId: artifactId,
                tagId: tagId,
            }),
        });
    };

    const startOrderByFightPick = (backlog: { backlogItems: BacklogItem[], artifactType: ArtifactType }, type: 'elo' | 'rank', artifactId?: number) => {
        startOrderByFight(backlog, type, artifactId);
        backlogPageState.update(s => ({
            ...s,
            hiddenDrawer: false,
            selectedTab: 'order'
        }));
    };
</script>

<div
    use:draggable={{ canEdit: canEdit && rankingType === BacklogRankingType.RANK, rank: backlogItem.rank }}
    use:dropzone={{ canEdit: canEdit && rankingType === BacklogRankingType.RANK, rank: backlogItem.rank, onDrop: onMoveBacklogItem }}
>
    <div class="flexCenter">
        <div style="display: inline-flex; flex-grow: 1; align-items: center;">
            <Badge color="blue" class="font-semibold flex items-center gap-1 mr-2" style="white-space: nowrap;">
                # {backlogItem.rank}
            </Badge>
            <a class='mr-1' href={`/${backlogType}/${backlogItem.artifact.id}`}>{backlogItem.artifact.title}</a>
            <div class="{showFullTags ? '' : 'hidden md:block'}">
                {#each backlogItem.tags as tag}
                    <Badge class="ml-1 pr-0">
                        {tag.id}
                        {#if canEdit}
                            <Button
                                id="deleteTag"
                                size="xs"
                                on:click={() => removeTag(backlogItem.artifact.id, tag.id)}
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
                        on:click={() => showTags()}
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
            <Badge class="mr-1">
                <button on:click={() => openLink(backlog.artifactType, LinkType.ITAD, prices[backlogItem.artifact.id].id)}>
                    {prices[backlogItem.artifact.id].current}€ / {prices[backlogItem.artifact.id].historyLow}€
                </button>
            </Badge>
        {/if}
        {#if rankingType === BacklogRankingType.ELO}
            <Badge color="purple" class="font-semibold flex items-center gap-1 mr-2">
                <AwardOutline class="w-3 h-3" />
                <span>{backlogItem.elo}</span>
            </Badge>
        {/if}
        {#if rankingType === BacklogRankingType.WISHLIST}
            <Badge class="mr-1">{TimeUtil.formatDate(backlogItem.artifact.releaseDate)}</Badge>
        {/if}
        {#if canEdit}
            <Button size="xs" color="light" class="!p-1.5">
                <ChevronDownOutline class="w-4 h-4" />
            </Button>
            <Dropdown>
                <DropdownItem on:click={() => onOpenTags(backlogItem.artifact.id)}>Add Tag</DropdownItem>
                {#if rankingType === BacklogRankingType.RANK}
                    <DropdownItem on:click={() => onMoveToRank(backlogItem)}>Move to Rank</DropdownItem>
                    <DropdownItem on:click={() => startOrderByFightPick(backlog, 'rank', backlogItem.artifact.id)}>Order by Comparison</DropdownItem>
                {:else if rankingType === BacklogRankingType.ELO}
                    <DropdownItem on:click={() => startOrderByFightPick(backlog, 'elo', backlogItem.artifact.id)}>Order by Elo</DropdownItem>
                {/if}
                <DropdownItem on:click={() => onMoveToBacklog(backlogItem)}>Move to other Backlog</DropdownItem>
                <DropdownItem data-id={backlogItem.artifact.id} on:click={onDeleteBacklogItem}>Delete</DropdownItem>
            </Dropdown>
        {/if}
    </div>
</div>