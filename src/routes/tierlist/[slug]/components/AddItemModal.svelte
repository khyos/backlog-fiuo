<script lang="ts">
    import { Modal, Button, Input, Listgroup, ListgroupItem, Spinner } from "flowbite-svelte";

    let { tierListId, open = $bindable(), onClose, onAdded }: {
        tierListId: number;
        open: boolean;
        onClose: () => void;
        onAdded: () => void;
    } = $props();

    type ArtifactRow = { id: number; title: string; alreadyPresent: boolean };

    let search = $state('');
    let page = $state(0);
    const pageSize = 20;
    let artifacts = $state<ArtifactRow[]>([]);
    let total = $state(0);
    let loading = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    async function fetchArtifacts() {
        loading = true;
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                search,
            });
            const response = await fetch(`/api/tierlist/${tierListId}/artifacts?${params}`);
            if (!response.ok) return;
            const data = await response.json();
            artifacts = data.artifacts;
            total = data.total;
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        if (open) {
            fetchArtifacts();
        }
    });

    function onSearchInput(e: Event) {
        search = (e.currentTarget as HTMLInputElement).value;
        page = 0;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchArtifacts(), 300);
    }

    async function addItem(artifactId: number) {
        const response = await fetch(`/api/tierlist/${tierListId}/item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artifactId }),
        });
        if (!response.ok) return;
        onAdded();
        await fetchArtifacts();
    }

    async function prevPage() {
        if (page > 0) {
            page--;
            await fetchArtifacts();
        }
    }

    async function nextPage() {
        if ((page + 1) * pageSize < total) {
            page++;
            await fetchArtifacts();
        }
    }
</script>

<Modal title="Add item" bind:open size="md">
    <div class="space-y-3">
        <Input
            placeholder="Search..."
            value={search}
            oninput={onSearchInput}
        />
        {#if loading}
            <div class="flex justify-center py-4"><Spinner /></div>
        {:else if artifacts.length === 0}
            <p class="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No results</p>
        {:else}
            <Listgroup>
                {#each artifacts as artifact (artifact.id)}
                    <ListgroupItem>
                        <button
                            class="w-full text-left {artifact.alreadyPresent ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:underline'}"
                            disabled={artifact.alreadyPresent}
                            onclick={() => !artifact.alreadyPresent && addItem(artifact.id)}
                        >
                            {artifact.title}
                            {#if artifact.alreadyPresent}
                                <span class="text-xs text-gray-400 ml-1">(already added)</span>
                            {/if}
                        </button>
                    </ListgroupItem>
                {/each}
            </Listgroup>
            <div class="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <button onclick={prevPage} disabled={page === 0} class="disabled:opacity-40">Previous</button>
                <span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</span>
                <button onclick={nextPage} disabled={(page + 1) * pageSize >= total} class="disabled:opacity-40">Next</button>
            </div>
        {/if}
    </div>
    {#snippet footer()}
        <Button color="alternative" onclick={onClose}>Close</Button>
    {/snippet}
</Modal>
