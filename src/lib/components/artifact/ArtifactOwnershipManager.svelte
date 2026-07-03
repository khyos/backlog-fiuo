<script lang="ts">
    import { ArtifactType } from "$lib/model/Artifact";
    import type { Game } from "$lib/model/game/Game";
    import type { IUserArtifactOwnership } from "$lib/model/UserArtifactOwnership";
    import { artifactItemStore, addOwnership, editOwnership, removeOwnership } from "$lib/stores/ArtifactItemStore";
    import {
        Label,
        Button,
        Modal,
        Input,
        Textarea,
    } from "flowbite-svelte";
    import {
        PlusOutline,
        EditOutline,
        TrashBinSolid,
        CreditCardSolid,
    } from "flowbite-svelte-icons";

    export let userConnected: boolean = false;

    $: artifactItemStoreInst = $artifactItemStore;
    $: artifact = artifactItemStoreInst.artifact;
    $: platforms = artifact.type === ArtifactType.GAME ? (artifact as Game).platforms : [];

    const NON_GAME_OWNERSHIP_PLATFORMS = ['DVD', 'Blu-ray', 'VOD', '4K Blu-ray', 'Digital Download', 'VHS', 'Other'];

    $: ownershipPlatformSuggestions = artifact.type === ArtifactType.GAME
        ? platforms.map(p => p.title)
        : NON_GAME_OWNERSHIP_PLATFORMS;

    let openAddOwnership = false;
    let openEditOwnership = false;
    let newOwnershipPlatform = '';
    let newOwnershipNote = '';
    let editingOwnership: IUserArtifactOwnership | null = null;
    let editOwnershipPlatform = '';
    let editOwnershipNote = '';

    async function handleAddOwnership() {
        if (!newOwnershipPlatform.trim()) return;
        await addOwnership(newOwnershipPlatform.trim(), newOwnershipNote.trim() || null);
        newOwnershipPlatform = '';
        newOwnershipNote = '';
        openAddOwnership = false;
    }

    function openEditOwnershipModal(ownership: IUserArtifactOwnership) {
        editingOwnership = ownership;
        editOwnershipPlatform = ownership.platform;
        editOwnershipNote = ownership.note ?? '';
        openEditOwnership = true;
    }

    async function handleEditOwnership() {
        if (!editingOwnership || !editOwnershipPlatform.trim()) return;
        await editOwnership(editingOwnership, editOwnershipPlatform.trim(), editOwnershipNote.trim() || null);
        openEditOwnership = false;
        editingOwnership = null;
    }

    async function handleRemoveOwnership(id: number) {
        await removeOwnership(id);
    }
</script>

{#if userConnected}
    <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
                <CreditCardSolid class="w-4 h-4 mr-1 text-blue-500" />
                <span class="font-medium">Your copies</span>
            </div>
            <Button size="xs" color="light" onclick={() => (openAddOwnership = true)}>
                <PlusOutline class="w-3 h-3 mr-1" /> Add
            </Button>
        </div>
        {#if artifact.userInfo?.ownerships && artifact.userInfo.ownerships.length > 0}
            <div class="flex flex-col gap-2">
                {#each artifact.userInfo.ownerships as ownership (ownership.id)}
                    <div class="flex items-start justify-between bg-white dark:bg-gray-700 rounded p-2 text-sm">
                        <div>
                            <span class="font-medium">{ownership.platform}</span>
                            {#if ownership.note}
                                <p class="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{ownership.note}</p>
                            {/if}
                        </div>
                        <div class="flex gap-1 ml-2 shrink-0">
                            <Button size="xs" color="light" class="!p-1" onclick={() => openEditOwnershipModal(ownership)}>
                                <EditOutline class="w-3 h-3" />
                            </Button>
                            <Button size="xs" color="red" class="!p-1" onclick={() => handleRemoveOwnership(ownership.id)}>
                                <TrashBinSolid class="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="text-sm text-gray-500 dark:text-gray-400 italic">No copies recorded</p>
        {/if}
    </div>
{/if}

<!-- Add Ownership Modal -->
<Modal title="Add a copy" bind:open={openAddOwnership} autoclose={false} size="sm">
    <div class="flex flex-col gap-4">
        <div>
            <Label for="ownershipPlatform" class="mb-2">Platform / Format</Label>
            <Input
                type="text"
                id="ownershipPlatform"
                placeholder="e.g. PlayStation 4, Blu-ray, VOD…"
                list="platformSuggestions"
                bind:value={newOwnershipPlatform}
            />
            <datalist id="platformSuggestions">
                {#each ownershipPlatformSuggestions as suggestion (suggestion)}
                    <option value={suggestion}></option>
                {/each}
            </datalist>
        </div>
        <div>
            <Label for="ownershipNote" class="mb-2">Note <span class="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea
                id="ownershipNote"
                placeholder="e.g. Amazon Prime Video, physical edition…"
                rows={2}
                bind:value={newOwnershipNote}
            />
        </div>
    </div>
    {#snippet footer()}
        <Button color="green" onclick={handleAddOwnership} disabled={!newOwnershipPlatform.trim()}>Add</Button>
        <Button color="alternative" onclick={() => (openAddOwnership = false)}>Cancel</Button>
    {/snippet}
</Modal>

<!-- Edit Ownership Modal -->
<Modal title="Edit copy" bind:open={openEditOwnership} autoclose={false} size="sm">
    <div class="flex flex-col gap-4">
        <div>
            <Label for="editOwnershipPlatform" class="mb-2">Platform / Format</Label>
            <Input
                type="text"
                id="editOwnershipPlatform"
                list="editPlatformSuggestions"
                bind:value={editOwnershipPlatform}
            />
            <datalist id="editPlatformSuggestions">
                {#each ownershipPlatformSuggestions as suggestion (suggestion)}
                    <option value={suggestion}></option>
                {/each}
            </datalist>
        </div>
        <div>
            <Label for="editOwnershipNote" class="mb-2">Note <span class="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea
                id="editOwnershipNote"
                rows={2}
                bind:value={editOwnershipNote}
            />
        </div>
    </div>
    {#snippet footer()}
        <Button color="green" onclick={handleEditOwnership} disabled={!editOwnershipPlatform.trim()}>Save</Button>
        <Button color="alternative" onclick={() => (openEditOwnership = false)}>Cancel</Button>
    {/snippet}
</Modal>
