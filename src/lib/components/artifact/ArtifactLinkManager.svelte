<script lang="ts">
    import { getLinkTypeLabel, getLinkTypesByArtifactType, Link, LinkType } from "$lib/model/Link";
    import { ArtifactType } from "$lib/model/Artifact";
    import { openLink } from "$lib/services/LinkService";
    import { artifactItemStore, refreshArtifact } from "$lib/stores/ArtifactItemStore";
    import {
        Label,
        Button,
        Modal,
        Input,
        Select,
        Spinner,
        P,
    } from "flowbite-svelte";
    import {
        PlusOutline,
        RefreshOutline,
        LinkOutline,
        EditOutline,
    } from "flowbite-svelte-icons";
    import { onMount } from "svelte";

    export let canEdit: boolean = false;

    $: artifactItemStoreInst = $artifactItemStore;
    $: artifact = artifactItemStoreInst.artifact;

    let openAddLink = false;
    let openEditLink = false;
    let addLinkType: LinkType | null = null;
    let addLinkUrl: string | undefined = undefined;
    let editLinkType: LinkType | null = null;
    let editLinkUrl: string | undefined = undefined;
    let unboundLinkTypes: { value: LinkType; name: string }[] = [];

    let refreshingAllLinks = false;
    let refreshingLinks: Record<string, boolean> = {};

    onMount(() => refreshLinkTypes());

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
            body: JSON.stringify({ types }),
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

    function isLinkInputIncomplete(linkType: LinkType | null, linkUrl?: string) {
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
</script>

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
        {#each artifact.links as link (link.type)}
            <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <button
                    onclick={(event) => handleLinkClick(event, artifact.type, link.type, link.url)}
                    onauxclick={(event) => handleLinkClick(event, artifact.type, link.type, link.url)}
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
            <Label for="addLinkUrl" class="mb-2">Link ID</Label>
            <Input
                type="text"
                id="addLinkUrl"
                name="addLinkUrl"
                placeholder="Enter link identifier"
                bind:value={addLinkUrl}
            />
        </div>
    </div>
    {#snippet footer()}
        <Button
            color="green"
            onclick={addLink}
            disabled={isLinkInputIncomplete(addLinkType, addLinkUrl)}>
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
                id="editLinkUrl"
                name="editLinkUrl"
                placeholder="Enter link identifier"
                bind:value={editLinkUrl}
            />
        </div>
    </div>
    {#snippet footer()}
        <Button
            color="green"
            onclick={updateLink}
            disabled={isLinkInputIncomplete(editLinkType, editLinkUrl)}>
            Edit Link
        </Button>
        <Button color="alternative" onclick={() => (openEditLink = false)}>Cancel</Button>
    {/snippet}
</Modal>
