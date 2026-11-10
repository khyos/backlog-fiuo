<script lang="ts">
    import {
        Badge,
        Button,
        Checkbox,
        Listgroup,
        ListgroupItem,
    } from "flowbite-svelte";
    import { addBacklogItem } from "#lib/services/BacklogService";
    import { backlogStore, refreshBacklog } from "../stores/BacklogStore";
    import { PlusOutline } from "flowbite-svelte-icons";
    import type { Artifact } from "#lib/model/Artifact";
    import { ArtifactType } from "#lib/model/Artifact";
    import { TimeUtil } from "#lib/util/TimeUtil";

    export let canEdit: boolean;

    let hideEarlyAccess = true;

    $: isGameBacklog = $backlogStore.backlog.artifactType === ArtifactType.GAME;

    $: displayedSuggestions = hideEarlyAccess && isGameBacklog
        ? ($backlogStore.suggestedArtifacts ?? []).filter(a => a.status !== 'early_access')
        : ($backlogStore.suggestedArtifacts ?? []);

    const addSuggestedArtifactToBacklog = async (artifact: Artifact) => {
        if (!$backlogStore.suggestedArtifacts) return;
        try {
            await addBacklogItem($backlogStore.backlog.id, artifact.id);
            refreshBacklog();
            $backlogStore.suggestedArtifacts = $backlogStore.suggestedArtifacts.filter((a: Artifact) => a.id !== artifact.id);
        } catch (error) {
            console.error("Failed to add artifact to backlog:", error);
        }
    }

    const addAllSuggestedArtifactsToBacklog = async (event: MouseEvent) => {
        event.stopPropagation();
        if (!$backlogStore.suggestedArtifacts) return;
        const toAdd = displayedSuggestions;
        for (const artifact of toAdd) {
            try {
                await addBacklogItem($backlogStore.backlog.id, artifact.id);
            } catch (error) {
                console.error(`Failed to add artifact ${artifact.id} to backlog:`, error);
            }
        }
        refreshBacklog();
        const toAddIds = new Set(toAdd.map(a => a.id));
        $backlogStore.suggestedArtifacts = $backlogStore.suggestedArtifacts.filter(a => !toAddIds.has(a.id));
    }
</script>

{#if canEdit && $backlogStore.suggestedArtifacts && $backlogStore.suggestedArtifacts.length > 0 && canEdit}
    <div class="mb-6">
        <Listgroup class="mt-2">
            <div
                class="w-full p-2 flex items-center"
            >
                <h4 class="text-lg font-medium text-gray-900 dark:text-white">
                    Wishlisted Suggestions
                </h4>
                <Button size="sm" class="ml-auto" onclick={addAllSuggestedArtifactsToBacklog}>
                    Add All
                </Button>
            </div>
            {#each displayedSuggestions as artifact (artifact.id)}
                <ListgroupItem class="flex items-center justify-between">
                    <div class="flex flex-col">
                        <div class="flex items-center">
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a class='mr-1' href={`/${$backlogStore.backlog.artifactType}/${artifact.id}`}>{artifact.title}</a>
                            {#if artifact.status === 'early_access'}
                                <Badge color="yellow" class="ml-1">Early Access</Badge>
                            {/if}
                        </div>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                            Released: {new Date(artifact.releaseDate).toLocaleDateString()}
                            {#if artifact.duration > 0}
                                • {TimeUtil.formatDuration(artifact.duration)}
                            {/if}
                        </span>
                    </div>
                    <Button size="xs" onclick={() => addSuggestedArtifactToBacklog(artifact)}>
                        <PlusOutline size="xs" />
                    </Button>
                </ListgroupItem>
            {/each}
            {#if isGameBacklog}
                <div class="w-full p-2">
                    <Checkbox bind:checked={hideEarlyAccess} class="text-sm">Hide Early Access</Checkbox>
                </div>
            {/if}
        </Listgroup>
    </div>
{/if}