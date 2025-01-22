<script lang="ts">
    import { Alert, Button, Input, Label, Popover } from "flowbite-svelte";
    import { QuestionCircleOutline } from "flowbite-svelte-icons";

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
<form on:submit={createMovie}>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="tmdbId">TMDB ID:</Label>
            <Button class="p-1" size="xs" id="tmdbHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#tmdbHelpId">
                <p>Go to <a href="https://www.themoviedb.org/" style="text-decoration: underline" target="_blank">TMDB</a></p>
                <p>Search for the movie you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://www.themoviedb.org/movie/<span style="color: red; font-weight: bold">823464</span>-godzilla-x-kong-the-new-empire/</p>
            </Popover>
        </div>
        <Input type="text" id="tmdbId" name="tmdbId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="scId">SensCritique ID:</Label>
            <Button class="p-1" size="xs" id="scHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#scHelpId">
                <p>Go to <a href="https://www.senscritique.com/" style="text-decoration: underline" target="_blank">SensCritique</a></p>
                <p>Search for the movie you want to add</p>
                <p>Copy the text and numeric from the URL of the page</p>
                <p>Example: https://www.senscritique.com/film/<span style="color: red; font-weight: bold">her/1301677</span>/</p>
            </Popover>
        </div>
        <Input type="text" id="scId" name="scId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="mcId">MetaCritic ID:</Label>
            <Button class="p-1" size="xs" id="mcHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#mcHelpId">
                <p>Go to <a href="https://www.metacritic.com/" style="text-decoration: underline" target="_blank">MetaCritic</a></p>
                <p>Search for the movie you want to add</p>
                <p>Copy the text ID from the URL of the page</p>
                <p>Example: https://www.metacritic.com/movie/<span style="color: red; font-weight: bold">the-truman-show</span>/</p>
            </Popover>
        </div>
        <Input type="text" id="mcId" name="mcId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="rtId">Rotten Tomatoes ID:</Label>
            <Button class="p-1" size="xs" id="rtHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#rtHelpId">
                <p>Go to <a href="https://www.rottentomatoes.com/" style="text-decoration: underline" target="_blank">Rotten Tomatoes</a></p>
                <p>Search for the movie you want to add</p>
                <p>Copy the text ID from the URL of the page</p>
                <p>Example: https://www.rottentomatoes.com/m/<span style="color: red; font-weight: bold">lost_in_translation</span>/</p>
            </Popover>
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
