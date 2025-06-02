<script lang="ts">
    import { sineIn } from "svelte/easing";
    import { 
        CloseButton, 
        Drawer,
        Tabs, 
        type drawerTransitionParamTypes

    } from "flowbite-svelte";
    import BacklogDrawerTabAdd from "./BacklogDrawerTabAdd.svelte";
    import BacklogDrawerTabFilters from "./BacklogDrawerTabFilters.svelte";
    import BacklogDrawerTabOrder from "./BacklogDrawerTabOrder.svelte";
    import { pageStore, toggleDrawer } from "../stores/PageStore";
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
</script>

<Drawer
    placement="right"
    transitionParams={transitionDrawerParams}
    hidden={$pageStore.hiddenDrawer}
    id="sidebar1"
    backdropClass="opacity-25"
    class="w-full md:w-92"
>
    <Tabs
        tabStyle="full"
        style="align-items: center"
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
        />
        <BacklogDrawerTabOrder
            bind:selectedTab={$pageStore.selectedTab}
            canEdit={canEdit}
            {onMoveBacklogItem}
        />
        
        <CloseButton
            onclick={toggleDrawer}
            class="dark:text-white"
        />
    </Tabs>
</Drawer>