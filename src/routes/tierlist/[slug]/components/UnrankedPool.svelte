<script lang="ts">
    import type { ArtifactType } from "#lib/model/Artifact";
    import type { TierListItem } from "#lib/model/TierListItem";
    import TierListItemComp from "./TierListItemComp.svelte";
    import { dropzone, type TierId } from "./dnd";

    export let items: TierListItem[];
    export let artifactType: ArtifactType;
    export let canEdit: boolean = false;
    export let onDrop: (artifactId: number, sourceTierId: TierId, targetTierId: TierId, targetPosition: number) => void | Promise<void>;
</script>

<div class="unranked-pool">
    <div class="unranked-label">Unranked</div>
    <div
        class="unranked-items"
        use:dropzone={{ canEdit, tierId: null, position: items.length, onDrop }}
    >
        {#each items as item (item.artifact.id)}
            <TierListItemComp {item} {artifactType} {canEdit} tierId={null} {onDrop} />
        {/each}
    </div>
</div>

<style>
    .unranked-pool {
        display: flex;
        align-items: stretch;
        border: 1px solid rgba(0, 0, 0, 0.1);
        margin-top: 1rem;
        min-height: 7.5rem;
    }
    .unranked-label {
        flex: 0 0 4.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        background-color: #e5e7eb;
        color: #1a1a1a;
        padding: 0.25rem;
        text-align: center;
    }
    .unranked-items {
        display: flex;
        flex-wrap: wrap;
        flex-grow: 1;
        align-content: flex-start;
        padding: 0.25rem;
    }
    .unranked-items:global(.drop-end)::after {
        content: "";
        flex: 0 0 auto;
        width: 3px;
        height: 7rem;
        margin: 0.25rem;
        align-self: center;
        border-radius: 2px;
        background-color: #3b82f6;
        pointer-events: none;
    }
</style>
