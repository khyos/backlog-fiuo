<script lang="ts">
    import { invalidate } from "$app/navigation";
    import {
        Badge,
        Button,
        Checkbox,
        Input,
        Listgroup,
        ListgroupItem,
        Modal,
        Select,
    } from "flowbite-svelte";
    import {
        PlusOutline,
    } from "flowbite-svelte-icons";
    import { Tag } from "$lib/model/Tag";
    import type { PageData } from "./$types";
    import "./page.pcss";
    import { deleteBacklogItem, fetchBacklog, fetchBacklogs } from "$lib/services/BacklogService";
    import { fetchPrices } from "$lib/services/PricesService";
    import type { Price } from "$lib/types/Price";
    import { createBacklogFilters, filterBacklogItems, type BacklogFilters } from "./BacklogFilters";
    import BacklogDrawer from "./components/BacklogDrawer.svelte";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import BacklogItemComp from "./components/BacklogItemComp.svelte";
    import { toggleDrawer } from "./stores/MainStore";
    import { Backlog } from "$lib/model/Backlog";
    import { Genre } from "$lib/model/Genre";
    import { Platform } from "$lib/model/game/Platform";

    export let data: PageData;

    $: backlog = Backlog.fromJSON(data.backlog);
    $: filteredBacklogItems = backlog.backlogItems;
    let backlogTags = data.backlogTags.map(backlogTag => Tag.fromJSON(backlogTag));
    let genres = data.genres.map(genre => Genre.fromJSON(genre));
    let platforms = data.platforms.map(platform => Platform.fromJSON(platform));

    let selectedBacklogItem: any = null;

    let backlogsForSelect: any[] = [];

    let showTagModal: boolean = false;
    let tagArtifactId: number;

    let showMoveToRank: boolean = false;
    let moveToRankBacklogItem: any;
    let backlogItemsForSelect = data.backlog.backlogItems.map((bi) => {
        return {
            value: bi.rank,
            name: `${bi.rank} - ${bi.artifact.title}`
        };
    });
    let moveToRankSelected: number;

    let showMoveToBacklog: boolean = false;
    let keepTagsSelected: boolean = false;
    let moveToBacklogSelected: any;

    let totalTime = data.backlog.backlogItems.reduce((acc, item) => {
        return acc + item.artifact.duration;
    }, 0);

    let searchTagTerm = "";
    let searchedTags: Tag[] = [];

    let backlogFilters: BacklogFilters = createBacklogFilters(data.backlog.artifactType, data.backlog.rankingType);

    $: backlogFilters,
        applyFilters();

    const deleteBacklogItemCb = async (e: any) => {
        const artifactId = e.target.getAttribute("data-id");
        await deleteBacklogItem(data.backlog.id, artifactId);
        refreshBacklog();
    };

    const moveBacklogItem = async (srcRank: number, targetRank: number) => {
        if (srcRank === targetRank) return Promise.resolve();
        return new Promise<void> (resolve => {
            fetch(`/api/backlog/${data.backlog.id}/move`, {
                method: "POST",
                body: JSON.stringify({
                    srcRank: srcRank,
                    targetRank: targetRank,
                }),
            }).then(() => {
                refreshBacklog().then(() => {
                    resolve();
                });
            });
        });
    };

    const moveBacklogItemToOtherBacklog = () => {
        return new Promise<void> (resolve => {
            fetch(`/api/backlog/move`, {
                method: "POST",
                body: JSON.stringify({
                    fromBacklogId: data.backlog.id,
                    toBacklogId: moveToBacklogSelected,
                    artifactId: selectedBacklogItem.artifact.id,
                    keepTags: keepTagsSelected
                }),
            }).then(() => {
                refreshBacklog().then(() => {
                    resolve();
                });
            });
        });
    }

    const openTags = (artifactId: number) => {
        showTagModal = true;
        tagArtifactId = artifactId;
        document.getElementById("search-field-tag")?.focus();
        fetchTags();
    };

    const fetchTags = () => {
        fetch(`/api/tag/search?artifactType=${data.backlog.artifactType}&query=${searchTagTerm}`)
            .then((res) => res.json())
            .then((tags) => {
                searchedTags = tags.map( (tag: any) => Tag.fromJSON(tag) );
                invalidate("tags");
            });
    };

    const addTag = (tagId: string) => {
        fetch(`/api/backlog/${data.backlog.id}/tag`, {
            method: "POST",
            body: JSON.stringify({
                artifactId: tagArtifactId,
                tagId: tagId,
            }),
        }).then(() => {
            refreshBacklog();
        });
    };

    const createTag = () => {
        fetch(`/api/tag/create`, {
            method: "POST",
            body: JSON.stringify({
                id: searchTagTerm,
                artifactType: data.backlog.artifactType
            }),
        }).then(() => {
            fetchTags();
        });
    };

    let prices: Record<string, Price>;
    const fetchPricesCb = async () => {
        const artifactIds = data.backlog.backlogItems.map(bi => bi.artifact.id);
        prices = await fetchPrices(data.backlog.artifactType, artifactIds);  
    }

    

    const refreshBacklog = async () => {
        return fetchBacklog(data.backlog.id).then((backlog) => {
            data.backlog = backlog;
            invalidate("data.backlog");
            invalidate("totalTime");
            applyFilters();
        });
    };

    const applyFilters = () => {
        filteredBacklogItems = filterBacklogItems(backlog.backlogItems, backlog.artifactType, backlogFilters);
    };

    const moveToRankShow = (backlogItem: any) => {
        showMoveToRank = true;
        moveToRankBacklogItem = backlogItem;
    }

    const moveToBacklogShow = async (backlogItem: any) => {
        selectedBacklogItem = backlogItem;
        showMoveToBacklog = true;
        const backlogs = await fetchBacklogs(data.backlog.artifactType);
        backlogsForSelect = backlogs.filter(backlog => backlog.id != data.backlog.id).map((backlog) => {
            return {
                value: backlog.id,
                name: backlog.title
            };
        });
    }
</script>

<Listgroup>
    <div style="display:flex">
        <h3
            class="p-1 text-xl font-medium text-gray-900 dark:text-white"
            style="flex-grow: 1; padding-left: 1rem"
        >
            {data.backlog.title} ({TimeUtil.formatDuration(totalTime)})
        </h3>
        <Button on:click={toggleDrawer}>Filters / Add</Button>
    </div>
    {#each filteredBacklogItems as backlogItem}
        <ListgroupItem>
            <BacklogItemComp
                {backlog}
                {backlogItem}
                canEdit={data.canEdit}
                backlogType={data.backlog.artifactType}
                rankingType={data.backlog.rankingType}
                {prices}
                onOpenTags={openTags}
                onMoveToRank={moveToRankShow}
                onMoveToBacklog={moveToBacklogShow}
                onDeleteBacklogItem={deleteBacklogItemCb}
                onMoveBacklogItem={moveBacklogItem}
            />
        </ListgroupItem>
    {/each}
</Listgroup>

<!-- Use the extracted drawer component -->
<BacklogDrawer 
    canEdit={data.canEdit}
    {backlog}
    bind:backlogFilters={backlogFilters}
    {genres}
    {backlogTags}
    {platforms}
    onMoveBacklogItem={moveBacklogItem}
    onFetchPrices={fetchPricesCb}
    {refreshBacklog}
/>

<!-- The Modals remain in the main file -->
<Modal size="xs" title="Add Tag" bind:open={showTagModal} autoclose>
    <div style="display: flex; align-items: center;" class="mb-2">
        <Input
            type="text"
            id="search-field-tag"
            placeholder="Search"
            autocomplete="off"
            style="flex-grow: 1;"
            bind:value={searchTagTerm}
            on:input={fetchTags}
        />
        <Button
            size="xs"
            disabled={searchTagTerm.length < 2}
            on:click={createTag}><PlusOutline size="sm" /></Button
        >
    </div>
    {#each searchedTags as tag}
        <Button size="xs" class="m-1" on:click={() => addTag(tag.id)}
            >{tag.id}</Button
        >
    {/each}
</Modal>

<Modal size="xs" title="Move to Rank" bind:open={showMoveToRank} autoclose>
    Move <Badge class="mb-2">{moveToRankBacklogItem.rank} - {moveToRankBacklogItem.artifact.title}</Badge> to
    <Select class="mt-2" items={backlogItemsForSelect} bind:value={moveToRankSelected} />
    <Button class="mt-2" on:click={() => {
        moveBacklogItem(moveToRankBacklogItem.rank, moveToRankSelected).then(() => {
            showMoveToRank = false;
        });
    }}>Move</Button>
</Modal>

<Modal size="xs" title="Move to Backlog" bind:open={showMoveToBacklog} autoclose>
    Move <Badge class="mb-2">{selectedBacklogItem.rank} - {selectedBacklogItem.artifact.title}</Badge> to
    <Select class="mt-2" items={backlogsForSelect} bind:value={moveToBacklogSelected} />
    <Checkbox bind:checked={keepTagsSelected}>Keep tags</Checkbox>
    <Button class="mt-2" on:click={() => {
        moveBacklogItemToOtherBacklog().then(() => {
            showMoveToBacklog = false;
        });
    }}>Move</Button>
</Modal>