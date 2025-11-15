<script lang="ts">
    import {
        Badge,
        Button,
        Checkbox,
        Input,
        Modal,
        Select,
    } from "flowbite-svelte";
    import { PlusOutline } from "flowbite-svelte-icons";
    import { pageStore, hideMoveToBacklog, hideMoveToRank } from "../stores/PageStore";
    import { tagStore } from "../stores/TagStore";
    import { addTag, createTag, fetchTags } from "../actions/TagActions";

    export let backlogItemsForSelect: Array<{value: number, name: string}> = [];
    export let moveToRankSelected: number;
    export let keepTagsSelected: boolean = false;
    export let moveToBacklogSelected: number;
    export let onMoveBacklogItem: (srcRank: number, targetRank: number) => Promise<void>;
    export let moveBacklogItemToOtherBacklog: () => Promise<void>;
</script>

<!-- Tag Management Modal -->
<Modal size="xs" title="Add Tag" bind:open={$tagStore.showAddTag} autoclose>
    <div style="display: flex; align-items: center;" class="mb-2">
        <Input
            type="text"
            id="search-field-tag"
            placeholder="Search"
            autocomplete="off"
            class="mr-1"
            style="flex-grow: 1;"
            bind:value={$tagStore.searchTagTerm}
            oninput={fetchTags}
        />
        <Button
            size="xs"
            disabled={$tagStore.searchTagTerm.length < 2}
            onclick={createTag}><PlusOutline size="sm" /></Button
        >
    </div>
    {#each $tagStore.searchedTags as tag (tag.id)}
        <Button size="xs" class="m-1" onclick={() => addTag(tag.id)}
            >{tag.id}</Button
        >
    {/each}
</Modal>

<!-- Move to Rank Modal -->
<Modal size="xs" title="Move to Rank" bind:open={$pageStore.showMoveToRank} autoclose>
    Move <Badge class="mr-2 gap-1" color="blue"># {$pageStore.selectedBacklogItem?.rank}</Badge><b>{$pageStore.selectedBacklogItem?.artifact.title}</b> to
    <Select class="mt-2" items={backlogItemsForSelect} bind:value={moveToRankSelected} />
    <Button class="mt-2" onclick={() => {
        if ($pageStore.selectedBacklogItem) {
            onMoveBacklogItem($pageStore.selectedBacklogItem.rank, moveToRankSelected).then(() => {
                hideMoveToRank();
            });
        }
    }}>Move</Button>
</Modal>

<!-- Move to Backlog Modal -->
<Modal size="xs" title="Move to Backlog" bind:open={$pageStore.showMoveToBacklog} autoclose>
    Move <Badge class="mr-2 gap-1" color="blue"># {$pageStore.selectedBacklogItem?.rank}</Badge><b>{$pageStore.selectedBacklogItem?.artifact.title}</b> to
    <Select class="mt-2" items={$pageStore.backlogsForSelect} bind:value={moveToBacklogSelected} />
    <Checkbox bind:checked={keepTagsSelected}>Keep tags</Checkbox>
    <Button class="mt-2" onclick={() => {
        moveBacklogItemToOtherBacklog().then(() => {
            hideMoveToBacklog();
        });
    }}>Move</Button>
</Modal>