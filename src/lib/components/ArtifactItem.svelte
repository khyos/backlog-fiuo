<script lang="ts">
    import { Artifact, ArtifactType } from "$lib/model/Artifact";
    import { ArtifactTypeUtil } from "$lib/model/ArtifactTypeUtil";
    import type { Game } from "$lib/model/game/Game";
    import { getLinkTypeLabel, getLinkTypesByArtifactType, Link, LinkType } from "$lib/model/Link";
    import { getMeanRatingColor, getRatingColor } from "$lib/model/Rating";
    import { UserArtifactStatus } from "$lib/model/UserArtifact";
    import { getPosterURL } from "$lib/services/ArtifactService";
    import { openLink } from "$lib/services/LinkService";
    import { artifactItemStore, refreshArtifact, updateStatus, updateScore, updateDate, updateStartDate, updateEndDate } from "$lib/stores/ArtifactItemStore";
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
        Checkbox,

        Datepicker,

        type DateOrRange


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
        EditOutline,
        ChevronDownOutline,
        ChevronRightOutline,
        ChevronDoubleRightOutline
    } from "flowbite-svelte-icons";
    import { onMount } from "svelte";

    // Common properties that all artifact types share
    $: artifactItemStoreInst = $artifactItemStore;
    $: artifact = artifactItemStoreInst.artifact;
    $: platforms = artifact.type === ArtifactType.GAME ? (artifact as Game).platforms : [];
    $: artifactMeanRating = artifact.meanRating;
    
    // User info
    export let userConnected: boolean = false;
    export let canEdit: boolean = false;

    let openAddLink = false;
    let openEditLink = false;
    let addLinkType: LinkType | null;
    let addLinkUrl: string | undefined;
    let editLinkType: LinkType | null;
    let editLinkUrl: string | undefined;
    let unboundLinkTypes: {
        value: LinkType,
        name: string
    }[] = [];

    const USER_STATUSES = [
        { value: null, name: 'None' },
        { value: UserArtifactStatus.DROPPED, name: 'Dropped' },
        { value: UserArtifactStatus.FINISHED, name: 'Finished' },
        { value: UserArtifactStatus.ON_GOING, name: 'On going' },
        { value: UserArtifactStatus.ON_HOLD, name: 'On hold' },
        { value: UserArtifactStatus.WISHLIST, name: 'Wishlist' },
    ];
    
    let artifactPosterURL: string | null = null;
    onMount(() => {
        refreshLinkTypes();
        getPosterURL(artifact.type, artifact.id).then((url) => {
            artifactPosterURL = url;
        });
    });

    // Track loading states
    let refreshingAllLinks = false;
    let refreshingLinks: Record<string, boolean> = {};
    
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
                refreshArtifact();
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

    function canAddLink(linkType: LinkType | null, linkUrl?: string) {
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
            refreshArtifact();
            refreshLinkTypes();
            openAddLink = false;
            addLinkType = null;
            addLinkUrl = undefined;
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
            refreshArtifact();
            openEditLink = false;
            editLinkType = null;
            editLinkUrl = undefined;
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

    function handleSelectStatusChange(event: any, artifactId: number) {
        const target = event.target as HTMLSelectElement;
        const status: UserArtifactStatus | null = target.value === '' ? null : target.value as UserArtifactStatus;
        updateStatus(artifactId, status);
    }

    function handleCheckboxStatusChange(event: any, artifact: Artifact) {
        const target = event.target as HTMLInputElement;
        const status: UserArtifactStatus | null = target.checked ? UserArtifactStatus.FINISHED : null;
        updateStatus(artifact.id, status);
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

    function handleDateChange(date: DateOrRange) {
        if (date instanceof Date) {
            updateDate(date);
        }
    }

    function handleStartDateChange(date: DateOrRange) {
        if (date instanceof Date) {
            updateStartDate(date);
        }
    }

    function handleEndDateChange(date: DateOrRange) {
        if (date instanceof Date) {
            updateEndDate(date);
        }
    }

    let expandedChidren: Set<number> = new Set();

    function toggleChild(childId: number) {
        if (expandedChidren.has(childId)) {
            expandedChidren.delete(childId);
        } else {
            expandedChidren.add(childId);
        }
        expandedChidren = expandedChidren;
    }
</script>

<Card class="p-6 max-w-4xl mx-auto shadow-lg">
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
            
            {#if userConnected}
                <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <Label for="score" class="mb-2 flex items-center">
                        <StarSolid class="w-4 h-4 mr-1 text-yellow-400" />
                        Status
                    </Label>
                    <Select
                        onchange={(event) => handleSelectStatusChange(event, artifact.id)}
                        items={USER_STATUSES}
                        value={artifact.userInfo?.status}
                        placeholder="Select Status"
                    />
                </div>
                <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <Label for="score" class="mb-2 flex items-center">
                        <StarSolid class="w-4 h-4 mr-1 text-yellow-400" />
                        Your Rating
                    </Label>
                    <Input
                        onchange={handleScoreChange}
                        type="number"
                        data-input-counter-min="0"
                        max="100"
                        placeholder="Rate from 0-100"
                        class="max-w-xs"
                        value={artifact.userInfo?.score || undefined}
                    />
                </div>
                <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <Label for="score" class="mb-2 flex items-center">
                        <CalendarMonthSolid class="w-4 h-4 mr-1 text-yellow-400" />
                        Date
                    </Label>
                    {#if artifact.type === ArtifactType.MOVIE}
                        <Datepicker
                            onclear={() => updateDate(null)}
                            onapply={handleDateChange}
                            dateFormat= {{
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            }}
                            showActionButtons={true}
                            autohide={false}
                            placeholder="Pick a date"
                            value={artifact.userInfo?.startDate || undefined} />
                    {:else}
                        <Datepicker
                            onclear={() => updateStartDate(null)}
                            onapply={handleStartDateChange}
                            dateFormat= {{
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            }}
                            showActionButtons={true}
                            autohide={false}
                            placeholder="Pick a start date"
                            value={artifact.userInfo?.startDate || undefined} />
                        <Datepicker
                            onclear={() => updateEndDate(null)}
                            onapply={handleEndDateChange}
                            dateFormat= {{
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            }}
                            showActionButtons={true}
                            autohide={false}
                            placeholder="Pick a end date"
                            value={artifact.userInfo?.endDate || undefined} />
                    {/if}
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
            
            {#if artifact.children.length > 0}
                <div class="children-container">
                    <div class="flex items-center mb-2">
                        <ChevronDoubleRightOutline class="w-4 h-4 mr-2 text-purple-500" />
                        <P weight="medium" class="text-lg">{ArtifactTypeUtil.getChildName(artifact.type, 0)}</P>
                    </div>
                    
                    {#each artifact.children as firstLevelChild}
                        <div class="child-item mb-4 border rounded-lg border-gray-300">
                            <button 
                                class="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
                                on:click={() => toggleChild(firstLevelChild.id)}
                            >
                                <span class="font-medium">{firstLevelChild.title}</span>
                                {#if expandedChidren.has(firstLevelChild.id)}
                                    <ChevronDownOutline class="w-5 h-5 text-gray-600" />
                                {:else}
                                    <ChevronRightOutline class="w-5 h-5 text-gray-600" />
                                {/if}
                            </button>
                            
                            {#if expandedChidren.has(firstLevelChild.id)}
                                <div class="secondLevelChildren-list p-3 bg-gray-50">
                                    {#if firstLevelChild.children.length > 0}
                                    <table class="w-full text-sm">
                                        <thead class="bg-gray-50 border-b">
                                            <tr>
                                                <th class="p-2 text-left">Index</th>
                                                <th class="p-2 text-left">{ArtifactTypeUtil.getChildName(artifact.type, 1)}</th>
                                                <th class="p-2 text-left">Duration</th>
                                                {#if userConnected}
                                                <th class="p-2 text-left">
                                                    <Checkbox
                                                        checked={firstLevelChild.userInfo?.status === UserArtifactStatus.FINISHED}
                                                        onchange={(event) => handleCheckboxStatusChange(event, firstLevelChild)}
                                                    />
                                                </th>
                                                {/if}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each firstLevelChild.children as secondLevelChild, index}
                                                <tr class="border-b last:border-b-0 border-gray-300 hover:bg-gray-100">
                                                    <td class="p-2">{index + 1}</td>
                                                    <td class="p-2">{secondLevelChild.title}</td>
                                                    <td class="p-2">
                                                        {#if secondLevelChild.duration}
                                                            {TimeUtil.formatDuration(secondLevelChild.duration)}
                                                        {:else}
                                                            <span class="text-gray-500 italic">N/A</span>
                                                        {/if}
                                                    </td>
                                                    {#if userConnected}
                                                    <td class="p-2">
                                                        <Checkbox
                                                            checked={secondLevelChild.userInfo?.status === UserArtifactStatus.FINISHED}
                                                            onchange={(event) => handleCheckboxStatusChange(event, secondLevelChild)}
                                                        />
                                                    </td>
                                                    {/if}
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                    {:else}
                                        <p class="text-gray-500 italic">No {ArtifactTypeUtil.getChildName(artifact.type, 1)}</p>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
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
                                onclick={() => (openAddLink = true)}>
                                <PlusOutline class="mr-1 w-3 h-3" />Add
                            </Button>
                            <Button
                                size="xs"
                                color="blue"
                                disabled={refreshingAllLinks}
                                onclick={() => refreshLinksData(artifact.links)}>
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
                                        onclick={() => openEditLinkModal(link)}
                                    >
                                        <EditOutline class="w-3 h-3" />
                                    </Button>
                                    <Button
                                        size="xs"
                                        pill
                                        color="light"
                                        disabled={refreshingLinks[link.type] || refreshingAllLinks}
                                        onclick={() => refreshLinksData([link])}
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
    {#snippet footer()}
        <Button
            color="green"
            onclick={addLink}
            disabled={canAddLink(addLinkType, addLinkUrl)}>
            Add Link
        </Button>
        <Button color="alternative" onclick={() => (openAddLink = false)}>Cancel</Button>
    {/snippet}
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
    {#snippet footer()}
        <Button
            color="green"
            onclick={updateLink}
            disabled={canAddLink(editLinkType, editLinkUrl)}>
            Edit Link
        </Button>
        <Button color="alternative" onclick={() => (openAddLink = false)}>Cancel</Button>
    {/snippet}
</Modal>