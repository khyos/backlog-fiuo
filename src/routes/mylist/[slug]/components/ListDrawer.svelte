<script lang="ts">
    import { sineIn } from "svelte/easing";
    import { 
        CloseButton, 
        Drawer,
        Tabs 
    } from "flowbite-svelte";
    
    import { pageStore, toggleDrawer } from "../stores/PageStore";
    import type { Genre } from "$lib/model/Genre";
    import type { Platform } from "$lib/model/game/Platform";
    import ListDrawerTabFilters from "./ListDrawerTabFilters.svelte";
    import ListDrawerTabAdd from "./ListDrawerTabAdd.svelte";
    
    export let transitionDrawerParams = {
        x: 320,
        duration: 200,
        easing: sineIn,
    };
    export let genres: Genre[] = [];
    export let platforms: Platform[] = [];
</script>

<Drawer
    placement="right"
    transitionType="fly"
    transitionParams={transitionDrawerParams}
    hidden={$pageStore.hiddenDrawer}
    id="sidebar1"
    bgOpacity="bg-opacity-25"
    width="w-96"
>
    <Tabs
        tabStyle="full"
        defaultClass="flex divide-x rtl:divide-x-reverse"
        style="align-items: center"
    >
        <ListDrawerTabFilters
            bind:selectedTab={$pageStore.selectedTab}
            {genres}
            {platforms}
        />
        <ListDrawerTabAdd
            bind:selectedTab={$pageStore.selectedTab}
        />
        
        <CloseButton
            on:click={toggleDrawer}
            class="dark:text-white"
        />
    </Tabs>
</Drawer>