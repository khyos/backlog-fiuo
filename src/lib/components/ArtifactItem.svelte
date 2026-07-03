<script lang="ts">
    import { ArtifactType, type ArtifactAsyncInfo } from "$lib/model/Artifact";
    import type { Game } from "$lib/model/game/Game";
    import { getMeanRatingColor, getRatingColor } from "$lib/model/Rating";
    import { getAsyncInfo } from "$lib/services/ArtifactService";
    import { artifactItemStore } from "$lib/stores/ArtifactItemStore";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import {
        Card,
        Badge,
        Heading,
        P,
        Hr,
    } from "flowbite-svelte";
    import {
        CalendarMonthSolid,
        ClockSolid,
        TagSolid,
        WindowSolid,
        StarSolid,
    } from "flowbite-svelte-icons";
    import { onMount } from "svelte";
    import ArtifactLinkManager from "$lib/components/artifact/ArtifactLinkManager.svelte";
    import ArtifactOwnershipManager from "$lib/components/artifact/ArtifactOwnershipManager.svelte";
    import ArtifactSubscriptionManager from "$lib/components/artifact/ArtifactSubscriptionManager.svelte";
    import ArtifactUserInfoPanel from "$lib/components/artifact/ArtifactUserInfoPanel.svelte";
    import ArtifactChildrenTree from "$lib/components/artifact/ArtifactChildrenTree.svelte";

    // Common properties that all artifact types share
    $: artifactItemStoreInst = $artifactItemStore;
    $: artifact = artifactItemStoreInst.artifact;
    $: platforms = artifact.type === ArtifactType.GAME ? (artifact as Game).platforms : [];
    $: artifactMeanRating = artifact.meanRating;

    // User info
    export let userConnected: boolean = false;
    export let canEdit: boolean = false;

    let artifactAsyncInfo: ArtifactAsyncInfo | null = null;
    onMount(() => {
        getAsyncInfo(artifact.type, artifact.id).then((asyncInfo) => {
            artifactAsyncInfo = asyncInfo;
        });
    });
</script>

<Card class="p-6 max-w-4xl mx-auto shadow-lg">
    <div class="flex justify-between items-start mb-4">
        <div class="flex-1">
            <Badge color={artifact.type === ArtifactType.GAME ? 'indigo' : 'purple'} class="mb-2">{artifact.type}</Badge>
            <!--{#if artifact.status === 'early_access'}
                <Badge color="yellow" class="mb-2 ml-1">Early Access</Badge>
            {/if}-->
            <Heading tag="h2" class="text-4xl font-extrabold mb-1">{artifact.title}</Heading>

            {#if artifact.releaseDate}
                <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                    <CalendarMonthSolid class="w-4 h-4 mr-1" />
                    <span>{TimeUtil.formatDate(artifact.releaseDate)}</span>
                </div>
            {/if}

            {#if artifact.duration}
                <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                    <ClockSolid class="w-4 h-4 mr-1" />
                    <span>{TimeUtil.formatDuration(artifact.duration)}</span>
                </div>
            {/if}

            {#if artifactAsyncInfo?.description}
                <div class="flex items-center dark:text-gray-400 text-sm mt-1">
                    <span>{artifactAsyncInfo?.description}</span>
                </div>
            {/if}

            <ArtifactUserInfoPanel {userConnected} />
            <ArtifactOwnershipManager {userConnected} />
        </div>

        {#if artifactAsyncInfo?.poster}
            <div class="ml-4 flex-shrink-0" style="max-width: 40%;">
                <img
                    src={artifactAsyncInfo.poster}
                    alt="{artifact.title} poster"
                    class="rounded-lg shadow-md max-h-64 w-auto object-cover"
                />
            </div>
        {:else}
            <div class="ml-4 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center" style="width: 10rem; height: 15rem; max-width: 40%;">
                <span class="text-gray-400 dark:text-gray-500">No poster</span>
            </div>
        {/if}
    </div>

    <Hr class="my-4" />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <div class="mb-4">
                <div class="flex items-center mb-2">
                    <TagSolid class="w-4 h-4 mr-2 text-blue-500" />
                    <P weight="medium" class="text-lg">Genres</P>
                </div>
                <div class="flex flex-wrap gap-2 ml-6">
                    {#each artifact.genres as genre (genre.id)}
                        <Badge color="blue" class="font-medium">{genre.title}</Badge>
                    {/each}
                </div>
            </div>

            {#if platforms.length > 0}
                <div class="mb-4">
                    <div class="flex items-center mb-2">
                        <WindowSolid class="w-4 h-4 mr-2 text-purple-500" />
                        <P weight="medium" class="text-lg">Platforms</P>
                    </div>
                    <div class="flex flex-wrap gap-2 ml-6">
                        {#each platforms as platform (platform.id)}
                            <Badge color="purple" class="font-medium">{platform.title}</Badge>
                        {/each}
                    </div>
                </div>
            {/if}

            <ArtifactChildrenTree {userConnected} />
        </div>

        <div>
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center">
                        <StarSolid class="w-4 h-4 mr-2 text-yellow-500" />
                        <P weight="medium" class="text-lg">Ratings</P>
                    </div>
                    {#if artifactMeanRating}
                        <Badge color={getMeanRatingColor(artifactMeanRating)}>{Math.round(artifactMeanRating)}</Badge>
                    {/if}
                </div>
                <div class="space-y-2 ml-6">
                    {#each artifact.ratings as rating (rating.type)}
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 dark:text-gray-300">{rating.type}</span>
                            <Badge color={getRatingColor(artifact.type, rating.type, rating.rating)}>{rating.rating}</Badge>
                        </div>
                    {/each}
                </div>
            </div>

            <ArtifactSubscriptionManager {canEdit} />

            <ArtifactLinkManager {canEdit} />
        </div>
    </div>
</Card>
