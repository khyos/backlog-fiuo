<script lang="ts">
    import { invalidate } from "$app/navigation";
    import DoubleRange from "$lib/ui/DoubleRange.svelte";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import {
        Badge,
        Button,
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
    import { Backlog } from "$lib/model/Backlog";
    import { Artifact, ArtifactType } from "$lib/model/Artifact";
    import type { Game } from "$lib/model/game/Game";
    import { Tag } from "$lib/model/Tag";
    import type { PageData } from "./$types";
    import { OrderUtil } from "$lib/util/OrderUtil";
    import "./page.pcss";

    export let data: PageData;

    const GAME_RELEASE_DATE_MIN = 1970;
    const GAME_RELEASE_DATE_MAX = 2025;
    const MOVIE_RELEASE_DATE_MIN = 1895;
    const MOVIE_RELEASE_DATE_MAX = 2025;
    const GAME_MAX_DURATION = 200;
    const MOVIE_MAX_DURATION = 240;

    let hiddenDrawer: boolean = true;
    let transitionDrawerParams = {
        x: 320,
        duration: 200,
        easing: sineIn,
    };

    let selectedTab: string = "filters";

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

    let totalTime = data.backlog.backlogItems.reduce((acc, item) => {
        return acc + item.artifact.duration;
    }, 0);

    let searchArtifactTerm = "";
    let searchedArtifacts: Artifact[] = [];
    let searchTagTerm = "";
    let searchedTags: Tag[] = [];

    let filteredBacklogItems = data.backlog.backlogItems;
    let includedGenres: string[] = [];
    let excludedGenres: string[] = [];
    let includedTags: string[] = [];
    let excludedTags: string[] = [];
    let releaseDateMin: number;
    let releaseDateMax: number;
    let currentReleaseDateMin: number;
    let currentReleaseDateMax: number;
    if (data.backlog.artifactType === ArtifactType.GAME) {
        releaseDateMin = GAME_RELEASE_DATE_MIN;
        releaseDateMax = GAME_RELEASE_DATE_MAX;
        currentReleaseDateMin = GAME_RELEASE_DATE_MIN;
        currentReleaseDateMax = GAME_RELEASE_DATE_MAX;
    } else if (data.backlog.artifactType === ArtifactType.MOVIE) {
        releaseDateMin = MOVIE_RELEASE_DATE_MIN;
        releaseDateMax = MOVIE_RELEASE_DATE_MAX;
        currentReleaseDateMin = MOVIE_RELEASE_DATE_MIN;
        currentReleaseDateMax = MOVIE_RELEASE_DATE_MAX;
    }
    let ratingValue = 0;
    let currentMaxDuration: number;
    let maxDuration: number;
    if (data.backlog.artifactType === ArtifactType.GAME) {
        maxDuration = GAME_MAX_DURATION;
        currentMaxDuration = GAME_MAX_DURATION;
    } else if (data.backlog.artifactType === ArtifactType.MOVIE) {
        maxDuration = MOVIE_MAX_DURATION;
        currentMaxDuration = MOVIE_MAX_DURATION;
    }
    let includedPlatforms: any[] = [];

    let itemToOrder: any = null;
    let itemToCompareWith: any = null;
    let highestRank: number;
    let lowestRank: number;

    $: includedGenres,
        excludedGenres,
        includedTags,
        excludedTags,
        currentReleaseDateMin,
        currentReleaseDateMax,
        currentMaxDuration,
        ratingValue,
        includedPlatforms,
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

    const addBacklogItem = (e: any) => {
        const artifactId = e.currentTarget.getAttribute("data-id");
        const rank = data.backlog.backlogItems.length + 1;
        fetch(`/api/backlog/${data.backlog.id}/add`, {
            method: "POST",
            body: JSON.stringify({
                artifactId: artifactId,
                rank: rank,
            }),
        }).then(() => {
            refreshBacklog();
        });
    };

    const deleteBacklogItem = (e: any) => {
        const artifactId = e.target.getAttribute("data-id");
        fetch(`/api/backlog/${data.backlog.id}/delete`, {
            method: "POST",
            body: JSON.stringify({
                artifactId: artifactId,
            }),
        }).then(() => {
            refreshBacklog();
        });
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

    const refreshBacklog = () => {
        return fetch(`/api/backlog/${data.backlog.id}`)
            .then((res) => res.json())
            .then((backlog) => {
                data.backlog = Backlog.deserialize(backlog);
                backlog = data.backlog;
                invalidate("data.backlog");
                invalidate("totalTime");
                applyFilters();
            });
    };

    const applyFilters = () => {
        filteredBacklogItems = data.backlog.backlogItems;
        if (includedGenres.length > 0) {
            filteredBacklogItems = filteredBacklogItems.filter((item: any) => {
                return item.artifact.genres.some((genre: any) => {
                    return includedGenres.includes(genre.id);
                });
            });
        }
        if (excludedGenres.length > 0) {
            filteredBacklogItems = filteredBacklogItems.filter((item: any) => {
                return !item.artifact.genres.some((genre: any) => {
                    return excludedGenres.includes(genre.id);
                });
            });
        }
        if (includedTags.length > 0) {
            filteredBacklogItems = filteredBacklogItems.filter((item: any) => {
                return item.tags.some((tag: any) => {
                    return includedTags.includes(tag.id);
                });
            });
        }
        if (excludedTags.length > 0) {
            filteredBacklogItems = filteredBacklogItems.filter((item: any) => {
                return !item.tags.some((tag: any) => {
                    return excludedTags.includes(tag.id);
                });
            });
        }
        if (currentReleaseDateMin > releaseDateMin || currentReleaseDateMax < releaseDateMax) {
            filteredBacklogItems = filteredBacklogItems.filter((item) => {
                const artifactYearString = item.artifact.releaseDate;
                let artifactYear: number | null = null;
                if (artifactYearString) {
                    artifactYear = new Date(artifactYearString).getFullYear();
                }
                return (
                    artifactYear == null ||
                    (artifactYear >= currentReleaseDateMin &&
                    artifactYear <= currentReleaseDateMax)
                );
            });
        }
        if (currentMaxDuration < maxDuration) {
            let maxDurationInSeconds: number;
            if (data.backlog.artifactType === ArtifactType.GAME) {
                maxDurationInSeconds = currentMaxDuration * 3600;
            } else if (data.backlog.artifactType === ArtifactType.MOVIE) {
                maxDurationInSeconds = currentMaxDuration * 60;
            }
            filteredBacklogItems = filteredBacklogItems.filter((item) => {
                return item.artifact.duration <= maxDurationInSeconds;
            });
        }
        if (includedPlatforms.length > 0) {
            filteredBacklogItems = filteredBacklogItems.filter((item) => {
                const game = item.artifact as Game;
                return game.platforms.some((platform) => {
                    return includedPlatforms.includes(platform.id);
                });
            });
        }
        if (ratingValue > 0) {
            filteredBacklogItems = filteredBacklogItems.filter((item) => {
                let meanRating: number = 0;
                let ratingCount = 0;
                for (const rating of item.artifact.ratings) {
                    if (rating.rating != null) {
                        meanRating += rating.rating;
                        ratingCount++;
                    }
                }
                return (
                    meanRating === 0 ||
                    meanRating / ratingCount >= ratingValue
                );
            });
        }
    };

    const formatDuration = (duration: number) => {
        if (data.backlog.artifactType === ArtifactType.GAME) {
            if (duration === maxDuration) return "No limit";
            return `${duration}h`;
        } else if (data.backlog.artifactType === ArtifactType.MOVIE) {
            if (duration === maxDuration) return "No limit";
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return `${hours}h ${minutes}m`;
        }
    };

    const orderByComparison = (artifactId: number) => {
        highestRank = 1;
        lowestRank = data.backlog.backlogItems.length;
        itemToOrder = data.backlog.backlogItems.find((bi) => bi.artifact.id === artifactId);
        let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
        itemToCompareWith = data.backlog.backlogItems[randomIndex];
        selectedTab = "order";
        hiddenDrawer = false;
    }

    const moveToRankShow = (backlogItem: any) => {
        showMoveToRank = true;
        moveToRankBacklogItem = backlogItem;
    }

    const orderPickRandom = () => {
        highestRank = 1;
        lowestRank = data.backlog.backlogItems.length;
        let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
        itemToOrder = data.backlog.backlogItems[randomIndex];
        randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
        itemToCompareWith = data.backlog.backlogItems[randomIndex];
    }

    const orderPickHigher = () => {
        lowestRank = itemToCompareWith.rank - 1;
        if (itemToCompareWith.rank < itemToOrder.rank) {
            moveBacklogItem(itemToOrder.rank, itemToCompareWith.rank).then(() => {
                setTimeout(() => {
                    let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
                    itemToOrder = data.backlog.backlogItems[itemToCompareWith.rank - 1];
                    itemToCompareWith = data.backlog.backlogItems[randomIndex];
                }, 200);
            }) 
        } else {
            let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
            itemToCompareWith = data.backlog.backlogItems[randomIndex];
        }
    }

    const orderPickLower = () => {
        highestRank = itemToCompareWith.rank + 2;
        if (itemToCompareWith.rank > itemToOrder.rank) {
            moveBacklogItem(itemToOrder.rank, itemToCompareWith.rank).then(() => {
                setTimeout(() => {
                    let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
                    itemToOrder = data.backlog.backlogItems[itemToCompareWith.rank - 1];
                    itemToCompareWith = data.backlog.backlogItems[randomIndex];
                }, 200); 
            });
        } else {
            let randomIndex = OrderUtil.getRandomIntegerBetween(highestRank - 1, lowestRank - 1);
            itemToCompareWith = data.backlog.backlogItems[randomIndex];
        }
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
            use:draggable={{ canEdit: data.canEdit, rank: backlogItem.rank }}
            use:dropzone={{ canEdit: data.canEdit, rank: backlogItem.rank, onDrop: moveBacklogItem }}
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
                    {#if data.canEdit}
                        <Button size="xs"><ChevronDownOutline /></Button>
                        <Dropdown>
                            <DropdownItem on:click={() => openTags(backlogItem.artifact.id)}>Add Tag</DropdownItem>
                            <DropdownItem on:click={() => moveToRankShow(backlogItem)}>Move to Rank</DropdownItem>
                            <DropdownItem on:click={() => orderByComparison(backlogItem.artifact.id)}>Order by Comparison</DropdownItem>
                            <DropdownItem data-id={backlogItem.artifact.id} on:click={deleteBacklogItem}>Delete</DropdownItem>
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
            <Label class="block mb-1 mt-2">Filter Genre</Label>
            <MultiSelect items={data.genres} bind:value={includedGenres} />
            <Label class="block mb-1 mt-2">Exclude Genre</Label>
            <MultiSelect items={data.genres} bind:value={excludedGenres} />
            <Label class="block mb-1 mt-2">Filter Tags</Label>
            <MultiSelect items={data.backlogTags} bind:value={includedTags} />
            <Label class="block mb-1 mt-2">Exclude Tags</Label>
            <MultiSelect items={data.backlogTags} bind:value={excludedTags} />
            <Label class="block mb-1 mt-2"
                >Release Date: {currentReleaseDateMin} to {currentReleaseDateMax}</Label
            >
            <DoubleRange
                min={releaseDateMin}
                max={releaseDateMax}
                step={1}
                bind:minValue={currentReleaseDateMin}
                bind:maxValue={currentReleaseDateMax}
            />
            <Label class="block mb-1 mt-2"
                >Max Duration: {formatDuration(currentMaxDuration)}</Label
            >
            <Range min="0" max="200" step="1" bind:value={currentMaxDuration} />
            <Label class="block mb-1 mt-2">Min Rating: {ratingValue}</Label>
            <Range min="0" max="100" step="1" bind:value={ratingValue} />
            {#if data.backlog.artifactType === ArtifactType.GAME}
                <Label class="block mb-1 mt-2">Platform</Label>
                <MultiSelect
                    items={data.platforms}
                    bind:value={includedPlatforms}
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
                                    on:click={addBacklogItem}
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
            <Label class="block mb-2">Order items</Label>
            <Button
                class="w-full mb-2"
                on:click={orderPickRandom}
                >Pick a Random Item</Button>
            {#if itemToOrder}
                <p class="mb-2">Item to Order: <Badge class="mr-1">{itemToOrder.rank}</Badge>{itemToOrder.artifact.title}</p>
                <Button
                    class="mb-2"
                    on:click={orderPickRandom}
                    >Right Place</Button>
                <Button
                    class="mb-2"
                    on:click={orderPickHigher}
                    >Higher</Button>
                <Button
                    class="mb-2"
                    on:click={orderPickLower}
                    >Lower</Button>
                <p class="mb-2">Compared to: <Badge class="mr-1">{itemToCompareWith.rank}</Badge>{itemToCompareWith.artifact.title}</p>
            {/if}
            
        </TabItem>
        <CloseButton
            on:click={() => (hiddenDrawer = true)}
            class="dark:text-white"
        />
    </Tabs>
</Drawer>
