<script lang="ts">
    import { invalidate } from "$app/navigation";
    import { Link, LinkType } from "$lib/model/Link";
    import { Movie } from "$lib/model/movie/Movie";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import {
        Label,
        List,
        Li,
        Button,
        Modal,
        Input,
        Select,
    } from "flowbite-svelte";
    import { PlusOutline, RefreshOutline } from "flowbite-svelte-icons";

    /** @type {import('./$types').PageData} */
    export let data: any;
    let movie = Movie.deserialize(data.movie);
    let openAddLink = false;
    let linkTypes = LinkType.getLinkTypesByArtifactType(movie.type)
        .filter((linkType) => {
            return !movie.links.some((link) => link.type === linkType);
        })
        .map((linkType) => {
            return {
                value: linkType,
                name: LinkType.getLinkTypeLabel(linkType),
            };
        });
    let addLinkType: string | null;
    let addLinkUrl: string | null;

    function refreshLinksData(links: Link[]) {
        const types = links.map((link) => link.type);
        fetch(`/api/movie/${movie.id}/link`, {
            method: "PUT",
            body: JSON.stringify({
                types: types
            }),
        }).then(async (response) => {
            if (response.status !== 200) {
                alert("Failed to refresh links");
                return;
            }
            invalidate("data");
        });
    }

    function canAddLink(addLinkType: string | null, addLinkUrl: string | null) {
        return !addLinkType || !addLinkUrl;
    }

    function addLink() {
        fetch(`/api/movie/${movie.id}/link`, {
            method: "POST",
            body: JSON.stringify({
                type: addLinkType,
                url: addLinkUrl,
            }),
        }).then(async (response) => {
            if (response.status !== 200) {
                alert("Failed to add link");
                return;
            }
            invalidate("data");
            invalidate("linkTypes");
            openAddLink = false;
        });
    }
</script>

<h2 class="text-4xl font-extrabold dark:text-white mb-2">{movie.title}</h2>
<Label class="mb-2"
    >Release Date : {movie.releaseDate?.toLocaleDateString()}</Label
>
<Label class="mb-2"
    >Duration : {TimeUtil.formatDuration(movie.duration)}</Label
>
<Label class="mb-2">Genres :</Label>
<List class="ml-2  mb-2">
    {#each movie.genres as genre}
        <Li>{genre.title}</Li>
    {/each}
</List>
<Label class="mb-2">Ratings :</Label>
<List class="ml-2 mb-2">
    {#each movie.ratings as rating}
        <Li>{rating.type} : {rating.rating}</Li>
    {/each}
</List>
<Label class="mb-2">Links :</Label>
<List class="ml-2 mb-2">
    {#each movie.links as link}
        <Li>
            <div style="display: inline-flex; align-items: center;">
                <a
                    href={Link.getURL(movie.type, link.type, link.url)}
                    target="_blank">{link.type} : {link.url}</a
                >
                {#if data.canEdit}
                    <Button
                        size="xs"
                        class="px-2 py-1 ml-2"
                        on:click={() => refreshLinksData([link])}
                        ><RefreshOutline /></Button
                    >
                {/if}
            </div>
        </Li>
    {/each}
</List>
{#if data.canEdit}
    <Button
        size="xs"
        class="px-2 py-1 ml-2"
        disabled={linkTypes.length == 0}
        on:click={() => (openAddLink = true)}><PlusOutline />Add Link</Button
    >
    <Button
        size="xs"
        class="px-2 py-1 ml-2"
        on:click={() => refreshLinksData(movie.links)}
        ><RefreshOutline />Refresh All Data</Button
    >
{/if}
<Modal title="Add Link" bind:open={openAddLink} autoclose>
    <div class="mb-6">
        <Label for="linkType">Link Type:</Label>
        <Select
            id="linkType"
            class="mt-2"
            items={linkTypes}
            bind:value={addLinkType}
        />
        <Label for="linkUrl" class="mt-2">Link ID:</Label>
        <Input
            type="text"
            id="linkUrl"
            name="linkUrl"
            class="mt-2"
            bind:value={addLinkUrl}
        />
    </div>
    <svelte:fragment slot="footer">
        <Button
            on:click={addLink}
            disabled={canAddLink(addLinkType, addLinkUrl)}>Add</Button
        >
        <Button color="alternative">Cancel</Button>
    </svelte:fragment>
</Modal>
