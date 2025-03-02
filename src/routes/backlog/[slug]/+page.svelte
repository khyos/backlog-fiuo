<script lang="ts">
    import { invalidate } from "$app/navigation";
    import DoubleRange from "$lib/ui/DoubleRange.svelte";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import {
        Badge,
        Button,
        Checkbox,
        CloseButton,
        Drawer,
        Dropdown,
        DropdownItem,
        Input,
        Label,
        Listgroup,
        ListgroupItem,
        Modal,
        MultiSelect,
        Range,
        Select,
        TabItem,
        Tabs,
    } from "flowbite-svelte";
    import {
        BarsOutline,
        CheckCircleOutline,
        ChevronDownOutline,
        PlusOutline,
    } from "flowbite-svelte-icons";
    import { sineIn } from "svelte/easing";
    import { draggable, dropzone } from "./dnd";
    import { Artifact, ArtifactType } from "$lib/model/Artifact";
    import { Tag } from "$lib/model/Tag";
    import type { PageData } from "./$types";
    import { OrderUtil } from "$lib/util/OrderUtil";
    import "./page.pcss";
    import { BacklogRankingType } from "$lib/model/Backlog";
    import { getPosterURL } from "$lib/services/ArtifactService";
    import { addBacklogItem, deleteBacklogItem, fetchBacklog, fetchBacklogs } from "$lib/services/BacklogService";
    import { fetchPrices } from "$lib/services/PricesService";
    import type { Price } from "$lib/types/Price";
    import { createBacklogFilters, filterBacklogItems, type BacklogFilters } from "./BacklogFilters";

    export let data: PageData;

    let hiddenDrawer: boolean = true;
    let transitionDrawerParams = {
        x: 320,
        duration: 200,
        easing: sineIn,
    };

    let selectedTab: string = "filters";

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

    let searchArtifactTerm = "";
    let searchedArtifacts: Artifact[] = [];
    let searchTagTerm = "";
    let searchedTags: Tag[] = [];

    let filteredBacklogItems = data.backlog.backlogItems;
    let backlogFilters: BacklogFilters = createBacklogFilters(data.backlog.artifactType, data.backlog.rankingType);

    let orderBacklogByItems = [
        { value: backlogFilters.orderBy.type, name: backlogFilters.orderBy.type },
        { value: "dateAdded", name: "Date Added in List" }
    ];
   
    let orderByComparisonItemA: any = null;
    let orderByComparisonItemB: any = null;
    let highestRank: number;
    let lowestRank: number;
    let orderByEloArtifactId: number | null = null;
    let orderByEloItemA: any = null;
    let orderByEloItemB: any = null;
    let orderbyEloItemAPoster: string | null = null;
    let orderbyEloItemBPoster: string | null = null;

    $: backlogFilters,
        applyFilters();

    const fetchArtifacts = () => {
        fetch(
            `/api/${data.backlog.artifactType}/search?query=${searchArtifactTerm}`,
        )
            .then((res) => res.json())
            .then((artifacts) => {
                searchedArtifacts = artifacts;
                invalidate("searchedArtifacts");
            });
    };

    const addBacklogItemCb = async (e: any) => {
        const artifactId = e.currentTarget.getAttribute("data-id");
        await addBacklogItem(data.backlog.id, artifactId);
        refreshBacklog();
    };

    const deleteBacklogItemCb = async (e: any) => {
        const artifactId = e.target.getAttribute("data-id");
        await deleteBacklogItem(data.backlog.id, artifactId);
        refreshBacklog();
    };

    const moveBacklogItem = (srcRank: number, targetRank: number) => {
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
                searchedTags = tags.map( (tag: any) => Tag.deserialize(tag) );
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

    const removeTag = (artifactId: number, tagId: string) => {
        fetch(`/api/backlog/${data.backlog.id}/tag`, {
            method: "DELETE",
            body: JSON.stringify({
                artifactId: artifactId,
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
        const artifactIds =  data.backlog.backlogItems.map(bi => bi.artifact.id);
        prices = await fetchPrices(data.backlog.artifactType, artifactIds);  
    }

    const openPriceLink = async (priceId: string) => {
        fetch(`/api/link/getUrl?artifactType=${data.backlog.artifactType}&linkType=ITAD&linkUrl=${priceId}`, {
            method: "GET",
        }).then((res) => res.text())
        .then((response) => {
            window.open(response, "blank_");
        });
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
        filteredBacklogItems = filterBacklogItems(data.backlog.backlogItems, data.backlog.artifactType, backlogFilters);
    };

    const formatDuration = (duration: number) => {
        if (data.backlog.artifactType === ArtifactType.GAME) {
            if (duration === backlogFilters.duration.absoluteMax) return "No limit";
            return `${duration}h`;
        } else if (data.backlog.artifactType === ArtifactType.MOVIE) {
            if (duration === backlogFilters.duration.absoluteMax) return "No limit";
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}h ${minutes}m`;
        }
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) {
            return 'TBD';
        }
        const date = new Date(dateString);
        if (date.getDate() === 31 && date.getMonth() === 11) {
            return date.getFullYear();
        }
        if (date.getFullYear() >= 2100) {
            return 'TBD';
        }
        return date.toLocaleDateString();
    }

    const orderByComparison = (artifactId: number) => {
        highestRank = 1;
        lowestRank = data.backlog.backlogItems.length;
        orderByComparisonItemA = data.backlog.backlogItems.find((bi) => bi.artifact.id === artifactId);
        let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
        orderByComparisonItemB = data.backlog.backlogItems[randomIndex];
        selectedTab = "order";
        hiddenDrawer = false;
    }

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

    const orderByComparisonPickRandom = () => {
        highestRank = 1;
        lowestRank = data.backlog.backlogItems.length;
        const randomIndexA = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
        orderByComparisonItemA = data.backlog.backlogItems[randomIndexA];
        const randomIndexB = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
        orderByComparisonItemB = data.backlog.backlogItems[randomIndexB];
    }

    const orderByComparisonPickHigher = () => {
        lowestRank = orderByComparisonItemB.rank - 1;
        if (orderByComparisonItemB.rank < orderByComparisonItemA.rank) {
            moveBacklogItem(orderByComparisonItemA.rank, orderByComparisonItemB.rank).then(() => {
                setTimeout(() => {
                    let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
                    orderByComparisonItemA = data.backlog.backlogItems[orderByComparisonItemB.rank - 1];
                    orderByComparisonItemB = data.backlog.backlogItems[randomIndex];
                }, 200);
            }) 
        } else {
            let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
            orderByComparisonItemB = data.backlog.backlogItems[randomIndex];
        }
    }

    const orderByComparisonPickLower = () => {
        highestRank = orderByComparisonItemB.rank + 2;
        if (orderByComparisonItemB.rank > orderByComparisonItemA.rank) {
            moveBacklogItem(orderByComparisonItemA.rank, orderByComparisonItemB.rank).then(() => {
                setTimeout(() => {
                    let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
                    orderByComparisonItemA = data.backlog.backlogItems[orderByComparisonItemB.rank - 1];
                    orderByComparisonItemB = data.backlog.backlogItems[randomIndex];
                }, 200); 
            });
        } else {
            let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
            orderByComparisonItemB = data.backlog.backlogItems[randomIndex];
        }
    }

    const orderByEloPickRandom = async () => {
        orderByEloArtifactId = null;
        if (data.backlog.backlogItems.length < 2) {
            return;
        }
        orderbyEloItemAPoster = '';
        orderbyEloItemBPoster = '';
        const randomIndexA = OrderUtil.getRandomIntegerBetween(0, data.backlog.backlogItems.length - 1);
        orderByEloItemA = data.backlog.backlogItems[randomIndexA];
        let randomIndexB = OrderUtil.getRandomIntegerBetween(0, data.backlog.backlogItems.length - 1);
        while (randomIndexB === randomIndexA) {
            randomIndexB = OrderUtil.getRandomIntegerBetween(0, data.backlog.backlogItems.length - 1);
        }
        orderByEloItemB = data.backlog.backlogItems[randomIndexB];
        orderbyEloItemAPoster = await getPosterURL(data.backlog.artifactType, orderByEloItemA.artifact.id);
        orderbyEloItemBPoster = await getPosterURL(data.backlog.artifactType, orderByEloItemB.artifact.id);
    }

    const orderByEloPick = async (artifactId: number) => {
        selectedTab = "order";
        hiddenDrawer = false;
        orderByEloArtifactId = artifactId;
        if (data.backlog.backlogItems.length < 2) {
            return;
        }
        orderbyEloItemAPoster = '';
        orderbyEloItemBPoster = '';
        orderByEloItemA = data.backlog.backlogItems.find(backlogItem => backlogItem.artifact.id === artifactId);
        let randomIndexB = OrderUtil.getRandomIntegerBetween(0, data.backlog.backlogItems.length - 1);
        orderByEloItemB = data.backlog.backlogItems[randomIndexB];
        while (orderByEloItemA.artifact.id === orderByEloItemB.artifact.id) {
            randomIndexB = OrderUtil.getRandomIntegerBetween(0, data.backlog.backlogItems.length - 1);
            orderByEloItemB = data.backlog.backlogItems[randomIndexB];
        }
        orderbyEloItemAPoster = await getPosterURL(data.backlog.artifactType, orderByEloItemA.artifact.id);
        orderbyEloItemBPoster = await getPosterURL(data.backlog.artifactType, orderByEloItemB.artifact.id);
    }

    const orderByEloFight = (winner: string) => {
        let winnerItem: any;
        let loserItem: any;
        if (winner === "A") {
            winnerItem = orderByEloItemA;
            loserItem = orderByEloItemB;
        } else {
            winnerItem = orderByEloItemB;
            loserItem = orderByEloItemA;
        }
        fetch(`/api/backlog/${data.backlog.id}/elo`, {
            method: "POST",
            body: JSON.stringify({
                winnerArtifactId: winnerItem.artifact.id,
                loserArtifactId: loserItem.artifact.id,
            }),
        }).then(() => {
            refreshBacklog();
            if (orderByEloArtifactId) {
                orderByEloPick(orderByEloArtifactId);
            } else {
                orderByEloPickRandom();
            }
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
        <Button on:click={() => (hiddenDrawer = false)}>Filters / Add</Button>
    </div>
    {#each filteredBacklogItems as backlogItem}
        <div
            use:draggable={{ canEdit: data.canEdit && data.backlog.rankingType === BacklogRankingType.RANK, rank: backlogItem.rank }}
            use:dropzone={{ canEdit: data.canEdit && data.backlog.rankingType === BacklogRankingType.RANK, rank: backlogItem.rank, onDrop: moveBacklogItem }}
        >
            <ListgroupItem>
                <div class="flexCenter">
                    <div style="display: inline-flex; flex-grow: 1; align-items: center;">
                        <BarsOutline class="mr-4" />
                        <Badge class="mr-1">{backlogItem.rank}</Badge>
                        <a href={`/${data.backlog.artifactType}/${backlogItem.artifact.id}`}
                            >{backlogItem.artifact.title}</a
                        >
                        <div>
                            {#each backlogItem.tags as tag}
                                <Badge class="ml-1 pr-0">
                                    {tag.id}
                                    {#if data.canEdit}
                                        <Button
                                            id="deleteTag"
                                            size="xs"
                                            on:click={() =>
                                                removeTag(
                                                    backlogItem.artifact.id,
                                                    tag.id,
                                                )}
                                            class="px-2.5 py-0"
                                            style="background-color: transparent; color: var(--tw-text-opacity)"
                                            >x</Button
                                        >
                                    {/if}
                                </Badge>
                            {/each}
                        </div>
                    </div>
                    {#if prices?.[backlogItem.artifact.id]}
                        <Badge class="mr-1"><button on:click={() => openPriceLink(prices[backlogItem.artifact.id].id)}>
                            {prices[backlogItem.artifact.id].current}€ / {prices[backlogItem.artifact.id].historyLow}€
                        </button></Badge>
                    {/if}
                    {#if data.backlog.rankingType === BacklogRankingType.ELO}
                        <Badge class="mr-1">{backlogItem.elo}</Badge>
                    {/if}
                    {#if data.backlog.rankingType === BacklogRankingType.WISHLIST}
                        <Badge class="mr-1">{formatDate(backlogItem.artifact.releaseDate)}</Badge>
                    {/if}
                    {#if data.canEdit}
                        <Button size="xs"><ChevronDownOutline /></Button>
                        <Dropdown>
                            <DropdownItem on:click={() => openTags(backlogItem.artifact.id)}>Add Tag</DropdownItem>
                            {#if data.backlog.rankingType === BacklogRankingType.RANK}
                                <DropdownItem on:click={() => moveToRankShow(backlogItem)}>Move to Rank</DropdownItem>
                                <DropdownItem on:click={() => orderByComparison(backlogItem.artifact.id)}>Order by Comparison</DropdownItem>
                            {:else if data.backlog.rankingType === BacklogRankingType.ELO}
                                <DropdownItem on:click={() => orderByEloPick(backlogItem.artifact.id)}>Order by Elo</DropdownItem>
                            {/if}
                            <DropdownItem data-id={backlogItem.artifact.id} on:click={() => moveToBacklogShow(backlogItem)}>Move to other Backlog</DropdownItem>
                            <DropdownItem data-id={backlogItem.artifact.id} on:click={deleteBacklogItemCb}>Delete</DropdownItem>
                        </Dropdown>
                    {/if}
                </div>
            </ListgroupItem>
        </div>
    {/each}
</Listgroup>

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

<Drawer
    placement="right"
    transitionType="fly"
    transitionParams={transitionDrawerParams}
    bind:hidden={hiddenDrawer}
    id="sidebar1"
    bgOpacity="bg-opacity-25"
    width="w-96"
>
    <Tabs
        tabStyle="full"
        defaultClass="flex divide-x rtl:divide-x-reverse"
        style="align-items: center"
    >
        <TabItem open={selectedTab == 'filters'} title="Filters" class="w-full">
            {#if data.backlog.artifactType === ArtifactType.GAME}
                <Button on:click={fetchPricesCb}>Fetch Prices</Button>
            {/if}
            <Label class="block mb-1 mt-2">Order By</Label>
            <Select items={orderBacklogByItems} bind:value={backlogFilters.orderBy.type} />
            <Label class="block mb-1 mt-2">Filter Genre</Label>
            <MultiSelect items={data.genres} bind:value={backlogFilters.genres.included} />
            <Label class="block mb-1 mt-2">Exclude Genre</Label>
            <MultiSelect items={data.genres} bind:value={backlogFilters.genres.excluded} />
            <Label class="block mb-1 mt-2">Filter Tags</Label>
            <MultiSelect items={data.backlogTags} bind:value={backlogFilters.tags.included} />
            <Label class="block mb-1 mt-2">Exclude Tags</Label>
            <MultiSelect items={data.backlogTags} bind:value={backlogFilters.tags.excluded} />
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
                >Max Duration: {formatDuration(backlogFilters.duration.max)}</Label
            >
            <Range class="appearance-auto" min="0" max="200" step="1" bind:value={backlogFilters.duration.max} />
            <Label class="block mb-1 mt-2">Min Rating: {backlogFilters.rating.min}</Label>
            <Range class="appearance-auto" min="0" max="100" step="1" bind:value={backlogFilters.rating.min} />
            {#if backlogFilters.platforms}
                <Label class="block mb-1 mt-2">Platform</Label>
                <MultiSelect
                    items={data.platforms}
                    bind:value={backlogFilters.platforms.included}
                />
            {/if}
        </TabItem>
        <TabItem open={selectedTab == 'add'} title="Add" class="w-full" disabled={!data.canEdit}>
            <Label class="block mb-2">Add to backlog</Label>
            <Input
                type="text"
                id="search-field"
                placeholder="Search"
                autocomplete="off"
                bind:value={searchArtifactTerm}
                on:input={fetchArtifacts}
            />
            {#if searchedArtifacts?.length > 0}
                <Listgroup>
                    {#each searchedArtifacts as artifact}
                        {#if data.backlog.backlogItems.find((bi) => bi.artifact.id === artifact.id) != null}
                            <ListgroupItem>
                                <div style="display: inline-flex;">
                                    {artifact.title}<CheckCircleOutline />
                                </div>
                            </ListgroupItem>
                        {:else}
                            <ListgroupItem>
                                {artifact.title}
                                <Button
                                    size="xs"
                                    data-id={artifact.id}
                                    on:click={addBacklogItemCb}
                                >
                                    <PlusOutline size="xs" />
                                </Button>
                            </ListgroupItem>
                        {/if}
                    {/each}
                </Listgroup>
            {:else if searchArtifactTerm.length > 0}
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    No results
                </p>
            {/if}
        </TabItem>
        <TabItem open={selectedTab == 'order'} title="Order" class="w-full" disabled={!data.canEdit}>
            {#if data.backlog.rankingType === BacklogRankingType.RANK}
                <Button
                    class="w-full mb-2 mt-2"
                    on:click={orderByComparisonPickRandom}
                    >Pick a Random Item</Button>
                {#if orderByComparisonItemA}
                    <p class="mb-2">Item to Order: <Badge class="mr-1">{orderByComparisonItemA.rank}</Badge>{orderByComparisonItemA.artifact.title}</p>
                    <Button
                        class="mb-2"
                        on:click={orderByComparisonPickRandom}
                        >Right Place</Button>
                    <Button
                        class="mb-2"
                        on:click={orderByComparisonPickHigher}
                        >Higher</Button>
                    <Button
                        class="mb-2"
                        on:click={orderByComparisonPickLower}
                        >Lower</Button>
                    <p class="mb-2">Compared to: <Badge class="mr-1">{orderByComparisonItemB.rank}</Badge>{orderByComparisonItemB.artifact.title}</p>
                {/if}
            {:else if data.backlog.rankingType === BacklogRankingType.ELO}
                <Button
                    class="w-full mb-2 mt-2"
                    on:click={orderByEloPickRandom}
                    >Pick a Random Item</Button>
                {#if orderByEloItemA}
                    <p class="mb-2">Elo Fight:</p>
                    <div class="mb-2" style="display: inline-flex">
                        <Button
                            class="w-1/2 px-2.5"
                            style="display:flex; flex-direction: column; margin-right: 0.25rem"
                            on:click={() => { orderByEloFight("A")}}
                            >
                            <div class="w-full mb-1" style="display: inline-flex">
                                <div style="flex-grow: 1; text-align: left;"><Badge class="mr-1">{orderByEloItemA.rank}</Badge></div>
                                <div style="flex-grow: 1; text-align: right;"><Badge class="ml-1">{orderByEloItemA.elo}</Badge></div>
                            </div>
                            <img src={orderbyEloItemAPoster} alt="poster"/>
                            <p style="flex-grow: 1;">{`${orderByEloItemA.artifact.title} (${new Date(orderByEloItemA.artifact.releaseDate).getFullYear()})`}</p>
                        </Button>
                        <Button
                            class="w-1/2 px-2.5"
                            style="display:flex; flex-direction: column; margin-right: 0.25rem"
                            on:click={() => { orderByEloFight("B")}}
                            >
                            <div class="w-full mb-1" style="display: inline-flex">
                                <div style="flex-grow: 1; text-align: left;"><Badge class="mr-1">{orderByEloItemB.rank}</Badge></div>
                                <div style="flex-grow: 1; text-align: right;"><Badge class="ml-1">{orderByEloItemB.elo}</Badge></div>
                            </div>
                            <img src={orderbyEloItemBPoster} alt="poster"/>
                            <p style="flex-grow: 1;">{`${orderByEloItemB.artifact.title} (${new Date(orderByEloItemB.artifact.releaseDate).getFullYear()})`}</p>
                        </Button>
                    </div>
                {/if}
            {/if} 
        </TabItem>
        <CloseButton
            on:click={() => (hiddenDrawer = true)}
            class="dark:text-white"
        />
    </Tabs>
</Drawer>
