<script lang="ts">
    import { 
        Button, 
        Label, 
        MultiSelect, 
        Range, 
        Select, 
        TabItem
    } from "flowbite-svelte";
    import DoubleRange from "$lib/ui/DoubleRange.svelte";
    import { ArtifactType } from "$lib/model/Artifact";
    import type { BacklogFilters } from "../BacklogFilters";
    import type { Backlog } from "$lib/model/Backlog";
    import type { Genre } from "$lib/model/Genre";
    import type { Platform } from "$lib/model/game/Platform";
    import type { Tag } from "$lib/model/Tag";
    
    export let selectedTab: string = "filters";
    export let backlog: Backlog;
    export let backlogFilters: BacklogFilters;
    export let genres: Genre[] = [];
    export let platforms: Platform[] = [];
    export let backlogTags: Tag[] = [];

    let orderBacklogByItems = [
        { value: backlogFilters.orderBy.type, name: backlogFilters.orderBy.type },
        { value: "dateAdded", name: "Date Added in List" }
    ];

    let genreItems = genres.map((genre) => { return { value: genre.id, name: genre.title } }) ;
    let platformItems = platforms.map((platform) => { return { value: platform.id, name: platform.title } }) ;
    let backlogTagsItems = backlogTags.map((tag) => { return { value: tag.id, name: tag.id } });

    // Event Callbacks
    export let onFetchPrices: () => Promise<void>;

    const formatDurationDisplay = (duration: number) => {
        if (backlog.artifactType === ArtifactType.GAME) {
            if (duration === backlogFilters.duration.absoluteMax) return "No limit";
            return `${duration}h`;
        } else if (backlog.artifactType === ArtifactType.MOVIE) {
            if (duration === backlogFilters.duration.absoluteMax) return "No limit";
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}h ${minutes}m`;
        }
    };
</script>

<TabItem open={selectedTab == 'filters'} title="Filters" class="w-full">
    {#if backlog.artifactType === ArtifactType.GAME}
        <Button on:click={onFetchPrices}>Fetch Prices</Button>
    {/if}
    <Label class="block mb-1 mt-2">Order By</Label>
    <Select items={orderBacklogByItems} bind:value={backlogFilters.orderBy.type} />
    <Label class="block mb-1 mt-2">Filter Genre</Label>
    <MultiSelect items={genreItems} bind:value={backlogFilters.genres.included} />
    <Label class="block mb-1 mt-2">Exclude Genre</Label>
    <MultiSelect items={genreItems} bind:value={backlogFilters.genres.excluded} />
    <Label class="block mb-1 mt-2">Filter Tags</Label>
    <MultiSelect items={backlogTagsItems} bind:value={backlogFilters.tags.included} />
    <Label class="block mb-1 mt-2">Exclude Tags</Label>
    <MultiSelect items={backlogTagsItems} bind:value={backlogFilters.tags.excluded} />
    <Label class="block mb-1 mt-2"
        >Release Date: {backlogFilters.releaseDate.min} to {backlogFilters.releaseDate.max}</Label
    >
    <DoubleRange
        min={backlogFilters.releaseDate.absoluteMin}
        max={backlogFilters.releaseDate.absoluteMax}
        step={1}
        bind:minValue={backlogFilters.releaseDate.min}
        bind:maxValue={backlogFilters.releaseDate.max}
    />
    <Label class="block mb-1 mt-2"
        >Max Duration: {formatDurationDisplay(backlogFilters.duration.max)}</Label
    >
    <Range class="appearance-auto" min="0" max="200" step="1" bind:value={backlogFilters.duration.max} />
    <Label class="block mb-1 mt-2">Min Rating: {backlogFilters.rating.min}</Label>
    <Range class="appearance-auto" min="0" max="100" step="1" bind:value={backlogFilters.rating.min} />
    {#if backlogFilters.platforms}
        <Label class="block mb-1 mt-2">Platform</Label>
        <MultiSelect
            items={platformItems}
            bind:value={backlogFilters.platforms.included}
        />
    {/if}
</TabItem>