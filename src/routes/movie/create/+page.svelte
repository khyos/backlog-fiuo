<script lang="ts">
    import { A, Alert, Button, Input, Label, Popover, Search, Select, Spinner } from "flowbite-svelte";
    import { QuestionCircleOutline } from "flowbite-svelte-icons";

    let searchTerm: string = '';
    let searchStatus = 'no';
    let searchResults = null;

    const findMovieInfo = () => {
        searchStatus = 'started';
        fetch(`/api/movie/findMovieInfo?query=${searchTerm}`)
            .then(res => res.json())
            .then(results => {
                searchStatus = 'finished';
                for (const key in results) {
                    for (const result of results[key]) {
                        result.value = result.id;
                    }
                }
                searchResults = results;
                if (searchResults.tmdb[0])
                    searchTMDBSelected = searchResults.tmdb[0].id;
                if (searchResults.sc[0])
                    searchSCSelected = searchResults.sc[0].id;
                if (searchResults.mc[0])
                    searchMCSelected = searchResults.mc[0].id;
                if (searchResults.rt[0])
                    searchRTSelected = searchResults.rt[0].id;
                updateLinkAndId();
            });
    }

    let searchTMDBSelected = null;
    let tmdbSelected;
    let searchSCSelected = null;
    let scSelected;
    let searchMCSelected = null;
    let mcSelected;
    let searchRTSelected = null;
    let rtSelected;
    const updateLinkAndId = () => {
        tmdbSelected = searchResults.tmdb.find(r => r.id == searchTMDBSelected);
        (document.getElementById("tmdbId") as HTMLInputElement).value = searchTMDBSelected;

        scSelected = searchResults.sc.find(r => r.id == searchSCSelected);
        (document.getElementById("scId") as HTMLInputElement).value = searchSCSelected;

        mcSelected = searchResults.mc.find(r => r.id == searchMCSelected);
        (document.getElementById("mcId") as HTMLInputElement).value = searchMCSelected;

        rtSelected = searchResults.rt.find(r => r.id == searchRTSelected);
        (document.getElementById("rtId") as HTMLInputElement).value = searchRTSelected;
    }

    let creationMessage: any = null;

    const createMovie = (e: any) => {
        e.preventDefault();
        document.getElementById("createButton")?.setAttribute("disabled", "");
        creationMessage = {
            message: "Creating movie...",
            color: "blue"
        };
        const tmdbId = (document.getElementById("tmdbId") as HTMLInputElement)?.value;
        const scId = (document.getElementById("scId") as HTMLInputElement)?.value;
        const mcId = (document.getElementById("mcId") as HTMLInputElement)?.value;
        const rtId = (document.getElementById("rtId") as HTMLInputElement)?.value;

        fetch("/api/movie/create", {
            method: "POST",
            body: JSON.stringify({
                tmdbId,
                scId,
                mcId,
                rtId
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
            window.location.href = `/movie/${json.id}`;
        });
    };
</script>

<h2 class="text-4xl font-extrabold dark:text-white mb-6">Create Movie</h2>
<Search type="text"
    id="search-field"
    class="mb-6"
    placeholder="Search" 
    autocomplete="off"
    bind:value={searchTerm}
    on:change={findMovieInfo} />
{#if searchStatus === 'started'}
    <div class="text-center">
        <Spinner class="mb-6" />
    </div>
{/if}
<form on:submit={createMovie}>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="tmdbId" style="white-space: nowrap;">TMDB ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="tmdbHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#tmdbHelpId">
                <p>Go to <a href="https://www.themoviedb.org/" style="text-decoration: underline" target="_blank">TMDB</a></p>
                <p>Search for the movie you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://www.themoviedb.org/movie/<span style="color: red; font-weight: bold">823464</span>-godzilla-x-kong-the-new-empire/</p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.tmdb} bind:value={searchTMDBSelected} on:change={updateLinkAndId}></Select>
                {#if tmdbSelected != null}
                    <A bind:href={tmdbSelected.link} target="_blank" class="m-1" style="white-space: nowrap;">{tmdbSelected.link}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="tmdbId" name="tmdbId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="scId" style="white-space: nowrap;">SensCritique ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="scHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#scHelpId">
                <p>Go to <a href="https://www.senscritique.com/" style="text-decoration: underline" target="_blank">SensCritique</a></p>
                <p>Search for the movie you want to add</p>
                <p>Copy the text and numeric from the URL of the page</p>
                <p>Example: https://www.senscritique.com/film/<span style="color: red; font-weight: bold">her/1301677</span>/</p>
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
                <p>Search for the movie you want to add</p>
                <p>Copy the text ID from the URL of the page</p>
                <p>Example: https://www.metacritic.com/movie/<span style="color: red; font-weight: bold">the-truman-show</span>/</p>
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
            <Label class="m-1" for="rtId" style="white-space: nowrap;">Rotten Tomatoes ID:</Label>
            <Button class="p-1 mr-1" size="xs" id="rtHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#rtHelpId">
                <p>Go to <a href="https://www.rottentomatoes.com/" style="text-decoration: underline" target="_blank">Rotten Tomatoes</a></p>
                <p>Search for the movie you want to add</p>
                <p>Copy the text ID from the URL of the page</p>
                <p>Example: https://www.rottentomatoes.com/m/<span style="color: red; font-weight: bold">lost_in_translation</span>/</p>
            </Popover>
            {#if searchStatus === 'finished'}
                <Select items={searchResults.rt} bind:value={searchRTSelected} on:change={updateLinkAndId}></Select>
                {#if rtSelected != null}
                    <A bind:href={rtSelected.link} target="_blank" class="m-1" style="white-space: nowrap;">{rtSelected.link}</A>
                {/if}
            {/if}
        </div>
        <Input type="text" id="rtId" name="rtId" />
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
