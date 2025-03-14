<script lang="ts">
    import { invalidate } from "$app/navigation";
    import { Artifact, ArtifactType } from "$lib/model/Artifact";
    import type { Platform } from "$lib/model/game/Platform";
    import { getLinkTypeLabel, getLinkTypesByArtifactType, Link, LinkType } from "$lib/model/Link";
    import { getMeanRatingColor, getRatingColor } from "$lib/model/Rating";
    import { getPosterURL } from "$lib/services/ArtifactService";
    import { openLink } from "$lib/services/LinkService";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import {
        Label,
        Button,
        Modal,
        Input,
        Select,
        Card,
        Badge,
        Heading,
        P,
        Hr,
        Spinner
    } from "flowbite-svelte";
    import { 
        PlusOutline, 
        RefreshOutline, 
        CalendarMonthSolid,
        ClockSolid, 
        TagSolid,
        WindowSolid,
        StarSolid,
        LinkOutline,
        EditOutline
    } from "flowbite-svelte-icons";
    import { onMount } from "svelte";

    // Common properties that all artifact types share
    export let artifact: Artifact;
    
    // Optional properties for specific artifact types
    export let platforms: Platform[] = [];
    
    // User info
    export let userConnected: boolean = false;
    export let userScore: number | null = null;
    export let canEdit: boolean = false;

    let openAddLink = false;
    let openEditLink = false;
    let addLinkType: LinkType | null;
    let addLinkUrl: string | null;
    let editLinkType: LinkType | null;
    let editLinkUrl: string | null;
    let unboundLinkTypes: {
        value: LinkType,
        name: string
    }[];
    
    let artifactPosterURL: string | null = null;
    onMount(() => {
        getPosterURL(artifact.type, artifact.id).then((url) => {
            artifactPosterURL = url;
        });
    });

    // Track loading states
    let refreshingAllLinks = false;
    let refreshingLinks: Record<string, boolean> = {};

    refreshLinkTypes();
    
    function refreshLinkTypes() {
        unboundLinkTypes = getLinkTypesByArtifactType(artifact.type)
        .filter(linkType => !artifact.links.some((link) => link.type === linkType))
        .map(linkType => ({
            value: linkType,
            name: getLinkTypeLabel(linkType),
        }));
    }

    function refreshLinksData(linksToRefresh: Link[]) {
        if (linksToRefresh.length === artifact.links.length) {
            refreshingAllLinks = true;
        } else {
            linksToRefresh.forEach(link => {
                refreshingLinks[link.type] = true;
            });
        }
        
        const types = linksToRefresh.map(link => link.type);
        fetch(`/api/${artifact.type.toLowerCase()}/${artifact.id}/link`, {
            method: "PUT",
            body: JSON.stringify({
                types: types
            }),
        }).then(async (response) => {
            if (response.status !== 200) {
                const errorResponse = await response.json();
                alert(`Error while refreshing links: ` + errorResponse.message);
            } else {
                invalidate("data");
            }
        }).catch(error => {
            console.error(`Error while refreshing links`, error);
            alert(`Error while refreshing links`);
        }).finally(() => {
            refreshingAllLinks = false;
            linksToRefresh.forEach(link => {
                refreshingLinks[link.type] = false;
            });
        });
    }

    function canAddLink(linkType: LinkType | null, linkUrl: string | null) {
        return !linkType || !linkUrl;
    }

    function addLink() {
        fetch(`/api/${artifact.type.toLowerCase()}/${artifact.id}/link`, {
            method: "POST",
            body: JSON.stringify({
                type: addLinkType,
                url: addLinkUrl,
            }),
        }).then((response) => {
            if (response.status !== 200) {
                alert("Failed to add link");
                return;
            }
            invalidate("data");
            refreshLinkTypes();
            invalidate("unboundLinkTypes");
            openAddLink = false;
            addLinkType = null;
            addLinkUrl = null;
        }).catch(error => {
            console.error("Error adding link:", error);
            alert("Failed to add link");
        });
    }

    function openEditLinkModal(link: Link) {
        editLinkType = link.type;
        editLinkUrl = link.url;
        openEditLink = true;
    }

    function updateLink() {
        fetch(`/api/${artifact.type.toLowerCase()}/${artifact.id}/link`, {
            method: "PATCH",
            body: JSON.stringify({
                type: editLinkType,
                url: editLinkUrl,
            }),
        }).then((response) => {
            if (response.status !== 200) {
                alert("Failed to update link");
                return;
            }
            invalidate("data");
            openEditLink = false;
            editLinkType = null;
            editLinkUrl = null;
        }).catch(error => {
            console.error("Error updating link:", error);
            alert("Failed to update link");
        });
    }

    function handleLinkClick(event: MouseEvent, artifactType: ArtifactType, linkType: LinkType, linkUrl: string) {
        if (event.button === 1 || event.button === 0) {
            openLink(artifactType, linkType, linkUrl);
        }
    }

    function handleScoreChange(event: any) {
        const target = event.target as HTMLInputElement;
        if (target.value === '') {
            updateScore(null);
            return;
        }
        let value = parseInt(target.value, 10);
        if (isNaN(value)) {
            target.value = '';
            updateScore(null);
            return;
        }
        value = Math.max(0, Math.min(100, value));
        target.value = value.toString();
        updateScore(value);
    }

    function updateScore(score: number | null) {
        fetch(`/api/artifact/${artifact.id}/userScore`, {
            method: "POST",
            body: JSON.stringify({
                score: score
            }),
        }).catch(error => {
            console.error("Error updating score:", error);
            alert("Failed to update score");
        });
    }
</script>

<Card padding="xl" class="max-w-4xl mx-auto shadow-lg">
    <div class="flex justify-between items-start mb-4">
        <div class="flex-1">
            <Badge color={artifact.type.toLowerCase() === ArtifactType.GAME ? 'indigo' : 'purple'} class="mb-2">{artifact.type}</Badge>
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
            
            <!-- User score moved here to be on the left side with the title -->
            {#if userConnected}
                <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <Label for="score" class="mb-2 flex items-center">
                        <StarSolid class="w-4 h-4 mr-1 text-yellow-400" />
                        Your Rating
                    </Label>
                    <Input
                        on:change={handleScoreChange}
                        type="number"
                        id="score"
                        data-input-counter-min="0"
                        max="100"
                        placeholder="Rate from 0-100"
                        class="max-w-xs"
                        value={userScore}
                    />
                </div>
            {/if}
        </div>
        
        {#if artifactPosterURL}
            <div class="ml-4 flex-shrink-0" style="max-width: 40%;">
                <img 
                    src={artifactPosterURL} 
                    alt="{artifact.title} poster" 
                    class="rounded-lg shadow-md max-h-64 w-auto object-cover"
                />
            </div>
        {:else}
            <div class="ml-4 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center" style="width: 10rem; height: 15rem;">
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
                    {#each artifact.genres as genre}
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
                        {#each platforms as platform}
                            <Badge color="purple" class="font-medium">{platform.title}</Badge>
                        {/each}
                    </div>
                </div>
            {/if}
            
            <!-- Slot for additional artifact-specific content -->
            <slot></slot>
        </div>
        
        <div>
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center">
                        <StarSolid class="w-4 h-4 mr-2 text-yellow-500" />
                        <P weight="medium" class="text-lg">Ratings</P>
                    </div>
                    {#if artifact.getMeanRating()}
                        <Badge color={getMeanRatingColor(artifact.getMeanRating())}>{Math.round(artifact.getMeanRating())}</Badge>
                    {/if}
                </div>
                <div class="space-y-2 ml-6">
                    {#each artifact.ratings as rating}
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 dark:text-gray-300">{rating.type}</span>
                            <Badge color={getRatingColor(artifact.type, rating.type, rating.rating)}>{rating.rating}</Badge>
                        </div>
                    {/each}
                </div>
            </div>
        
            <div>
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                        <LinkOutline class="w-4 h-4 mr-2 text-green-500" />
                        <P weight="medium" class="text-lg">Links</P>
                    </div>
                    {#if canEdit}
                        <div class="flex space-x-2">
                            <Button
                                size="xs"
                                color="green"
                                disabled={unboundLinkTypes.length == 0}
                                on:click={() => (openAddLink = true)}>
                                <PlusOutline class="mr-1 w-3 h-3" />Add
                            </Button>
                            <Button
                                size="xs"
                                color="blue"
                                disabled={refreshingAllLinks}
                                on:click={() => refreshLinksData(artifact.links)}>
                                {#if refreshingAllLinks}
                                    <Spinner size="4" class="mr-1" />
                                {:else}
                                    <RefreshOutline class="mr-1 w-3 h-3" />
                                {/if}
                                Refresh
                            </Button>
                        </div>
                    {/if}
                </div>
                <div class="space-y-2 ml-6">
                    {#each artifact.links as link}
                        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <button
                                on:click={(event) => handleLinkClick(event, artifact.type, link.type, link.url)}
                                on:auxclick={(event) => handleLinkClick(event, artifact.type, link.type, link.url)}
                                class="text-blue-600 hover:underline flex-1 truncate" style="text-align:left"
                            >
                                <span class="font-medium">{link.type}:</span> {link.url}
                            </button>
                            {#if canEdit}
                                <div class="flex items-center space-x-1 ml-2">
                                    <Button
                                        size="xs"
                                        pill
                                        color="light"
                                        disabled={refreshingLinks[link.type] || refreshingAllLinks}
                                        on:click={() => openEditLinkModal(link)}
                                    >
                                        <EditOutline class="w-3 h-3" />
                                    </Button>
                                    <Button
                                        size="xs"
                                        pill
                                        color="light"
                                        disabled={refreshingLinks[link.type] || refreshingAllLinks}
                                        on:click={() => refreshLinksData([link])}
                                    >
                                        {#if refreshingLinks[link.type] || refreshingAllLinks}
                                            <Spinner size="4" />
                                        {:else}
                                            <RefreshOutline class="w-3 h-3" />
                                        {/if}
                                    </Button>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</Card>

<Modal title="Add New Link" bind:open={openAddLink} autoclose size="sm">
    <div class="space-y-4">
        <div>
            <Label for="linkType" class="mb-2">Link Type</Label>
            <Select
                id="linkType"
                items={unboundLinkTypes}
                bind:value={addLinkType}
                placeholder="Select link type"
            />
        </div>
        <div>
            <Label for="linkUrl" class="mb-2">Link ID</Label>
            <Input
                type="text"
                id="linkUrl"
                name="linkUrl"
                placeholder="Enter link identifier"
                bind:value={addLinkUrl}
            />
        </div>
    </div>
    <svelte:fragment slot="footer">
        <Button
            color="green"
            on:click={addLink}
            disabled={canAddLink(addLinkType, addLinkUrl)}>
            Add Link
        </Button>
        <Button color="alternative" on:click={() => (openAddLink = false)}>Cancel</Button>
    </svelte:fragment>
</Modal>

<Modal title="Edit Link" bind:open={openEditLink} autoclose size="sm">
    <div class="space-y-4">
        <div>
            <Label for="editLinkType" class="mb-2">Link Type</Label>
            <Input
                type="text"
                id="editLinkType"
                readonly
                value={editLinkType ?? ""}
            />
        </div>
        <div>
            <Label for="editLinkUrl" class="mb-2">Link ID</Label>
            <Input
                type="text"
                id="linkUrl"
                name="linkUrl"
                placeholder="Enter link identifier"
                bind:value={editLinkUrl}
            />
        </div>
    </div>
    <svelte:fragment slot="footer">
        <Button
            color="green"
            on:click={updateLink}
            disabled={canAddLink(editLinkType, editLinkUrl)}>
            Edit Link
        </Button>
        <Button color="alternative" on:click={() => (openAddLink = false)}>Cancel</Button>
    </svelte:fragment>
</Modal>