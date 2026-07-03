<script lang="ts">
    import { ArtifactType } from "$lib/model/Artifact";
    import { UserArtifactStatus } from "$lib/model/UserArtifact";
    import { artifactItemStore, updateStatus, updateScore, updateDate, updateStartDate, updateEndDate } from "$lib/stores/ArtifactItemStore";
    import {
        Label,
        Input,
        Select,
        Badge,
        Datepicker,
    } from "flowbite-svelte";
    import {
        StarSolid,
        CalendarMonthSolid,
        CheckCircleSolid,
    } from "flowbite-svelte-icons";

    export let userConnected: boolean = false;

    $: artifactItemStoreInst = $artifactItemStore;
    $: artifact = artifactItemStoreInst.artifact;

    const USER_STATUSES = [
        { value: null, name: 'None' },
        { value: UserArtifactStatus.DROPPED, name: 'Dropped' },
        { value: UserArtifactStatus.FINISHED, name: 'Finished' },
        { value: UserArtifactStatus.ON_GOING, name: 'On going' },
        { value: UserArtifactStatus.ON_HOLD, name: 'On hold' },
        { value: UserArtifactStatus.WISHLIST, name: 'Wishlist' },
    ];

    let movieDate: Date | undefined = undefined;
    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;

    $: if (artifact.userInfo?.startDate && artifact.type === ArtifactType.MOVIE) {
        movieDate = artifact.userInfo.startDate;
    }

    $: if (artifact.userInfo?.startDate && artifact.type !== ArtifactType.MOVIE) {
        startDate = artifact.userInfo.startDate;
    }

    $: if (artifact.userInfo?.endDate && artifact.type !== ArtifactType.MOVIE) {
        endDate = artifact.userInfo.endDate;
    }

    $: if (movieDate && movieDate !== artifact.userInfo?.startDate) {
        updateDate(movieDate);
    }

    $: if (startDate && startDate !== artifact.userInfo?.startDate) {
        updateStartDate(startDate);
    }

    $: if (endDate && endDate !== artifact.userInfo?.endDate) {
        updateEndDate(endDate);
    }

    function handleSelectStatusChange(event: Event, artifactId: number) {
        const target = event.target as HTMLSelectElement;
        const status: UserArtifactStatus | null = target.value === '' ? null : target.value as UserArtifactStatus;
        updateStatus(artifactId, status);
    }

    function handleScoreChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.value === '') {
            updateScore(null);
            return;
        }
        let value = parseInt(target.value, 10);
        if (isNaN(value)) {
            target.value = '';
            updateScore(null);
            return;
        }
        value = Math.max(0, Math.min(100, value));
        target.value = value.toString();
        updateScore(value);
    }
</script>

{#if userConnected}
    <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <Label for="artifactStatus" class="mb-2 flex items-center">
            <StarSolid class="w-4 h-4 mr-1 text-yellow-400" />
            Status
        </Label>
        <Select
            id="artifactStatus"
            onchange={(event) => handleSelectStatusChange(event, artifact.id)}
            items={USER_STATUSES}
            value={artifact.userInfo?.status}
            placeholder="Select Status"
        />
    </div>
    <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <Label for="artifactScore" class="mb-2 flex items-center">
            <StarSolid class="w-4 h-4 mr-1 text-yellow-400" />
            Your Rating
        </Label>
        <Input
            id="artifactScore"
            onchange={handleScoreChange}
            type="number"
            data-input-counter-min="0"
            max="100"
            placeholder="Rate from 0-100"
            class="max-w-xs"
            value={artifact.userInfo?.score || undefined}
        />
    </div>
    <div class="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <Label class="mb-2 flex items-center">
            <CalendarMonthSolid class="w-4 h-4 mr-1 text-yellow-400" />
            Date
        </Label>
        {#if artifact.type === ArtifactType.MOVIE}
            <Datepicker
                onclear={() => updateDate(null)}
                bind:value={movieDate}
                dateFormat={{
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }}
                showActionButtons={true}
                autohide={true}
                placeholder="Pick a date" />
        {:else}
            <Datepicker
                onclear={() => updateStartDate(null)}
                bind:value={startDate}
                dateFormat={{
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }}
                showActionButtons={true}
                autohide={true}
                placeholder="Pick a start date" />
            <Datepicker
                onclear={() => updateEndDate(null)}
                bind:value={endDate}
                dateFormat={{
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }}
                showActionButtons={true}
                autohide={true}
                placeholder="Pick a end date" />
        {/if}
    </div>

    <!-- Subscription availability -->
    {#if artifact.userInfo?.availableSubscriptions && artifact.userInfo.availableSubscriptions.length > 0}
        <div class="mt-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div class="flex items-center mb-2">
                <CheckCircleSolid class="w-4 h-4 mr-1 text-green-500" />
                <span class="font-medium text-green-700 dark:text-green-400">Available on your subscriptions</span>
            </div>
            <div class="flex flex-wrap gap-2">
                {#each artifact.userInfo.availableSubscriptions as sub (sub.id)}
                    <Badge color="green">{sub.name}</Badge>
                {/each}
            </div>
        </div>
    {/if}
{/if}
