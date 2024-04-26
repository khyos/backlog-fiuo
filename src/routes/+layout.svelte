<script lang="ts">
    import {
        Avatar,
        Dropdown,
        DropdownHeader,
        DropdownItem,
        NavBrand,
        NavHamburger,
        NavLi,
        NavUl,
        Navbar,
    } from "flowbite-svelte";
    import "../app.pcss";
    import type { LayoutData } from "./$types";

    export let data: LayoutData;
</script>

<Navbar class="px-0">
    <NavBrand href="/">
        <span class="whitespace-nowrap text-xl font-semibold dark:text-white"
            >Backlog</span
        >
    </NavBrand>
    <div class="flex items-center md:order-2">
        <Avatar id="avatar-menu" />
        <NavHamburger class1="w-full md:flex md:w-auto md:order-1" />
    </div>
    <Dropdown placement="bottom" triggeredBy="#avatar-menu">
        {#if data.user}
            <DropdownHeader>
                <span class="block text-sm">khyos</span>
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
    </NavUl>
</Navbar>
<slot></slot>
