<script lang="ts">
    import {
        Avatar,
        Dropdown,
        DropdownHeader,
        DropdownItem,
        MegaMenu,
        NavBrand,
        NavHamburger,
        NavLi,
        NavUl,
        Navbar,
    } from "flowbite-svelte";
    import "../app.pcss";
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
            <DropdownItem href="/profile">Profile</DropdownItem>
            <DropdownItem href="/signout">Sign out</DropdownItem>
        {:else}
            <DropdownItem href="/signin">Sign in</DropdownItem>
            <DropdownItem href="/signup">Sign up</DropdownItem>
        {/if}
    </Dropdown>
    <NavUl class="z-50">
        <NavLi href="/">Home</NavLi>
        <NavLi href="/backlog">Backlogs</NavLi>
        <NavLi class="cursor-pointer">Games<ChevronDownOutline class="w-6 h-6 ms-2 text-primary-800 dark:text-white inline"/></NavLi>
        <MegaMenu items={gameMenu} ulClass="" let:item>
            <div class="py-2">
                <a href={item.href} class="hover:text-primary-600 dark:hover:text-primary-500">{item.name}</a>
            </div>
        </MegaMenu>
        <NavLi class="cursor-pointer">Movies<ChevronDownOutline class="w-6 h-6 ms-2 text-primary-800 dark:text-white inline"/></NavLi>
        <MegaMenu items={movieMenu} ulClass="" let:item>
            <div class="py-2">
                <a href={item.href} class="hover:text-primary-600 dark:hover:text-primary-500">{item.name}</a>
            </div>
        </MegaMenu>
        <NavLi class="cursor-pointer">TV Shows<ChevronDownOutline class="w-6 h-6 ms-2 text-primary-800 dark:text-white inline"/></NavLi>
        <MegaMenu items={tvShowMenu} ulClass="" let:item>
            <div class="py-2">
                <a href={item.href} class="hover:text-primary-600 dark:hover:text-primary-500">{item.name}</a>
            </div>
        </MegaMenu>
    </NavUl>
</Navbar>
<slot></slot>
