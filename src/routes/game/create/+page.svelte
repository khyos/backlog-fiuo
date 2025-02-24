<script lang="ts">
    import { A, Alert, Button, Input, Label, Popover, Search, Select, Spinner } from "flowbite-svelte";
    import { QuestionCircleOutline } from "flowbite-svelte-icons";

    let searchTerm: string = '';
    let searchStatus = 'no';
    let searchResults = null;

    const findGameInfo = () => {
        searchStatus = 'started';
        fetch(`/api/game/findGameInfo?query=${searchTerm}`)
            .then(res => res.json())
            .then(results => {
                searchStatus = 'finished';
                for (const key in results) {
                    for (const result of results[key]) {
                        result.value = result.id;
                    }
                }
                searchResults = results;
                if (searchResults.igdb[0])
                    searchIGDBSelected = searchResults.igdb[0].id;
                if (searchResults.hltb[0])
                    searchHLTBSelected = searchResults.hltb[0].id;
                if (searchResults.sc[0])
                    searchSCSelected = searchResults.sc[0].id;
                if (searchResults.mc[0])
                    searchMCSelected = searchResults.mc[0].id;
                if (searchResults.oc[0])
                    searchOCSelected = searchResults.oc[0].id;
                if (searchResults.steam[0])
                    searchSteamSelected = searchResults.steam[0].id;
                if (searchResults.itad[0])
                    searchITADSelected = searchResults.itad[0].id;
                updateLinkAndId();
            });
    }

    let searchIGDBSelected = null;
    let igdbSelected;
    let searchHLTBSelected = null;
    let hltbSelected;
    let searchSCSelected = null;
    let scSelected;
    let searchMCSelected = null;
    let mcSelected;
    let searchOCSelected = null;
    let ocSelected;
    let searchSteamSelected = null;
    let steamSelected;
    let searchITADSelected = null;
    let itadSelected;
    const updateLinkAndId = () => {
        igdbSelected = searchResults.igdb.find(r => r.id == searchIGDBSelected);
        (document.getElementById("igdbId") as HTMLInputElement).value = searchIGDBSelected;

        hltbSelected = searchResults.hltb.find(r => r.id == searchHLTBSelected);
        (document.getElementById("hltbId") as HTMLInputElement).value = searchHLTBSelected;

        scSelected = searchResults.sc.find(r => r.id == searchSCSelected);
        (document.getElementById("scId") as HTMLInputElement).value = searchSCSelected;

        mcSelected = searchResults.mc.find(r => r.id == searchMCSelected);
        (document.getElementById("mcId") as HTMLInputElement).value = searchMCSelected;

        ocSelected = searchResults.oc.find(r => r.id == searchOCSelected);
        (document.getElementById("ocId") as HTMLInputElement).value = searchOCSelected;

        steamSelected = searchResults.steam.find(r => r.id == searchSteamSelected);
        (document.getElementById("steamId") as HTMLInputElement).value = searchSteamSelected;

        itadSelected = searchResults.itad.find(r => r.id == searchITADSelected);
        (document.getElementById("itadId") as HTMLInputElement).value = searchITADSelected;
    }

    let creationMessage: any = null;

    const createGame = (e: any) => {
        e.preventDefault();
        document.getElementById("createButton")?.setAttribute("disabled", "");
        creationMessage = {
            message: "Creating game...",
            color: "blue"
        };
        const igdbId = (document.getElementById("igdbId") as HTMLInputElement)
            ?.value;
        const hltbId = (document.getElementById("hltbId") as HTMLInputElement)
            ?.value;
        const scId = (document.getElementById("scId") as HTMLInputElement)?.value;
        const mcId = (document.getElementById("mcId") as HTMLInputElement)?.value;
        const ocId = (document.getElementById("ocId") as HTMLInputElement)?.value;
        const steamId = (document.getElementById("steamId") as HTMLInputElement)?.value;
        const itadId = (document.getElementById("itadId") as HTMLInputElement)?.value;

        fetch("/api/game/create", {
            method: "POST",
            body: JSON.stringify({
                igdbId,
                hltbId,
                scId,
                mcId,
                ocId,
                steamId,
                itadId
            }),
        }).then(async (response) => {
            document.getElementById("createButton")?.removeAttribute("disabled");
            const json = await response.json();
            if (response.status !== 200) {
                creationMessage = {
                    message: json.message,
                    color: "red"
                };;
                return;
            }
            window.location.href = `/game/${json.id}`;
        });
    };
</script>

<h2 class="text-4xl font-extrabold dark:text-white mb-6">Create Game</h2>
<Search type="text"
    id="search-field"
    class="mb-6"
    placeholder="Search" 
    autocomplete="off"
    bind:value={searchTerm}
    on:change={findGameInfo} />
{#if searchStatus === 'started'}
    <div class="text-center">
        <Spinner class="mb-6" />
    </div>
{/if}
<form on:submit={createGame}>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="igdbId" style="white-space: nowrap;">IGDB ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="igdbHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#igdbHelpId">
                <p>Go to <a href="https://www.igdb.com/" style="text-decoration: underline" target="_blank">IGDB</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the ID from the Info on the right of the page</p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.igdb} bind:value={searchIGDBSelected} on:change={updateLinkAndId}></Select>
                {#if igdbSelected != null}
                    <A bind:href={igdbSelected.url} target="_blank" class="m-1" style="white-space: nowrap;">{igdbSelected.url}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="igdbId" name="igdbId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="hltbId" style="white-space: nowrap;">HowLongToBeat ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="hltbHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#hltbHelpId">
                <p>Go to <a href="https://www.howlongtobeat.com/" style="text-decoration: underline" target="_blank">HowLongToBeat</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://www.howlongtobeat.com/game/<span style="color: red; font-weight: bold">68151</span></p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.hltb} bind:value={searchHLTBSelected} on:change={updateLinkAndId}></Select>
                {#if hltbSelected != null}
                    <A bind:href={hltbSelected.link} target="_blank" class="m-1" style="white-space: nowrap;">{hltbSelected.link}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="hltbId" name="hltbId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="scId" style="white-space: nowrap;">SensCritique ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="scHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#scHelpId">
                <p>Go to <a href="https://www.senscritique.com/" style="text-decoration: underline" target="_blank">SensCritique</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the text and numeric from the URL of the page</p>
                <p>Example: https://www.senscritique.com/jeuvideo/<span style="color: red; font-weight: bold">ico/207869</span>/</p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.sc} bind:value={searchSCSelected} on:change={updateLinkAndId}></Select>
                {#if scSelected != null}
                    <A bind:href={scSelected.link} target="_blank" class="m-1" style="white-space: nowrap;">{scSelected.link}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="scId" name="scId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="mcId" style="white-space: nowrap;">MetaCritic ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="mcHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#mcHelpId">
                <p>Go to <a href="https://www.metacritic.com/" style="text-decoration: underline" target="_blank">MetaCritic</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the text ID from the URL of the page</p>
                <p>Example: https://www.metacritic.com/game/<span style="color: red; font-weight: bold">secret-of-mana</span>/</p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.mc} bind:value={searchMCSelected} on:change={updateLinkAndId}></Select>
                {#if mcSelected != null}
                    <A bind:href={mcSelected.link} target="_blank" class="m-1" style="white-space: nowrap;">{mcSelected.link}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="mcId" name="mcId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="ocId" style="white-space: nowrap;">OpenCritic ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="ocHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#ocHelpId">
                <p>Go to <a href="https://www.opencritic.com/" style="text-decoration: underline" target="_blank">OpenCritic</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://opencritic.com/game/<span style="color: red; font-weight: bold">12888</span>/tunic</p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.oc} bind:value={searchOCSelected} on:change={updateLinkAndId}></Select>
                {#if ocSelected != null}
                    <A bind:href={ocSelected.link} target="_blank" class="m-1" style="white-space: nowrap;">{ocSelected.link}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="ocId" name="ocId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="steamId" style="white-space: nowrap;">Steam ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="steamHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#steamHelpId">
                <p>Go to <a href="https://store.steampowered.com/" style="text-decoration: underline" target="_blank">Steam Store</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://store.steampowered.com/app/<span style="color: red; font-weight: bold">70</span>/HalfLife</p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.steam} bind:value={searchSteamSelected} on:change={updateLinkAndId}></Select>
                {#if steamSelected != null}
                    <A bind:href={steamSelected.link} target="_blank" class="m-1" style="white-space: nowrap;">{steamSelected.link}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="steamId" name="steamId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="itadId" style="white-space: nowrap;">ITAD ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="itadHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#itadHelpId">
                <p>Go to <a href="https://isthereanydeal.com/" style="text-decoration: underline" target="_blank">ITAD</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://isthereanydeal.com/game/<span style="color: red; font-weight: bold">avatar-frontiers-of-pandora</span>/info</p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.itad} bind:value={searchITADSelected} on:change={updateLinkAndId}></Select>
                {#if itadSelected != null}
                    <A bind:href={itadSelected.link} target="_blank" class="m-1" style="white-space: nowrap;">{itadSelected.link}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="itadId" name="itadId" />
    </div>
    <div style="display: flex; align-items: center;">
        <Button id="createButton" type="submit">Create</Button>
        {#if creationMessage != null}
            <Alert class="ml-4" style="flex-grow:1" color={creationMessage.color} dismissable>
                {creationMessage.message}
            </Alert>
        {/if}
    </div>
</form>
