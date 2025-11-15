<script lang="ts">
    import { sineIn } from "svelte/easing";
    import { 
        Drawer,
        Tabs, 
        type drawerTransitionParamTypes

    } from "flowbite-svelte";
    import BacklogDrawerTabAdd from "./BacklogDrawerTabAdd.svelte";
    import BacklogDrawerTabFilters from "./BacklogDrawerTabFilters.svelte";
    import BacklogDrawerTabOrder from "./BacklogDrawerTabOrder.svelte";
    import { pageStore } from "../stores/PageStore";
    import type { Genre } from "$lib/model/Genre";
    import type { Platform } from "$lib/model/game/Platform";
    import type { Tag } from "$lib/model/Tag";
    
    export let transitionDrawerParams: drawerTransitionParamTypes = {
        x: 320,
        duration: 200,
        easing: sineIn,
    };
    export let canEdit: boolean;
    export let genres: Genre[] = [];
    export let backlogTags: Tag[] = [];
    export let platforms: Platform[] = [];

    // Event Callbacks
    export let onMoveBacklogItem: (srcRank: number, targetRank: number) => Promise<void>;
    export let onFetchPrices: () => Promise<void>;
    export let onAddBacklogItem: ((artifactId: number) => Promise<void>) | undefined = undefined;
</script>

<Drawer
    placement="right"
    transitionParams={transitionDrawerParams}
    bind:open={$pageStore.openDrawer}
    id="sidebar1"
    class="w-full md:w-92 backdrop:bg-black/25"
>
    <Tabs
        tabStyle="full"
        style="align-items: center"
        class="mr-8"
    >
        <BacklogDrawerTabFilters
            bind:selectedTab={$pageStore.selectedTab}
            {genres}
            {backlogTags}
            {platforms}
            {onFetchPrices}
        />
        <BacklogDrawerTabAdd
            bind:selectedTab={$pageStore.selectedTab}
            {canEdit}
            {onAddBacklogItem}
        />
        <BacklogDrawerTabOrder
            bind:selectedTab={$pageStore.selectedTab}
            canEdit={canEdit}
            {onMoveBacklogItem}
        />
    </Tabs>
</Drawer>