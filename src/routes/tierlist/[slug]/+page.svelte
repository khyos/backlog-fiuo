<script lang="ts">
    import { Button } from "flowbite-svelte";
    import { toPng } from "html-to-image";
    import type { PageData } from "./$types";
    import { initializeStore, refreshTierList, tierListStore } from "./stores/TierListStore";
    import TierRow from "./components/TierRow.svelte";
    import UnrankedPool from "./components/UnrankedPool.svelte";
    import TierEditor from "./components/TierEditor.svelte";
    import type { TierId } from "./components/dnd";
    import type { IArtifactSummary } from "#lib/server/model/TierListUtil";

    export let data: PageData;

    initializeStore(data.tierList);

    $: store = $tierListStore;

    let showEditor = false;
    let boardEl: HTMLElement;
    let unrankedEl: HTMLElement;
    let addedSummaries: IArtifactSummary[] = [];
    let removalCandidates: IArtifactSummary[] = [];

    const onDropItem = async (artifactId: number, _sourceTierId: TierId, targetTierId: TierId, targetPosition: number) => {
        await fetch(`/api/tierlist/${store.tierList.id}/move`, {
            method: "POST",
            body: JSON.stringify({ artifactId, targetTierId, targetPosition })
        });
        await refreshTierList();
    };

    const patchTiers = async (tiers: { id?: number; label: string; color: string; position: number }[]) => {
        const response = await fetch(`/api/tierlist/${store.tierList.id}/tiers`, {
            method: "PATCH",
            body: JSON.stringify({ tiers })
        });
        if (!response.ok) {
            return;
        }
        await refreshTierList();
    };

    const onUpdateTier = async (tierId: number, label: string, color: string) => {
        const tiers = store.tierList.tiers.map((tier, index) => ({
            id: tier.id,
            label: tier.id === tierId ? label : tier.label,
            color: tier.id === tierId ? color : tier.color,
            position: index
        }));
        await patchTiers(tiers);
    };

    const onSaveTiers = async (tiers: { id?: number; label: string; color: string; position: number }[]) => {
        await patchTiers(tiers);
        showEditor = false;
    };

    const refreshFromBacklog = async () => {
        const response = await fetch(`/api/tierlist/${store.tierList.id}/refresh`, { method: "POST" });
        if (!response.ok) {
            return;
        }
        const result = await response.json();
        addedSummaries = result.added;
        removalCandidates = result.removalCandidates;
        await refreshTierList();
    };

    const confirmRemoval = async (artifactId: number) => {
        await fetch(`/api/tierlist/${store.tierList.id}/item`, {
            method: "DELETE",
            body: JSON.stringify({ artifactId })
        });
        removalCandidates = removalCandidates.filter(candidate => candidate.id !== artifactId);
        await refreshTierList();
    };

    const exportPng = async () => {
        boardEl
            .querySelectorAll(".drop-before, .drop-after, .drop-end")
            .forEach((el) => el.classList.remove("drop-before", "drop-after", "drop-end"));
        // The Unranked pool is part of the on-screen board (drop target) but
        // should not appear in the exported image.
        unrankedEl.style.display = "none";
        try {
            const dataUrl = await toPng(boardEl);
            const link = document.createElement("a");
            link.download = `${store.tierList.title || "tierlist"}.png`;
            link.href = dataUrl;
            link.click();
        } finally {
            unrankedEl.style.display = "";
        }
    };
</script>

<div class="space-y-4">
    <div class="flex justify-between items-center">
        <h1 class="text-2xl font-extrabold dark:text-white">{store.tierList.title}</h1>
        {#if data.canEdit}
            <div class="flex gap-2">
                <Button size="sm" color="light" onclick={() => (showEditor = !showEditor)}>Edit tiers</Button>
                <Button size="sm" color="light" onclick={refreshFromBacklog}>Refresh from backlog</Button>
                <Button size="sm" onclick={exportPng}>Export PNG</Button>
            </div>
        {/if}
    </div>

    {#if data.canEdit && showEditor}
        <TierEditor tiers={store.tierList.tiers} onSave={onSaveTiers} />
    {/if}

    {#if data.canEdit && (addedSummaries.length > 0 || removalCandidates.length > 0)}
        <div class="border rounded p-3">
            {#if addedSummaries.length > 0}
                <p class="text-sm mb-2 dark:text-white">{addedSummaries.length} item(s) added to Unranked.</p>
            {/if}
            {#if removalCandidates.length > 0}
                <p class="text-sm mb-2 dark:text-white">These items are no longer in the backlog:</p>
                {#each removalCandidates as candidate (candidate.id)}
                    <div class="flex items-center justify-between mb-1">
                        <span class="dark:text-white">{candidate.title}</span>
                        <Button size="xs" color="red" onclick={() => confirmRemoval(candidate.id)}>Remove</Button>
                    </div>
                {/each}
            {/if}
        </div>
    {/if}

    <div bind:this={boardEl} class="bg-white dark:bg-gray-800 p-2">
        {#each store.tierList.tiers as tier (tier.id)}
            <TierRow
                {tier}
                artifactType={store.tierList.artifactType}
                canEdit={data.canEdit}
                onDrop={onDropItem}
                {onUpdateTier}
            />
        {/each}
        <div bind:this={unrankedEl}>
            <UnrankedPool
                items={store.tierList.unranked}
                artifactType={store.tierList.artifactType}
                canEdit={data.canEdit}
                onDrop={onDropItem}
            />
        </div>
    </div>
</div>
