<script lang="ts">
    import { invalidate } from "$app/navigation";
    import { ArtifactType } from "$lib/model/Artifact";
    import type { Platform } from "$lib/model/game/Platform";
    import { Link, LinkType } from "$lib/model/Link";
    import type { Rating } from "$lib/model/Rating";
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
        Spinner,
        type ColorVariant
    } from "flowbite-svelte";
    import { 
        PlusOutline, 
        RefreshOutline, 
        CalendarMonthSolid,
        ClockSolid, 
        TagSolid,
        WindowSolid,
        StarSolid,
        LinkOutline
    } from "flowbite-svelte-icons";

    // Common properties that all artifact types share
    export let id: number;
    export let title: string;
    export let type: ArtifactType;
    export let releaseDate: Date | null;
    export let duration: number | null;
    export let genres: { title: string }[];
    export let ratings: Rating[];
    export let links: Link[];
    
    // Optional properties for specific artifact types
    export let platforms: Platform[] = [];
    
    // User info
    export let userConnected: boolean = false;
    export let userScore: number | null = null;
    export let canEdit: boolean = false;

    let openAddLink = false;
    let addLinkType: LinkType | null;
    let addLinkUrl: string | null;
    let unboundLinkTypes: {
        value: LinkType,
        name: string
    }[];
    
    // Track loading states
    let refreshingAllLinks = false;
    let refreshingLinks: Record<string, boolean> = {};
    
    refreshLinkTypes();
    
    function refreshLinkTypes() {
        unboundLinkTypes = LinkType.getLinkTypesByArtifactType(type)
        .filter(linkType => !links.some((link) => link.type === linkType))
        .map(linkType => ({
            value: linkType,
            name: LinkType.getLinkTypeLabel(linkType),
        }));
    }

    function refreshLinksData(linksToRefresh: Link[]) {
        if (linksToRefresh.length === links.length) {
            refreshingAllLinks = true;
        } else {
            linksToRefresh.forEach(link => {
                refreshingLinks[link.type] = true;
            });
        }
        
        const types = linksToRefresh.map(link => link.type);
        fetch(`/api/${type.toLowerCase()}/${id}/link`, {
            method: "PUT",
            body: JSON.stringify({
                types: types
            }),
        }).then(async (response) => {
            if (response.status !== 200) {
                alert(`Failed to refresh links`);
            } else {
                invalidate("data");
            }
        }).catch(error => {
            console.error(`Error refreshing links:`, error);
            alert(`Failed to refresh links`);
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
        fetch(`/api/${type.toLowerCase()}/${id}/link`, {
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
        fetch(`/api/artifact/${id}/userScore`, {
            method: "POST",
            body: JSON.stringify({
                score: score
            }),
        }).catch(error => {
            console.error("Error updating score:", error);
            alert("Failed to update score");
        });
    }
    
    // Helper function to get a color based on a score
    function getScoreColor(score: number): ColorVariant {
        if (score >= 90) return "green";
        if (score >= 80) return "indigo";
        if (score >= 70) return "yellow";
        return "red";
    }
</script>

<Card padding="xl" class="max-w-4xl mx-auto shadow-lg">
    <div class="flex justify-between items-start mb-4">
        <div>
            <Badge color={type.toLowerCase() === ArtifactType.GAME ? 'indigo' : 'purple'} class="mb-2">{type}</Badge>
            <Heading tag="h2" class="text-4xl font-extrabold mb-1">{title}</Heading>
            
            {#if releaseDate}
                <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                    <CalendarMonthSolid class="w-4 h-4 mr-1" />
                    <span>{releaseDate.toLocaleDateString()}</span>
                </div>
            {/if}
            
            {#if duration}
                <div class="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                    <ClockSolid class="w-4 h-4 mr-1" />
                    <span>{TimeUtil.formatDuration(duration)}</span>
                </div>
            {/if}
        </div>
    </div>
    
    {#if userConnected}
        <div class="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
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
    
    <Hr class="my-4" />
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <div class="mb-4">
                <div class="flex items-center mb-2">
                    <TagSolid class="w-4 h-4 mr-2 text-blue-500" />
                    <P weight="medium" class="text-lg">Genres</P>
                </div>
                <div class="flex flex-wrap gap-2 ml-6">
                    {#each genres as genre}
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
                <div class="flex items-center mb-2">
                    <StarSolid class="w-4 h-4 mr-2 text-yellow-500" />
                    <P weight="medium" class="text-lg">Ratings</P>
                </div>
                <div class="space-y-2 ml-6">
                    {#each ratings as rating}
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 dark:text-gray-300">{rating.type}</span>
                            <Badge color={getScoreColor(rating.rating)}>{rating.rating}</Badge>
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
                                on:click={() => refreshLinksData(links)}>
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
                    {#each links as link}
                        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <button
                                on:click={() => openLink(type, link.type, link.url)}
                                class="text-blue-600 hover:underline flex-1 truncate" style="text-align:left"
                            >
                                <span class="font-medium">{link.type}:</span> {link.url}
                            </button>
                            {#if canEdit}
                                <Button
                                    size="xs"
                                    pill
                                    color="light"
                                    class="ml-2"
                                    disabled={refreshingLinks[link.type] || refreshingAllLinks}
                                    on:click={() => refreshLinksData([link])}
                                >
                                    {#if refreshingLinks[link.type] || refreshingAllLinks}
                                        <Spinner size="4" />
                                    {:else}
                                        <RefreshOutline class="w-3 h-3" />
                                    {/if}
                                </Button>
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