<script lang="ts">
    import { ArtifactTypeUtil } from "$lib/model/ArtifactTypeUtil";
    import { UserArtifactStatus } from "$lib/model/UserArtifact";
    import type { Artifact } from "$lib/model/Artifact";
    import { artifactItemStore, updateStatus, markFinishedUpTo } from "$lib/stores/ArtifactItemStore";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import {
        Button,
        Checkbox,
        Dropdown,
        DropdownItem,
        P,
    } from "flowbite-svelte";
    import {
        ChevronDownOutline,
        ChevronRightOutline,
        ChevronDoubleRightOutline,
        DotsVerticalOutline,
    } from "flowbite-svelte-icons";
    import { SvelteSet } from "svelte/reactivity";

    export let userConnected: boolean = false;

    $: artifactItemStoreInst = $artifactItemStore;
    $: artifact = artifactItemStoreInst.artifact;
    $: artifactDepth = ArtifactTypeUtil.getChildrenDepth(artifact.type);

    let expandedChildren = new SvelteSet<number>();

    function toggleChild(childId: number) {
        if (expandedChildren.has(childId)) {
            expandedChildren.delete(childId);
        } else {
            expandedChildren.add(childId);
        }
    }

    function handleCheckboxStatusChange(event: Event, artifactArg: Artifact) {
        const target = event.target as HTMLInputElement;
        const status: UserArtifactStatus | null = target.checked ? UserArtifactStatus.FINISHED : null;
        updateStatus(artifactArg.id, status);
    }
</script>

{#if artifactDepth === 2 && artifact.children.length > 0}
    <div class="children-container">
        <div class="flex items-center mb-2">
            <ChevronDoubleRightOutline class="w-4 h-4 mr-2 text-purple-500" />
            <P weight="medium" class="text-lg">{ArtifactTypeUtil.getChildName(artifact.type, 0)}</P>
        </div>

        {#each artifact.children as firstLevelChild (firstLevelChild.id)}
            <div class="child-item mb-4 border rounded-lg border-gray-300">
                <div class="flex items-center">
                    <button
                        class="flex-1 flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
                        onclick={() => toggleChild(firstLevelChild.id)}
                    >
                        <span class="font-medium">{firstLevelChild.title}</span>
                        {#if expandedChildren.has(firstLevelChild.id)}
                            <ChevronDownOutline class="w-5 h-5 text-gray-600" />
                        {:else}
                            <ChevronRightOutline class="w-5 h-5 text-gray-600" />
                        {/if}
                    </button>
                    {#if userConnected}
                        <Button size="xs" color="light" class="!p-1.5 mx-2">
                            <DotsVerticalOutline class="w-4 h-4" />
                        </Button>
                        <Dropdown placement="bottom-end">
                            <DropdownItem onclick={() => markFinishedUpTo(firstLevelChild.id)}>Mark finished up to here</DropdownItem>
                        </Dropdown>
                    {/if}
                </div>

                {#if expandedChildren.has(firstLevelChild.id)}
                    <div class="secondLevelChildren-list p-3 bg-gray-50">
                        {#if firstLevelChild.children.length > 0}
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 border-b">
                                <tr>
                                    <th class="p-2 text-left">Index</th>
                                    <th class="p-2 text-left">{ArtifactTypeUtil.getChildName(artifact.type, 1)}</th>
                                    <th class="p-2 text-left">Duration</th>
                                    {#if userConnected}
                                    <th class="p-2 text-left">
                                        <Checkbox
                                            checked={firstLevelChild.userInfo?.status === UserArtifactStatus.FINISHED}
                                            onchange={(event) => handleCheckboxStatusChange(event, firstLevelChild)}
                                        />
                                    </th>
                                    {/if}
                                </tr>
                            </thead>
                            <tbody>
                                {#each firstLevelChild.children as secondLevelChild, index (secondLevelChild.id)}
                                    <tr class="border-b last:border-b-0 border-gray-300 hover:bg-gray-100">
                                        <td class="p-2">{index + 1}</td>
                                        <td class="p-2">{secondLevelChild.title}</td>
                                        <td class="p-2">
                                            {#if secondLevelChild.duration}
                                                {TimeUtil.formatDuration(secondLevelChild.duration)}
                                            {:else}
                                                <span class="text-gray-500 italic">N/A</span>
                                            {/if}
                                        </td>
                                        {#if userConnected}
                                        <td class="p-2">
                                            <div class="flex items-center gap-1">
                                                <Checkbox
                                                    checked={secondLevelChild.userInfo?.status === UserArtifactStatus.FINISHED}
                                                    onchange={(event) => handleCheckboxStatusChange(event, secondLevelChild)}
                                                />
                                                <Button size="xs" color="light" class="!p-1">
                                                    <DotsVerticalOutline class="w-3 h-3" />
                                                </Button>
                                                <Dropdown placement="bottom-end">
                                                    <DropdownItem onclick={() => markFinishedUpTo(secondLevelChild.id)}>Mark finished up to here</DropdownItem>
                                                </Dropdown>
                                            </div>
                                        </td>
                                        {/if}
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                        {:else}
                            <p class="text-gray-500 italic">No {ArtifactTypeUtil.getChildName(artifact.type, 1)}</p>
                        {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{:else if artifactDepth === 1 && artifact.children.length > 0}
    <div class="children-container">
        <div class="flex items-center mb-2">
            <ChevronDoubleRightOutline class="w-4 h-4 mr-2 text-purple-500" />
            <P weight="medium" class="text-lg">{ArtifactTypeUtil.getChildName(artifact.type, 0)}</P>
        </div>

        <div class="secondLevelChildren-list p-3 bg-gray-50">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b">
                    <tr>
                        <th class="p-2 text-left">Index</th>
                        <th class="p-2 text-left">{ArtifactTypeUtil.getChildName(artifact.type, 0)}</th>
                        <th class="p-2 text-left">Duration</th>
                        {#if userConnected}
                        <th class="p-2 text-left">
                            <Checkbox
                                checked={artifact.userInfo?.status === UserArtifactStatus.FINISHED}
                                onchange={(event) => handleCheckboxStatusChange(event, artifact)}
                            />
                        </th>
                        {/if}
                    </tr>
                </thead>
                <tbody>
                    {#each artifact.children as secondLevelChild, index (secondLevelChild.id)}
                        <tr class="border-b last:border-b-0 border-gray-300 hover:bg-gray-100">
                            <td class="p-2">{index + 1}</td>
                            <td class="p-2">{secondLevelChild.title}</td>
                            <td class="p-2">
                                {#if secondLevelChild.duration}
                                    {TimeUtil.formatDuration(secondLevelChild.duration)}
                                {:else}
                                    <span class="text-gray-500 italic">N/A</span>
                                {/if}
                            </td>
                            {#if userConnected}
                            <td class="p-2">
                                <div class="flex items-center gap-1">
                                    <Checkbox
                                        checked={secondLevelChild.userInfo?.status === UserArtifactStatus.FINISHED}
                                        onchange={(event) => handleCheckboxStatusChange(event, secondLevelChild)}
                                    />
                                    <Button size="xs" color="light" class="!p-1">
                                        <DotsVerticalOutline class="w-3 h-3" />
                                    </Button>
                                    <Dropdown placement="bottom-end">
                                        <DropdownItem onclick={() => markFinishedUpTo(secondLevelChild.id)}>Mark finished up to here</DropdownItem>
                                    </Dropdown>
                                </div>
                            </td>
                            {/if}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
{/if}
