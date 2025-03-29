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

    const tvShowMenu = [
        { name: 'Search', href: '/tvshow' },
        { name: 'Create', href: '/tvshow/create' },
        { name: 'mylist', href: '/mylist/tvshow' }
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
        <NavHamburger class="w-full md:flex md:w-auto md:order-1" />
    </div>
    <Dropdown placement="bottom" triggeredBy="#avatar-menu">
        {#if data.user.id >= 0}
            <DropdownHeader>
                <span class="block text-sm">${data.user.username}</span>
            </DropdownHeader>
            <DropdownItem href="/profile">Profile</DropdownItem>
            <DropdownItem href="/signout">Sign out</DropdownItem>
        {:else}
            <DropdownItem href="/signin">Sign in</DropdownItem>
            <DropdownItem href="/signup">Sign up</DropdownItem>
        {/if}
    </Dropdown>
    <NavUl>
        <NavLi href="/">Home</NavLi>
        <NavLi href="/backlog">Backlogs</NavLi>
        <NavLi href="/game">Games</NavLi>
        <NavLi href="/movie">Movies</NavLi>
        <NavLi class="cursor-pointer">TV Shows<ChevronDownOutline class="w-6 h-6 ms-2 text-primary-800 dark:text-white inline"/></NavLi>
        <MegaMenu items={tvShowMenu} ulClass="" let:item>
            <div class="py-2">
                <a href={item.href} class="hover:text-primary-600 dark:hover:text-primary-500">{item.name}</a>
            </div>
        </MegaMenu>
    </NavUl>
</Navbar>
<slot></slot>
