<script lang="ts">
    import { onMount } from 'svelte';
    import { A, Alert, Button, Input, Label, Popover, Select, Spinner } from "flowbite-svelte";
    import { QuestionCircleOutline, SearchOutline } from "flowbite-svelte-icons";

    interface SiteConfig {
        id: string;
        name: string;
        url: string;
        helpText: string[];
    }

    interface MangaResult {
        id: string;
        value: string;
        name: string;
        date?: string;
        link?: string;
        url?: string;
    }

    interface SearchResults {
        [siteId: string]: MangaResult[];
    }

    interface SelectedData {
        [siteId: string]: MangaResult | null;
    }

    interface CreationMessage {
        message: string;
        color: "blue" | "red" | "green";
    }

    interface RequestData {
        [key: string]: string;
    }

    let searchTerm: string = '';
    let searchStatus: 'no' | 'started' | 'finished' = 'no';
    let searchResults: SearchResults | null = null;

    const sites: SiteConfig[] = [
        {
            id: "mal",
            name: "MyAnimeList",
            url: "https://myanimelist.net/",
            helpText: [
                "Search for the manga you want to add",
                "Copy the numeric ID from the URL of the page",
                "Example: https://myanimelist.net/manga/<span style=\"color: red; font-weight: bold\">1</span>/Monster"
            ]
        },
        {
            id: "sc",
            name: "SensCritique",
            url: "https://www.senscritique.com/",
            helpText: [
                "Search for the manga you want to add",
                "Copy the text and numeric from the URL of the page",
                "Example: https://www.senscritique.com/bd/<span style=\"color: red; font-weight: bold\">monster/12345</span>/"
            ]
        },
        {
            id: "mb",
            name: "MangaBaka",
            url: "https://mangabaka.org/",
            helpText: [
                "Search for a manga above or open its MangaBaka series page",
                "Enter the series ID or its full page URL",
                "Example: https://mangabaka.org/manga/<span style=\"color:red;font-weight:bold\">1692</span>/BERSERK"
            ]
        }
    ];

    let selectedIds: {[siteId: string]: string | null} = {};
    let selectedData: SelectedData = {};

    const findMangaInfo = async (): Promise<void> => {
        if (!searchTerm.trim()) return;

        searchStatus = 'started';
        try {
            const response = await fetch(`/api/manga/external?query=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error('Search failed');

            const results: SearchResults = await response.json();

            for (const key in results) {
                for (const result of results[key]) {
                    result.value = result.id;
                    if (result.date) {
                        result.name = `${result.name} (${new Date(result.date).getFullYear()})`;
                    }
                }
            }

            searchResults = results;

            sites.forEach(site => {
                const siteId = site.id;
                if (searchResults?.[siteId]?.length) {
                    selectedIds[siteId] = searchResults[siteId][0].id;
                    selectedData[siteId] = searchResults[siteId][0];
                } else {
                    selectedIds[siteId] = null;
                    selectedData[siteId] = null;
                }
            });

            updateAllInputs();
            searchStatus = 'finished';
        } catch (error) {
            console.error('Error during search:', error);
            searchStatus = 'finished';
        }
    };

    const updateSiteSelection = (siteId: string): void => {
        if (!searchResults || !searchResults[siteId]) return;
        selectedData[siteId] = searchResults[siteId].find(r => r.id === selectedIds[siteId]) || null;
        const inputElement = document.getElementById(`${siteId}Id`) as HTMLInputElement | null;
        if (inputElement) inputElement.value = selectedIds[siteId] || "";
    };

    const updateAllInputs = (): void => {
        sites.forEach(site => updateSiteSelection(site.id));
    };

    let creationMessage: CreationMessage | null = null;

    const createManga = async (e: SubmitEvent): Promise<void> => {
        e.preventDefault();
        const createButton = document.getElementById("createButton");
        if (createButton) createButton.setAttribute("disabled", "");

        creationMessage = { message: "Creating manga...", color: "blue" };

        const requestData: RequestData = {};
        sites.forEach(site => {
            const inputElement = document.getElementById(`${site.id}Id`) as HTMLInputElement | null;
            requestData[`${site.id}Id`] = inputElement?.value || "";
        });

        try {
            const response = await fetch("/api/manga", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });

            const json = await response.json();

            if (!response.ok) {
                creationMessage = { message: json.message || 'Failed to create manga', color: "red" };
                return;
            }

            creationMessage = { message: "Manga created successfully! Redirecting...", color: "green" };
            setTimeout(() => { window.location.href = `/manga/${json.id}`; }, 1000);
        } catch (error) {
            console.error('Error creating manga:', error);
            creationMessage = { message: 'An unexpected error occurred', color: "red" };
        } finally {
            if (createButton) createButton.removeAttribute("disabled");
        }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
        if (event.key === 'Enter' && searchTerm.trim()) findMangaInfo();
    };

    onMount(() => {
        const params = new URLSearchParams(window.location.search);
        const preScId = params.get('scId');
        const preMalId = params.get('malId');
        const preTitle = params.get('title');
        if (preScId) {
            const input = document.getElementById('scId') as HTMLInputElement | null;
            if (input) input.value = preScId;
        }
        if (preMalId) {
            const input = document.getElementById('malId') as HTMLInputElement | null;
            if (input) input.value = preMalId;
        }
        if (preTitle) searchTerm = preTitle;
    });
</script>

<div class="max-w-4xl mx-auto p-4">
    <h2 class="text-4xl font-extrabold dark:text-white mb-6">Create Manga</h2>

    <div class="mb-8">
        <div class="flex gap-2">
            <Input
                id="search-field"
                class="ps-9"
                placeholder="Search for a manga"
                autocomplete="off"
                bind:value={searchTerm}
                onkeyup={handleKeyUp}>
                {#snippet left()}
                    <SearchOutline />
                {/snippet}
                {#snippet right()}
                    <Button size="xs" onclick={findMangaInfo}>Search</Button>
                {/snippet}
            </Input>
        </div>

        {#if searchStatus === 'started'}
            <div class="flex justify-center mt-4">
                <Spinner size="8" />
            </div>
        {/if}
    </div>

    <form on:submit={createManga} class="space-y-6">
        <div class="grid md:grid-cols-2 gap-6">
            {#each sites as site (site.id)}
                <div class="p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div class="flex flex-col space-y-3">
                        <div class="flex items-center gap-2">
                            <Label for="{site.id}Id" class="text-lg font-medium">{site.name}</Label>
                            <Button class="p-1" size="xs" id="{site.id}HelpId"><QuestionCircleOutline /></Button>
                            <Popover class="text-sm max-w-md" triggeredBy="#{site.id}HelpId">
                                <div class="p-2">
                                    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                    <p>Go to <a href="{site.url}" class="text-blue-600 hover:underline" rel="noopener noreferrer" target="_blank">{site.name}</a></p>
                                    {#each site.helpText as line (line)}
                                        <p class="mt-1">{line}</p>
                                    {/each}
                                </div>
                            </Popover>
                        </div>

                        {#if searchStatus === 'finished' && searchResults && searchResults[site.id]?.length}
                            <div class="space-y-2">
                                <Select
                                    items={searchResults[site.id]}
                                    bind:value={selectedIds[site.id]}
                                    onchange={() => updateSiteSelection(site.id)}
                                    class="w-full" />

                                {#if selectedData[site.id]}
                                    <div class="flex flex-col text-sm">
                                        {#if selectedData[site.id]?.link}
                                            <A href={selectedData[site.id]?.link} target="_blank" class="truncate text-blue-600">
                                                {selectedData[site.id]?.link}
                                            </A>
                                        {/if}
                                        {#if selectedData[site.id]?.url}
                                            <A href={selectedData[site.id]?.url} target="_blank" class="truncate text-blue-600">
                                                {selectedData[site.id]?.url}
                                            </A>
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        {:else if searchStatus === 'finished' && searchResults}
                            <p class="text-sm text-gray-500 dark:text-gray-400">No results found for {site.name}</p>
                        {/if}

                        <div>
                            <Label for="{site.id}Id" class="block mb-1 text-sm font-medium">ID:</Label>
                            <Input type="text" id="{site.id}Id" name="{site.id}Id" />
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <div class="pt-4">
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <Button id="createButton" type="submit" size="lg">Create Manga</Button>
                {#if creationMessage}
                    <Alert class="w-full" color={creationMessage.color} dismissable>
                        {creationMessage.message}
                    </Alert>
                {/if}
            </div>
        </div>
    </form>
</div>
