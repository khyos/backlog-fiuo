<script lang="ts">
    import { Heading, P } from "flowbite-svelte";
    import { CheckCircleSolid, CreditCardSolid } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";
    import type { ISubscriptionService } from "$lib/model/SubscriptionService";
    import { SvelteSet } from "svelte/reactivity";

    export let data: PageData;

    let subscribedIds = new SvelteSet<number>(data.userSubscriptionIds);

    async function toggle(service: ISubscriptionService) {
        const isSubscribed = subscribedIds.has(service.id);
        const method = isSubscribed ? 'DELETE' : 'POST';

        await fetch('/api/user/subscription', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceId: service.id })
        });

        if (isSubscribed) {
            subscribedIds.delete(service.id);
        } else {
            subscribedIds.add(service.id);
        }
        subscribedIds = subscribedIds;
    }

    // Group services by artifactType (null = "All")
    const groups: { label: string; services: ISubscriptionService[] }[] = [
        { label: 'Streaming (All)', services: data.allServices.filter(s => s.artifactType === null) },
        { label: 'Games', services: data.allServices.filter(s => s.artifactType === 'game') },
        { label: 'Anime', services: data.allServices.filter(s => s.artifactType === 'anime') },
    ].filter(g => g.services.length > 0);
</script>

<div class="max-w-2xl mx-auto space-y-8 p-4">
    <Heading tag="h1">Profile</Heading>

    <section>
        <div class="flex items-center gap-2 mb-1">
            <CreditCardSolid class="w-5 h-5 text-blue-500" />
            <Heading tag="h2" class="text-lg font-semibold">My Subscriptions</Heading>
        </div>
        <P class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Select the streaming and gaming services you are subscribed to. This is used to highlight
            which items in your backlogs are already available to you.
        </P>

        {#each groups as group (group.label)}
            <div class="mb-6">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    {group.label}
                </p>
                <div class="flex flex-wrap gap-3">
                    {#each group.services as service (service.id)}
                        <button
                            class="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors
                                {subscribedIds.has(service.id)
                                    ? 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300'
                                    : 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 hover:border-gray-400'}"
                            onclick={() => toggle(service)}
                        >
                            {#if subscribedIds.has(service.id)}
                                <CheckCircleSolid class="w-4 h-4 text-green-500" />
                            {/if}
                            {service.name}
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    </section>
</div>
