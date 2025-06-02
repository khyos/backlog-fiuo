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
    import type { Genre } from "$lib/model/Genre";
    import type { Platform } from "$lib/model/game/Platform";
    import type { Tag } from "$lib/model/Tag";
    import { backlogStore } from "../stores/BacklogStore";
    
    export let selectedTab: string = "filters";
    export let genres: Genre[] = [];
    export let platforms: Platform[] = [];
    export let backlogTags: Tag[] = [];

    $: backlogStoreInst = $backlogStore;

    $: orderBacklogByItems = [
        { value: backlogStoreInst.backlogFilters.orderBy.type, name: backlogStoreInst.backlogFilters.orderBy.type },
        { value: "dateAdded", name: "Date Added in List" }
    ];

    let genreItems = genres.map((genre) => { return { value: genre.id, name: genre.title } }) ;
    let platformItems = platforms.map((platform) => { return { value: platform.id, name: platform.title } }) ;
    let backlogTagsItems = backlogTags.map((tag) => { return { value: tag.id, name: tag.id } });

    // Event Callbacks
    export let onFetchPrices: () => Promise<void>;

    const formatDurationDisplay = (duration: number) => {
        if (backlogStoreInst.backlog.artifactType === ArtifactType.GAME || backlogStoreInst.backlog.artifactType === ArtifactType.TVSHOW) {
            if (duration === backlogStoreInst.backlogFilters.duration.absoluteMax) return "No limit";
            return `${duration}h`;
        } else if (backlogStoreInst.backlog.artifactType === ArtifactType.MOVIE) {
            if (duration === backlogStoreInst.backlogFilters.duration.absoluteMax) return "No limit";
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}h ${minutes}m`;
        }
    };
</script>

<TabItem open={selectedTab == 'filters'} title="Filters" class="w-full">
    {#if $backlogStore.backlog.artifactType === ArtifactType.GAME}
        <Button onclick={onFetchPrices}>Fetch Prices</Button>
    {/if}
    <Label class="block mb-1 mt-2">Order By</Label>
    <Select items={orderBacklogByItems} bind:value={$backlogStore.backlogFilters.orderBy.type} />
    <Label class="block mb-1 mt-2">Filter Genre</Label>
    <MultiSelect items={genreItems} bind:value={$backlogStore.backlogFilters.genres.included} />
    <Label class="block mb-1 mt-2">Exclude Genre</Label>
    <MultiSelect items={genreItems} bind:value={$backlogStore.backlogFilters.genres.excluded} />
    <Label class="block mb-1 mt-2">Filter Tags</Label>
    <MultiSelect items={backlogTagsItems} bind:value={$backlogStore.backlogFilters.tags.included} />
    <Label class="block mb-1 mt-2">Exclude Tags</Label>
    <MultiSelect items={backlogTagsItems} bind:value={$backlogStore.backlogFilters.tags.excluded} />
    <Label class="block mb-1 mt-2"
        >Release Date: {$backlogStore.backlogFilters.releaseDate.min} to {$backlogStore.backlogFilters.releaseDate.max}</Label
    >
    <DoubleRange
        min={$backlogStore.backlogFilters.releaseDate.absoluteMin}
        max={$backlogStore.backlogFilters.releaseDate.absoluteMax}
        step={1}
        bind:minValue={$backlogStore.backlogFilters.releaseDate.min}
        bind:maxValue={$backlogStore.backlogFilters.releaseDate.max}
    />
    <Label class="block mb-1 mt-2"
        >Max Duration: {formatDurationDisplay($backlogStore.backlogFilters.duration.max)}</Label
    >
    <Range class="appearance-auto" min="0" max={$backlogStore.backlogFilters.duration.absoluteMax} step="1" bind:value={$backlogStore.backlogFilters.duration.max} />
    <Label class="block mb-1 mt-2">Min Rating: {$backlogStore.backlogFilters.rating.min}</Label>
    <Range class="appearance-auto" min="0" max="100" step="1" bind:value={$backlogStore.backlogFilters.rating.min} />
    {#if $backlogStore.backlogFilters.platforms}
        <Label class="block mb-1 mt-2">Platform</Label>
        <MultiSelect
            items={platformItems}
            bind:value={$backlogStore.backlogFilters.platforms.included}
        />
    {/if}
</TabItem>