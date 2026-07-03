<script lang="ts">
    import type { ISubscriptionService } from "$lib/model/SubscriptionService";
    import { artifactItemStore, addArtifactSubscription, removeArtifactSubscription } from "$lib/stores/ArtifactItemStore";
    import {
        Button,
        Modal,
        Spinner,
        P,
    } from "flowbite-svelte";
    import {
        EditOutline,
        CheckCircleSolid,
    } from "flowbite-svelte-icons";

    export let canEdit: boolean = false;

    $: artifactItemStoreInst = $artifactItemStore;
    $: artifact = artifactItemStoreInst.artifact;

    let openManageSubscriptions = false;
    let allSubscriptionServices: ISubscriptionService[] = [];
    let artifactSubscriptionServices: ISubscriptionService[] = [];
    let loadingSubscriptions = false;

    async function openManageSubscriptionsModal() {
        openManageSubscriptions = true;
        loadingSubscriptions = true;
        try {
            const [allRes, artRes] = await Promise.all([
                fetch(`/api/subscription?artifactType=${artifact.type}`),
                fetch(`/api/artifact/${artifact.id}/subscription`)
            ]);
            if (!allRes.ok || !artRes.ok) {
                const failedRes = !allRes.ok ? allRes : artRes;
                const errorResponse = await failedRes.json();
                alert(`Error loading subscriptions: ` + errorResponse.message);
                return;
            }
            allSubscriptionServices = await allRes.json();
            artifactSubscriptionServices = await artRes.json();
        } catch (error) {
            console.error('Error loading subscriptions', error);
            alert('Error loading subscriptions');
        } finally {
            loadingSubscriptions = false;
        }
    }

    async function toggleArtifactSubscription(service: ISubscriptionService) {
        const isLinked = artifactSubscriptionServices.some(s => s.id === service.id);
        if (isLinked) {
            await removeArtifactSubscription(service.id);
            artifactSubscriptionServices = artifactSubscriptionServices.filter(s => s.id !== service.id);
        } else {
            await addArtifactSubscription(service.id);
            artifactSubscriptionServices = [...artifactSubscriptionServices, service];
        }
    }
</script>

{#if canEdit}
    <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
                <CheckCircleSolid class="w-4 h-4 mr-2 text-green-500" />
                <P weight="medium" class="text-lg">Subscriptions</P>
            </div>
            <Button size="xs" color="green" onclick={openManageSubscriptionsModal}>
                <EditOutline class="mr-1 w-3 h-3" /> Manage
            </Button>
        </div>
    </div>

    <Modal title="Manage subscription availability" bind:open={openManageSubscriptions} size="sm">
        {#if loadingSubscriptions}
            <div class="flex justify-center py-6"><Spinner /></div>
        {:else}
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Select which subscription services include this artifact.
            </p>
            <div class="flex flex-col gap-2">
                {#each allSubscriptionServices as service (service.id)}
                    {@const linked = artifactSubscriptionServices.some(s => s.id === service.id)}
                    <button
                        class="flex items-center justify-between p-2 rounded border text-left transition-colors
                               {linked ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                        onclick={() => toggleArtifactSubscription(service)}
                    >
                        <span class="text-sm font-medium">{service.name}</span>
                        {#if linked}
                            <CheckCircleSolid class="w-4 h-4 text-green-500 shrink-0" />
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
        {#snippet footer()}
            <Button color="alternative" onclick={() => (openManageSubscriptions = false)}>Close</Button>
        {/snippet}
    </Modal>
{/if}
