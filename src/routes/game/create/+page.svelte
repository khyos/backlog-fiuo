<script lang="ts">
    import { A, Alert, Button, Input, Label, Popover, Select, Spinner } from "flowbite-svelte";
    import { QuestionCircleOutline, SearchOutline } from "flowbite-svelte-icons";

    // Improved type definitions
    interface SiteConfig {
        id: string;
        name: string;
        url: string;
        helpText: string[];
    }

    interface GameResult {
        id: string;
        value: string;
        name: string;
        link?: string;
        url?: string;
    }

    interface SearchResults {
        [siteId: string]: GameResult[];
    }

    interface SelectedData {
        [siteId: string]: GameResult | null;
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

    // Define site configurations
    const sites: SiteConfig[] = [
        {
            id: "igdb",
            name: "IGDB",
            url: "https://www.igdb.com/",
            helpText: [
                "Search for the game you want to add",
                "Copy the ID from the Info on the right of the page"
            ]
        },
        {
            id: "hltb",
            name: "HowLongToBeat",
            url: "https://www.howlongtobeat.com/",
            helpText: [
                "Search for the game you want to add",
                "Copy the numeric ID from the URL of the page",
                "Example: https://www.howlongtobeat.com/game/<span style=\"color: red; font-weight: bold\">68151</span>"
            ]
        },
        {
            id: "sc",
            name: "SensCritique",
            url: "https://www.senscritique.com/",
            helpText: [
                "Search for the game you want to add",
                "Copy the text and numeric from the URL of the page",
                "Example: https://www.senscritique.com/jeuvideo/<span style=\"color: red; font-weight: bold\">ico/207869</span>/"
            ]
        },
        {
            id: "mc",
            name: "MetaCritic",
            url: "https://www.metacritic.com/",
            helpText: [
                "Search for the game you want to add",
                "Copy the text ID from the URL of the page",
                "Example: https://www.metacritic.com/game/<span style=\"color: red; font-weight: bold\">secret-of-mana</span>/"
            ]
        },
        {
            id: "oc",
            name: "OpenCritic",
            url: "https://www.opencritic.com/",
            helpText: [
                "Search for the game you want to add",
                "Copy the numeric ID from the URL of the page",
                "Example: https://opencritic.com/game/<span style=\"color: red; font-weight: bold\">12888</span>/tunic"
            ]
        },
        {
            id: "steam",
            name: "Steam",
            url: "https://store.steampowered.com/",
            helpText: [
                "Search for the game you want to add",
                "Copy the numeric ID from the URL of the page",
                "Example: https://store.steampowered.com/app/<span style=\"color: red; font-weight: bold\">70</span>/HalfLife"
            ]
        },
        {
            id: "itad",
            name: "ITAD",
            url: "https://isthereanydeal.com/",
            helpText: [
                "Search for the game you want to add",
                "Copy the numeric ID from the URL of the page",
                "Example: https://isthereanydeal.com/game/<span style=\"color: red; font-weight: bold\">avatar-frontiers-of-pandora</span>/info"
            ]
        }
    ];

    // Store selected IDs and site data
    let selectedIds: {[siteId: string]: string | null} = {};
    let selectedData: SelectedData = {};

    const findGameInfo = async (): Promise<void> => {
        if (!searchTerm.trim()) return;
        
        searchStatus = 'started';
        try {
            const response = await fetch(`/api/game/findGameInfo?query=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const results: SearchResults = await response.json();
            
            for (const key in results) {
                for (const result of results[key]) {
                    result.value = result.id;
                }
            }
            
            searchResults = results;
            
            // Initialize selections with first result for each site
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
        if (inputElement) {
            inputElement.value = selectedIds[siteId] || "";
        }
    };

    const updateAllInputs = (): void => {
        sites.forEach(site => updateSiteSelection(site.id));
    };

    let creationMessage: CreationMessage | null = null;

    const createGame = async (e: SubmitEvent): Promise<void> => {
        e.preventDefault();
        const createButton = document.getElementById("createButton");
        if (createButton) createButton.setAttribute("disabled", "");
        
        creationMessage = {
            message: "Creating game...",
            color: "blue"
        };

        // Collect all IDs from inputs
        const requestData: RequestData = {};
        sites.forEach(site => {
            const inputElement = document.getElementById(`${site.id}Id`) as HTMLInputElement | null;
            requestData[`${site.id}Id`] = inputElement?.value || "";
        });

        try {
            const response = await fetch("/api/game/create", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData),
            });
            
            const json = await response.json();
            
            if (!response.ok) {
                creationMessage = {
                    message: json.message || 'Failed to create game',
                    color: "red"
                };
                return;
            }
            
            creationMessage = {
                message: "Game created successfully! Redirecting...",
                color: "green"
            };
            
            setTimeout(() => {
                window.location.href = `/game/${json.id}`;
            }, 1000);
        } catch (error) {
            console.error('Error creating game:', error);
            creationMessage = {
                message: 'An unexpected error occurred',
                color: "red"
            };
        } finally {
            if (createButton) createButton.removeAttribute("disabled");
        }
    };

    // Handle keyboard submission with Enter key
    const handleKeyUp = (event: KeyboardEvent): void => {
        if (event.key === 'Enter' && searchTerm.trim()) {
            findGameInfo();
        }
    };
</script>

<div class="max-w-4xl mx-auto p-4">
    <h2 class="text-4xl font-extrabold dark:text-white mb-6">Create Game</h2>
    
    <!-- Search section -->
    <div class="mb-8">
        <div class="flex gap-2">
            <Input
                id="search-field"
                class="ps-9"
                placeholder="Search for a game" 
                autocomplete="off"
                bind:value={searchTerm}
                onkeyup={handleKeyUp}>
                {#snippet left()}
                    <SearchOutline />
                {/snippet}
                {#snippet right()}
                    <Button size="xs" onclick={findGameInfo}>Search</Button>
                {/snippet}
            </Input>
        </div>
        
        {#if searchStatus === 'started'}
            <div class="flex justify-center mt-4">
                <Spinner size="8" />
            </div>
        {/if}
    </div>
    
    <!-- Search results and form -->
    <form on:submit={createGame} class="space-y-6">
        <div class="grid md:grid-cols-2 gap-6">
            {#each sites as site}
                <div class="p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div class="flex flex-col space-y-3">
                        <div class="flex items-center gap-2">
                            <Label for="{site.id}Id" class="text-lg font-medium">{site.name}</Label>
                            <Button class="p-1" size="xs" id="{site.id}HelpId"><QuestionCircleOutline /></Button>
                            <Popover class="text-sm max-w-md" triggeredBy="#{site.id}HelpId">
                                <div class="p-2">
                                    <p>Go to <a href="{site.url}" class="text-blue-600 hover:underline" target="_blank">{site.name}</a></p>
                                    {#each site.helpText as line}
                                        <p class="mt-1">{@html line}</p>
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
                <Button id="createButton" type="submit" size="lg">Create Game</Button>
                {#if creationMessage}
                    <Alert class="w-full" color={creationMessage.color} dismissable>
                        {creationMessage.message}
                    </Alert>
                {/if}
            </div>
        </div>
    </form>
</div>