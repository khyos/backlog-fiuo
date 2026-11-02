<script lang="ts">
    import { Modal, Button, Input, Label, Select } from "flowbite-svelte";
    import { TIER_LIST_ARTIFACT_TYPES } from "#lib/model/TierListConstants";
    import { ArtifactType } from "#lib/model/Artifact";

    let { open = $bindable(), onClose, onCreated }: {
        open: boolean;
        onClose: () => void;
        onCreated: (id: number) => void;
    } = $props();

    const typeOptions = TIER_LIST_ARTIFACT_TYPES.map(t => ({ value: t, name: t }));

    let artifactType = $state<ArtifactType>(TIER_LIST_ARTIFACT_TYPES[0]);
    let title = $state('');
    let submitting = $state(false);

    async function handleSubmit() {
        if (!title.trim()) return;
        submitting = true;
        try {
            const response = await fetch('/api/tierlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artifactType, title: title.trim() }),
            });
            if (!response.ok) return;
            const { id } = await response.json();
            title = '';
            artifactType = TIER_LIST_ARTIFACT_TYPES[0];
            onCreated(id);
        } finally {
            submitting = false;
        }
    }
</script>

<Modal title="Create standalone tier list" bind:open size="sm">
    <div class="space-y-4">
        <div>
            <Label for="create-tl-type">Artifact type</Label>
            <Select id="create-tl-type" bind:value={artifactType} items={typeOptions} />
        </div>
        <div>
            <Label for="create-tl-title">Title</Label>
            <Input id="create-tl-title" bind:value={title} placeholder="My tier list" />
        </div>
    </div>
    {#snippet footer()}
        <Button disabled={submitting || !title.trim()} onclick={handleSubmit}>Create</Button>
        <Button color="alternative" onclick={onClose}>Cancel</Button>
    {/snippet}
</Modal>
