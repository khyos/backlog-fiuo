<script lang="ts">
    import type { ArtifactType } from "#lib/model/Artifact";
    import type { Tier } from "#lib/model/Tier";
    import TierListItemComp from "./TierListItemComp.svelte";
    import { dropzone, type TierId } from "./dnd";

    export let tier: Tier;
    export let artifactType: ArtifactType;
    export let canEdit: boolean = false;
    export let onDrop: (artifactId: number, sourceTierId: TierId, targetTierId: TierId, targetPosition: number) => void | Promise<void>;
    export let onUpdateTier: (tierId: number, label: string, color: string) => void | Promise<void>;

    // Grow the label textarea to fit its content so multi-line labels are
    // fully visible while editing.
    const autosize = (node: HTMLTextAreaElement) => {
        const resize = () => {
            node.style.height = "auto";
            node.style.height = `${node.scrollHeight}px`;
        };
        resize();
        node.addEventListener("input", resize);
        return {
            destroy() {
                node.removeEventListener("input", resize);
            }
        };
    };
</script>

<div class="tier-row">
    <div class="tier-label" style="background-color: {tier.color};">
        {#if canEdit}
            <textarea
                class="tier-label-input"
                rows="1"
                value={tier.label}
                use:autosize
                on:change={(e) => onUpdateTier(tier.id, (e.currentTarget as HTMLTextAreaElement).value, tier.color)}
            ></textarea>
        {:else}
            <span class="tier-label-text">{tier.label}</span>
        {/if}
    </div>
    <div
        class="tier-items"
        use:dropzone={{ canEdit, tierId: tier.id, position: tier.items.length, onDrop }}
    >
        {#each tier.items as item (item.artifact.id)}
            <TierListItemComp {item} {artifactType} {canEdit} tierId={tier.id} {onDrop} />
        {/each}
    </div>
</div>

<style>
    .tier-row {
        display: flex;
        align-items: stretch;
        border: 1px solid rgba(0, 0, 0, 0.1);
        min-height: 7.5rem;
        /* Overlap the previous row's bottom border so the shared edge reads
           as a single 1px line instead of two stacked borders. (Harmless on
           the first row — it just overlaps the board's padding.) */
        margin-top: -1px;
    }
    .tier-label {
        flex: 0 0 6.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        padding: 0.25rem;
        color: #1a1a1a;
    }
    .tier-label-text {
        width: 100%;
        text-align: center;
        font-weight: 700;
        font-size: 1.25rem;
        overflow-wrap: anywhere;
        word-break: break-word;
    }
    .tier-label-input {
        width: 100%;
        text-align: center;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 0.25rem;
        border: none;
        resize: none;
        overflow: hidden;
        overflow-wrap: anywhere;
        word-break: break-word;
        line-height: 1.2;
        font-family: inherit;
    }
    .tier-items {
        display: flex;
        flex-wrap: wrap;
        flex-grow: 1;
        align-content: flex-start;
        padding: 0.25rem;
    }
    .tier-items:global(.drop-end)::after {
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
