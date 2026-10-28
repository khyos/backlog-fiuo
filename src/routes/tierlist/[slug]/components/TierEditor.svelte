<script lang="ts">
    import { Button, Input } from "flowbite-svelte";
    import { ArrowDownOutline, ArrowUpOutline, PlusOutline, TrashBinSolid } from "flowbite-svelte-icons";
    import type { Tier } from "#lib/model/Tier";

    type EditableTier = { id?: number; label: string; color: string };

    export let tiers: Tier[];
    export let onSave: (tiers: { id?: number; label: string; color: string; position: number }[]) => Promise<void>;

    let editableTiers: EditableTier[] = tiers.map(tier => ({ id: tier.id, label: tier.label, color: tier.color }));
    let saving = false;
    let errorMessage: string | null = null;

    const addTier = () => {
        editableTiers = [...editableTiers, { label: 'New', color: '#cccccc' }];
    };

    const removeTier = (index: number) => {
        editableTiers = editableTiers.filter((_, i) => i !== index);
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const next = [...editableTiers];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        editableTiers = next;
    };

    const moveDown = (index: number) => {
        if (index === editableTiers.length - 1) return;
        const next = [...editableTiers];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        editableTiers = next;
    };

    const save = async () => {
        if (editableTiers.length < 1) {
            errorMessage = 'A tier list must have at least one tier';
            return;
        }
        errorMessage = null;
        saving = true;
        try {
            await onSave(editableTiers.map((tier, index) => ({
                id: tier.id,
                label: tier.label,
                color: tier.color,
                position: index
            })));
        } finally {
            saving = false;
        }
    };
</script>

<div class="tier-editor border rounded p-3 mb-3">
    <h4 class="text-lg font-medium mb-2 dark:text-white">Edit Tiers</h4>
    {#each editableTiers as tier, index (index)}
        <div class="flex items-center gap-2 mb-2">
            <Input class="flex-grow" bind:value={tier.label} />
            <input type="color" bind:value={tier.color} class="h-8 w-10 p-0 border-0 bg-transparent" />
            <Button size="xs" color="light" onclick={() => moveUp(index)} disabled={index === 0}>
                <ArrowUpOutline class="h-3 w-3" />
            </Button>
            <Button size="xs" color="light" onclick={() => moveDown(index)} disabled={index === editableTiers.length - 1}>
                <ArrowDownOutline class="h-3 w-3" />
            </Button>
            <Button size="xs" color="red" onclick={() => removeTier(index)}>
                <TrashBinSolid class="h-3 w-3" />
            </Button>
        </div>
    {/each}
    {#if errorMessage}
        <p class="text-red-500 text-sm mb-2">{errorMessage}</p>
    {/if}
    <div class="flex gap-2">
        <Button size="xs" onclick={addTier}>
            <PlusOutline class="mr-1 h-3 w-3" /> Add Tier
        </Button>
        <Button size="xs" color="green" onclick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Tiers'}
        </Button>
    </div>
</div>
