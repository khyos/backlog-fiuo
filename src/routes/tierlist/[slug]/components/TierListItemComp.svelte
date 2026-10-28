<script lang="ts">
    import type { ArtifactType } from "#lib/model/Artifact";
    import type { TierListItem } from "#lib/model/TierListItem";
    import { getPosterURL } from "#lib/services/ArtifactService";
    import { onMount } from "svelte";
    import { draggable, dropzone, type TierId } from "./dnd";

    export let item: TierListItem;
    export let artifactType: ArtifactType;
    export let canEdit: boolean = false;
    export let tierId: TierId;
    export let onDrop: (artifactId: number, sourceTierId: TierId, targetTierId: TierId, targetPosition: number) => void | Promise<void>;

    let posterUrl: string | null = null;
    onMount(() => {
        getPosterURL(artifactType, item.artifact.id).then((url) => {
            if (url) {
                posterUrl = `/api/image?url=${encodeURIComponent(url)}`;
            }
        });
    });
</script>

<div
    class="tier-item"
    use:draggable={{ canEdit, artifactId: item.artifact.id, sourceTierId: tierId, sourceIndex: item.position }}
    use:dropzone={{ canEdit, tierId, position: item.position, itemArtifactId: item.artifact.id, horizontal: true, onDrop }}
>
    {#if posterUrl}
        <img src={posterUrl} alt="{item.artifact.title} poster" class="tier-item-poster" />
    {:else}
        <div class="tier-item-noposter bg-gray-200 dark:bg-gray-700">
            <span class="text-gray-400 dark:text-gray-500">No poster</span>
        </div>
    {/if}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a class="tier-item-title" href={`/${artifactType}/${item.artifact.id}`} title={item.artifact.title}>
        {item.artifact.title}
    </a>
</div>

<style>
    .tier-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        box-sizing: content-box;
        width: 5rem;
        /* Horizontal gap is padding (not margin) so the space between two
           items belongs to the item's own dropzone hit area — hovering
           between two posters resolves to before/after instead of falling
           through to the container's "drop-end". Vertical margin keeps the
           spacing between wrapped rows. */
        margin: 0.25rem 0;
        padding: 0 0.25rem;
        position: relative;
    }
    .tier-item:global(.drop-before)::before,
    .tier-item:global(.drop-after)::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        width: 3px;
        border-radius: 2px;
        background-color: #3b82f6;
        pointer-events: none;
    }
    .tier-item:global(.drop-before)::before {
        left: 0;
    }
    .tier-item:global(.drop-after)::after {
        right: 0;
    }
    .tier-item-poster {
        width: 5rem;
        height: 7rem;
        object-fit: cover;
        border-radius: 0.25rem;
    }
    .tier-item-noposter {
        width: 5rem;
        height: 7rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
        font-size: 0.65rem;
        text-align: center;
    }
    .tier-item-title {
        font-size: 0.7rem;
        max-width: 5rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
    }
</style>
