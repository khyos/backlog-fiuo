<script lang="ts">
    import {
        Avatar,
        Dropdown,
        DropdownGroup,
        DropdownHeader,
        DropdownItem,
        NavBrand,
        NavHamburger,
        NavLi,
        NavUl,
        Navbar,
    } from "flowbite-svelte";
    import "../app.css";
    import type { LayoutData } from "./$types";
    import { ChevronDownOutline } from "flowbite-svelte-icons";

    export let data: LayoutData;

    const gameMenu = [
        { name: 'Search', href: '/game' },
        { name: 'Create', href: '/game/create' },
        { name: 'My List', href: '/mylist/game' }
    ];

    const movieMenu = [
        { name: 'Search', href: '/movie' },
        { name: 'Create', href: '/movie/create' },
        { name: 'My List', href: '/mylist/movie' }
    ];

    const tvShowMenu = [
        { name: 'Search', href: '/tvshow' },
        { name: 'Create', href: '/tvshow/create' },
        { name: 'On Going', href: '/ongoing/tvshow' },
        { name: 'My List', href: '/mylist/tvshow' }
    ];

    const animeMenu = [
        { name: 'Search', href: '/anime' },
        { name: 'Create', href: '/anime/create' },
        { name: 'On Going', href: '/ongoing/anime' },
        { name: 'My List', href: '/mylist/anime' }
    ];
</script>

<Navbar class="px-0">
    <NavBrand href="/">
        <span class="whitespace-nowrap text-xl font-semibold dark:text-white"
            >Backlog</span
        >
    </NavBrand>
    <div class="flex items-center md:order-2">
        <Avatar id="avatar-menu" />
        <NavHamburger class="block md:hidden" />
    </div>
    <Dropdown placement="bottom" triggeredBy="#avatar-menu">
        {#if data.user.id >= 0}
            <DropdownHeader>
                <span class="block text-sm">{data.user.username}</span>
            </DropdownHeader>
            <DropdownGroup>
                <DropdownItem href="/profile">Profile</DropdownItem>
                <DropdownItem href="/signout">Sign out</DropdownItem>
            </DropdownGroup>
        {:else}
            <DropdownGroup>
                <DropdownItem href="/signin">Sign in</DropdownItem>
                <DropdownItem href="/signup">Sign up</DropdownItem>
            </DropdownGroup>
        {/if}
    </Dropdown>
    <NavUl class="z-50">
        <NavLi href="/" class="mr-4">Home</NavLi>
        <NavLi href="/backlog" class="mr-4">Backlogs</NavLi>
        <NavLi class="cursor-pointer mr-4">Games<ChevronDownOutline class="w-5 h-5 ms-2 text-primary-800 dark:text-white inline"/></NavLi>
        <Dropdown simple class="w-30">
            {#each gameMenu as item}
                <DropdownItem href={item.href} class="hover:text-primary-600 dark:hover:text-primary-500">{item.name}</DropdownItem>
            {/each}
        </Dropdown>
        <NavLi class="cursor-pointer mr-4">Movies<ChevronDownOutline class="w-5 h-5 ms-2 text-primary-800 dark:text-white inline"/></NavLi>
        <Dropdown simple class="w-30">
            {#each movieMenu as item}
                <DropdownItem href={item.href} class="hover:text-primary-600 dark:hover:text-primary-500">{item.name}</DropdownItem>
            {/each}
        </Dropdown>
        <NavLi class="cursor-pointer mr-4">TV Shows<ChevronDownOutline class="w-5 h-5 ms-2 text-primary-800 dark:text-white inline"/></NavLi>
        <Dropdown simple class="w-30">
            {#each tvShowMenu as item}
                <DropdownItem href={item.href} class="hover:text-primary-600 dark:hover:text-primary-500">{item.name}</DropdownItem>
            {/each}
        </Dropdown>
        <NavLi class="cursor-pointer">Anime<ChevronDownOutline class="w-5 h-5 ms-2 text-primary-800 dark:text-white inline"/></NavLi>
        <Dropdown simple class="w-30">
            {#each animeMenu as item}
                <DropdownItem href={item.href} class="hover:text-primary-600 dark:hover:text-primary-500">{item.name}</DropdownItem>
            {/each}
        </Dropdown>
    </NavUl>
</Navbar>
<slot></slot>
