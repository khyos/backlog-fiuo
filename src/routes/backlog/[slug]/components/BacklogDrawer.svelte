<script lang="ts">
    import { sineIn } from "svelte/easing";
    import { 
        CloseButton, 
        Drawer,
        Tabs 
    } from "flowbite-svelte";
    import type { BacklogFilters } from "../BacklogFilters";
    import type { PageData } from "../$types";
    import BacklogDrawerTabAdd from "./BacklogDrawerTabAdd.svelte";
    import BacklogDrawerTabFilters from "./BacklogDrawerTabFilters.svelte";
    import BacklogDrawerTabOrder from "./BacklogDrawerTabOrder.svelte";
    import { backlogPageState, toggleDrawer } from "../stores/MainStore";
    
    export let transitionDrawerParams = {
        x: 320,
        duration: 200,
        easing: sineIn,
    };
    export let canEdit: boolean;
    export let backlog: PageData['backlog'];
    export let backlogFilters: BacklogFilters;
    export let genres: any[] = [];
    export let backlogTags: any[] = [];
    export let platforms: any[] = [];

    // Event Callbacks
    export let refreshBacklog: () => Promise<void>;
    export let onMoveBacklogItem: (srcRank: number, targetRank: number) => Promise<void>;
    export let onFetchPrices: () => Promise<void>;

    $: state = $backlogPageState;
</script>

<Drawer
    placement="right"
    transitionType="fly"
    transitionParams={transitionDrawerParams}
    hidden={state.hiddenDrawer}
    id="sidebar1"
    bgOpacity="bg-opacity-25"
    width="w-96"
>
    <Tabs
        tabStyle="full"
        defaultClass="flex divide-x rtl:divide-x-reverse"
        style="align-items: center"
    >
        <BacklogDrawerTabFilters
            bind:selectedTab={state.selectedTab}
            {backlog}
            bind:backlogFilters={backlogFilters}
            {genres}
            {backlogTags}
            {platforms}
            {onFetchPrices}
        />
        <BacklogDrawerTabAdd
            bind:selectedTab={state.selectedTab}
            {canEdit}
            {backlog}
            {refreshBacklog}
        />
        <BacklogDrawerTabOrder
            bind:selectedTab={state.selectedTab}
            canEdit={canEdit}
            backlog={backlog}
            {onMoveBacklogItem}
            {refreshBacklog}
        />
        
        <CloseButton
            on:click={toggleDrawer}
            class="dark:text-white"
        />
    </Tabs>
</Drawer>