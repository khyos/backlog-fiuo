<script lang="ts">
    import { SvelteMap } from 'svelte/reactivity';
    import { Modal, Button, Checkbox, Dropdown, DropdownItem } from 'flowbite-svelte';
    import { ChevronDownOutline, ChevronRightOutline, DotsVerticalOutline } from 'flowbite-svelte-icons';
    import { artifactItemStore, updateChildDates, updateStatus, markFinishedUpTo } from '#lib/stores/ArtifactItemStore';
    import { ArtifactType, type Artifact } from '#lib/model/Artifact';
    import { ArtifactTypeUtil } from '#lib/model/ArtifactTypeUtil';
    import { UserArtifactStatus } from '#lib/model/UserArtifact';
    import { TimeUtil } from '#lib/util/TimeUtil';

    let { open = $bindable(), onClose, userConnected = false }: { open: boolean; onClose: () => void; userConnected?: boolean } = $props();

    let editingRowId = $state<number | null>(null);
    let draftStart = $state<string>('');
    let draftEnd = $state<string>('');
    let validationError = $state<string | null>(null);
    let expandedSeasons = $state<number[]>([]);

    const artifact = $derived($artifactItemStore.artifact);
    const artifactDepth = $derived(ArtifactTypeUtil.getChildrenDepth(artifact.type));

    function toInputValue(d: Date | null): string {
        if (!d) return '';
        return d.toISOString().split('T')[0];
    }

    function fromInputValue(s: string): Date | null {
        if (!s) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    function formatUserDate(d: Date | null | undefined): string {
        if (!d) return '—';
        return TimeUtil.formatDate(d);
    }

    function handleCheckboxStatusChange(event: Event, artifactArg: Artifact) {
        const target = event.target as HTMLInputElement;
        const status: UserArtifactStatus | null = target.checked ? UserArtifactStatus.FINISHED : null;
        updateStatus(artifactArg.id, status);
    }

    function startEdit(child: Artifact) {
        editingRowId = child.id;
        draftStart = toInputValue(child.userInfo?.startDate ?? null);
        draftEnd = toInputValue(child.userInfo?.endDate ?? null);
        validationError = null;
    }

    function startEditLeaf(child: Artifact) {
        editingRowId = child.id;
        draftStart = toInputValue(child.userInfo?.endDate ?? child.userInfo?.startDate ?? null);
        draftEnd = '';
        validationError = null;
    }

    function cancelEdit() {
        editingRowId = null;
        validationError = null;
    }

    async function saveRow(childId: number) {
        const s = fromInputValue(draftStart);
        const e = fromInputValue(draftEnd);
        if (s && e && e < s) {
            validationError = 'End date must not be before start date';
            return;
        }
        validationError = null;
        try {
            await updateChildDates(childId, s, e);
        } catch {
            // API failure: revert silently
        }
        editingRowId = null;
    }

    async function saveLeafRow(childId: number) {
        const d = fromInputValue(draftStart);
        validationError = null;
        try {
            await updateChildDates(childId, d, d);
        } catch {
            // API failure: revert silently
        }
        editingRowId = null;
    }

    function autoFillFromEpisodes(season: Artifact) {
        const finished = season.children.filter(
            (ep: Artifact) => ep.userInfo?.status === UserArtifactStatus.FINISHED
        );
        if (finished.length === 0) return;
        const first = finished[0];
        const last = finished[finished.length - 1];
        draftStart = toInputValue(first.userInfo?.startDate ?? first.userInfo?.endDate ?? null);
        draftEnd = toInputValue(last.userInfo?.endDate ?? null);
        validationError = null;
    }

    async function autoFillEpisodesFromSeasonDates(season: Artifact) {
        const start = fromInputValue(draftStart);
        const end = fromInputValue(draftEnd);
        if (!start || !end) return;

        const targets = season.children;
        if (targets.length === 0) return;

        const count = targets.length;
        const startMs = start.getTime();
        const endMs = end.getTime();

        for (let i = 0; i < count; i++) {
            const ep = targets[i];
            const dateMs = count === 1 ? endMs : startMs + (i / (count - 1)) * (endMs - startMs);
            try {
                await updateChildDates(ep.id, new Date(dateMs), new Date(dateMs));
            } catch {
                // silently skip on error
            }
        }
    }

    function toggleSeason(seasonId: number) {
        if (expandedSeasons.includes(seasonId)) {
            expandedSeasons = expandedSeasons.filter(id => id !== seasonId);
        } else {
            expandedSeasons = [...expandedSeasons, seasonId];
        }
    }

    let wasOpen = false;

    // The store can emit the same mutated Artifact reference, so refresh these maps on every store update.
    const finishedMap = new SvelteMap<number, boolean>();
    const datesMap = new SvelteMap<number, { startDate: Date | null; endDate: Date | null }>();

    $effect(() => {
        finishedMap.clear();
        datesMap.clear();
        function walk(a: Artifact) {
            finishedMap.set(a.id, a.userInfo?.status === UserArtifactStatus.FINISHED);
            datesMap.set(a.id, { startDate: a.userInfo?.startDate ?? null, endDate: a.userInfo?.endDate ?? null });
            a.children.forEach(walk);
        }
        walk($artifactItemStore.artifact);
    });

    $effect(() => {
        if (!open) editingRowId = null;
    });

    $effect(() => {
        if (open && !wasOpen && artifact.type === ArtifactType.TVSHOW) {
            expandedSeasons = artifact.children.map(s => s.id);
        }
        wasOpen = open;
    });
</script>

<Modal bind:open title="Detailed View" size="xl" class="overflow-y-auto">
    <div class="max-h-[70vh] overflow-y-auto">
        {#if artifactDepth === 2}
            <!-- TVSHOW: seasons as accordion rows + episodes in sub-table -->
            {#each artifact.children as season, seasonIndex (season.id)}
                <div class="mb-4 border rounded-lg border-gray-300">
                    <!-- Season toggle header -->
                    <div class="flex items-center">
                        <button
                            class="flex-1 flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
                            onclick={() => toggleSeason(season.id)}
                        >
                            <span class="font-medium">{season.title}</span>
                            {#if expandedSeasons.includes(season.id)}
                                <ChevronDownOutline class="w-5 h-5 text-gray-600" />
                            {:else}
                                <ChevronRightOutline class="w-5 h-5 text-gray-600" />
                            {/if}
                        </button>
                        {#if userConnected}
                            <Button size="xs" color="light" class="mx-2">
                                <DotsVerticalOutline class="w-4 h-4" />
                            </Button>
                            <Dropdown placement="bottom-end" class="list-none">
                                <DropdownItem onclick={() => markFinishedUpTo(season.id)}>Mark finished up to here</DropdownItem>
                            </Dropdown>
                        {/if}
                    </div>

                    <!-- Season dates row (edit mode) -->
                    {#if editingRowId === season.id}
                        <div class="p-3 bg-yellow-50 border-t border-gray-200">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-sm font-medium w-6">{seasonIndex + 1}</span>
                                <span class="text-sm flex-1">{season.title}</span>
                                {#if userConnected}
                                    <Checkbox
                                        checked={finishedMap.get(season.id) ?? false}
                                        onchange={(event) => handleCheckboxStatusChange(event, season)}
                                    />
                                {/if}
                                <label class="text-sm">
                                    Start:
                                    <input
                                        type="date"
                                        bind:value={draftStart}
                                        class="border rounded px-1 py-0.5 text-sm ml-1"
                                    />
                                </label>
                                <label class="text-sm">
                                    End:
                                    <input
                                        type="date"
                                        bind:value={draftEnd}
                                        class="border rounded px-1 py-0.5 text-sm ml-1"
                                    />
                                </label>
                                <Button size="xs" color="light" onclick={() => autoFillFromEpisodes(season)}>
                                    Auto-fill from episodes
                                </Button>
                                <Button size="xs" color="light" onclick={() => autoFillEpisodesFromSeasonDates(season)}>
                                    Auto-fill episodes from season
                                </Button>
                                <Button size="xs" color="green" onclick={() => saveRow(season.id)}>Save</Button>
                                <Button size="xs" color="light" onclick={cancelEdit}>Cancel</Button>
                            </div>
                            {#if validationError}
                                <p class="text-red-500 text-xs mt-1">{validationError}</p>
                            {/if}
                        </div>
                    {:else}
                        <!-- Season dates row (read-only) -->
                        <div class="p-3 border-t border-gray-200 bg-white">
                            <div class="flex items-center gap-4 text-sm">
                                <span class="w-6">{seasonIndex + 1}</span>
                                <span class="flex-1">{season.title}</span>
                                <span class="text-gray-600">Start: {formatUserDate(datesMap.get(season.id)?.startDate)}</span>
                                <span class="text-gray-600">End: {formatUserDate(datesMap.get(season.id)?.endDate)}</span>
                                {#if userConnected}
                                    <div class="flex items-center gap-1">
                                        <Checkbox
                                            checked={finishedMap.get(season.id) ?? false}
                                            onchange={(event) => handleCheckboxStatusChange(event, season)}
                                        />
                                        <Button size="xs" color="light" onclick={() => startEdit(season)}>Edit</Button>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    <!-- Episode sub-table -->
                    {#if expandedSeasons.includes(season.id) && season.children.length > 0}
                        <div class="p-3 bg-gray-50">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-100 border-b">
                                    <tr>
                                        <th class="p-2 text-left">#</th>
                                        <th class="p-2 text-left">Episode</th>
                                        <th class="p-2 text-left">Duration</th>
                                        <th class="p-2 text-left">Date</th>
                                        {#if userConnected}
                                            <th class="p-2 text-left">
                                                <Checkbox
                                                    checked={finishedMap.get(season.id) ?? false}
                                                    onchange={(event) => handleCheckboxStatusChange(event, season)}
                                                />
                                            </th>
                                        {/if}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each season.children as episode, epIndex (episode.id)}
                                        {#if editingRowId === episode.id}
                                            <tr class="border-b last:border-b-0 border-gray-300 bg-yellow-50">
                                                <td class="p-2">{epIndex + 1}</td>
                                                <td class="p-2">{episode.title}</td>
                                                <td class="p-2">
                                                    {#if episode.duration}
                                                        {TimeUtil.formatDuration(episode.duration)}
                                                    {:else}
                                                        <span class="text-gray-500 italic">N/A</span>
                                                    {/if}
                                                </td>
                                                <td class="p-2">
                                                    <input
                                                        type="date"
                                                        bind:value={draftStart}
                                                        class="border rounded px-1 py-0.5 text-sm"
                                                    />
                                                </td>
                                                {#if userConnected}
                                                    <td class="p-2">
                                                        <div class="flex gap-1 items-center">
                                                            <Checkbox
                                                                checked={finishedMap.get(episode.id) ?? false}
                                                                onchange={(event) => handleCheckboxStatusChange(event, episode)}
                                                            />
                                                            <Button size="xs" color="green" onclick={() => saveLeafRow(episode.id)}>Save</Button>
                                                            <Button size="xs" color="light" onclick={cancelEdit}>Cancel</Button>
                                                        </div>
                                                    </td>
                                                {:else}
                                                    <td class="p-2">
                                                        <div class="flex gap-1">
                                                            <Button size="xs" color="green" onclick={() => saveLeafRow(episode.id)}>Save</Button>
                                                            <Button size="xs" color="light" onclick={cancelEdit}>Cancel</Button>
                                                        </div>
                                                    </td>
                                                {/if}
                                            </tr>
                                        {:else}
                                            <tr class="border-b last:border-b-0 border-gray-300 hover:bg-gray-100">
                                                <td class="p-2">{epIndex + 1}</td>
                                                <td class="p-2">{episode.title}</td>
                                                <td class="p-2">
                                                    {#if episode.duration}
                                                        {TimeUtil.formatDuration(episode.duration)}
                                                    {:else}
                                                        <span class="text-gray-500 italic">N/A</span>
                                                    {/if}
                                                </td>
                                                <td class="p-2">{formatUserDate(datesMap.get(episode.id)?.endDate ?? datesMap.get(episode.id)?.startDate)}</td>
                                                {#if userConnected}
                                                    <td class="p-2">
                                                        <div class="flex items-center gap-1">
                                                            <Checkbox
                                                                checked={finishedMap.get(episode.id) ?? false}
                                                                onchange={(event) => handleCheckboxStatusChange(event, episode)}
                                                            />
                                                            <Button size="xs" color="light" onclick={() => startEditLeaf(episode)}>Edit</Button>
                                                            <Button size="xs" color="light">
                                                                <DotsVerticalOutline class="w-4 h-4" />
                                                            </Button>
                                                            <Dropdown placement="bottom-end" class="list-none">
                                                                <DropdownItem onclick={() => markFinishedUpTo(episode.id)}>Mark finished up to here</DropdownItem>
                                                            </Dropdown>
                                                        </div>
                                                    </td>
                                                {/if}
                                            </tr>
                                        {/if}
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                </div>
            {/each}

        {:else if artifactDepth === 1}
            {#if ArtifactTypeUtil.hasParallelChildren(artifact.type)}
                <!-- MANGA: volumes section + chapters section -->
                {#each ArtifactTypeUtil.getParallelChildSections(artifact.type) as section (section.type)}
                    {@const sectionChildren = artifact.children.filter((c: Artifact) => c.type === section.type)}
                    {#if sectionChildren.length > 0}
                        <div class="mb-6">
                            <h3 class="font-medium text-lg mb-2">{section.label}</h3>
                            <table class="w-full text-sm">
                                <thead class="bg-gray-100 border-b">
                                    <tr>
                                        <th class="p-2 text-left">#</th>
                                        <th class="p-2 text-left">Title</th>
                                        <th class="p-2 text-left">Duration</th>
                                        <th class="p-2 text-left">Date</th>
                                        {#if userConnected}
                                            <th class="p-2 text-left"></th>
                                        {/if}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each sectionChildren as child, index (child.id)}
                                        {#if editingRowId === child.id}
                                            <tr class="border-b last:border-b-0 border-gray-300 bg-yellow-50">
                                                <td class="p-2">{index + 1}</td>
                                                <td class="p-2">{child.title}</td>
                                                <td class="p-2">
                                                    {#if child.duration}
                                                        {TimeUtil.formatDuration(child.duration)}
                                                    {:else}
                                                        <span class="text-gray-500 italic">N/A</span>
                                                    {/if}
                                                </td>
                                                <td class="p-2">
                                                    <input
                                                        type="date"
                                                        bind:value={draftStart}
                                                        class="border rounded px-1 py-0.5 text-sm"
                                                    />
                                                </td>
                                                {#if userConnected}
                                                    <td class="p-2">
                                                        <div class="flex gap-1 items-center">
                                                            <Checkbox
                                                                checked={finishedMap.get(child.id) ?? false}
                                                                onchange={(event) => handleCheckboxStatusChange(event, child)}
                                                            />
                                                            <Button size="xs" color="green" onclick={() => saveLeafRow(child.id)}>Save</Button>
                                                            <Button size="xs" color="light" onclick={cancelEdit}>Cancel</Button>
                                                        </div>
                                                    </td>
                                                {:else}
                                                    <td class="p-2">
                                                        <div class="flex gap-1">
                                                            <Button size="xs" color="green" onclick={() => saveLeafRow(child.id)}>Save</Button>
                                                            <Button size="xs" color="light" onclick={cancelEdit}>Cancel</Button>
                                                        </div>
                                                    </td>
                                                {/if}
                                            </tr>
                                        {:else}
                                            <tr class="border-b last:border-b-0 border-gray-300 hover:bg-gray-100">
                                                <td class="p-2">{index + 1}</td>
                                                <td class="p-2">{child.title}</td>
                                                <td class="p-2">
                                                    {#if child.duration}
                                                        {TimeUtil.formatDuration(child.duration)}
                                                    {:else}
                                                        <span class="text-gray-500 italic">N/A</span>
                                                    {/if}
                                                </td>
                                                <td class="p-2">{formatUserDate(datesMap.get(child.id)?.endDate ?? datesMap.get(child.id)?.startDate)}</td>
                                                {#if userConnected}
                                                    <td class="p-2">
                                                        <div class="flex items-center gap-1">
                                                            <Checkbox
                                                                checked={finishedMap.get(child.id) ?? false}
                                                                onchange={(event) => handleCheckboxStatusChange(event, child)}
                                                            />
                                                            <Button size="xs" color="light" onclick={() => startEditLeaf(child)}>Edit</Button>
                                                            <Button size="xs" color="light">
                                                                <DotsVerticalOutline class="w-4 h-4" />
                                                            </Button>
                                                            <Dropdown placement="bottom-end" class="list-none">
                                                                <DropdownItem onclick={() => markFinishedUpTo(child.id)}>Mark finished up to here</DropdownItem>
                                                            </Dropdown>
                                                        </div>
                                                    </td>
                                                {/if}
                                            </tr>
                                        {/if}
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                {/each}
            {:else}
                <!-- ANIME: flat table of episodes -->
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 border-b">
                        <tr>
                            <th class="p-2 text-left">#</th>
                            <th class="p-2 text-left">Episode</th>
                            <th class="p-2 text-left">Duration</th>
                            <th class="p-2 text-left">Date</th>
                            {#if userConnected}
                                <th class="p-2 text-left"></th>
                            {/if}
                        </tr>
                    </thead>
                    <tbody>
                        {#each artifact.children as child, index (child.id)}
                            {#if editingRowId === child.id}
                                <tr class="border-b last:border-b-0 border-gray-300 bg-yellow-50">
                                    <td class="p-2">{index + 1}</td>
                                    <td class="p-2">{child.title}</td>
                                    <td class="p-2">
                                        {#if child.duration}
                                            {TimeUtil.formatDuration(child.duration)}
                                        {:else}
                                            <span class="text-gray-500 italic">N/A</span>
                                        {/if}
                                    </td>
                                    <td class="p-2">
                                        <input
                                            type="date"
                                            bind:value={draftStart}
                                            class="border rounded px-1 py-0.5 text-sm"
                                        />
                                    </td>
                                    {#if userConnected}
                                        <td class="p-2">
                                            <div class="flex gap-1 items-center">
                                                <Checkbox
                                                    checked={finishedMap.get(child.id) ?? false}
                                                    onchange={(event) => handleCheckboxStatusChange(event, child)}
                                                />
                                                <Button size="xs" color="green" onclick={() => saveLeafRow(child.id)}>Save</Button>
                                                <Button size="xs" color="light" onclick={cancelEdit}>Cancel</Button>
                                            </div>
                                        </td>
                                    {:else}
                                        <td class="p-2">
                                            <div class="flex gap-1">
                                                <Button size="xs" color="green" onclick={() => saveLeafRow(child.id)}>Save</Button>
                                                <Button size="xs" color="light" onclick={cancelEdit}>Cancel</Button>
                                            </div>
                                        </td>
                                    {/if}
                                </tr>
                            {:else}
                                <tr class="border-b last:border-b-0 border-gray-300 hover:bg-gray-100">
                                    <td class="p-2">{index + 1}</td>
                                    <td class="p-2">{child.title}</td>
                                    <td class="p-2">
                                        {#if child.duration}
                                            {TimeUtil.formatDuration(child.duration)}
                                        {:else}
                                            <span class="text-gray-500 italic">N/A</span>
                                        {/if}
                                    </td>
                                    <td class="p-2">{formatUserDate(datesMap.get(child.id)?.endDate ?? datesMap.get(child.id)?.startDate)}</td>
                                    {#if userConnected}
                                        <td class="p-2">
                                            <div class="flex items-center gap-1">
                                                <Checkbox
                                                    checked={finishedMap.get(child.id) ?? false}
                                                    onchange={(event) => handleCheckboxStatusChange(event, child)}
                                                />
                                                <Button size="xs" color="light" onclick={() => startEditLeaf(child)}>Edit</Button>
                                                <Button size="xs" color="light" class="!p-1">
                                                    <DotsVerticalOutline class="w-3 h-3" />
                                                </Button>
                                                <Dropdown placement="bottom-end" class="list-none">
                                                    <DropdownItem onclick={() => markFinishedUpTo(child.id)}>Mark finished up to here</DropdownItem>
                                                </Dropdown>
                                            </div>
                                        </td>
                                    {/if}
                                </tr>
                            {/if}
                        {/each}
                    </tbody>
                </table>
            {/if}
        {/if}
    </div>
    {#snippet footer()}
        <Button color="light" onclick={onClose}>Close</Button>
    {/snippet}
</Modal>
