<script lang="ts">
    import { Alert, Button, Input, Label, Popover } from "flowbite-svelte";
    import { QuestionCircleOutline } from "flowbite-svelte-icons";

    let creationMessage: any = null;

    const createGame = (e: any) => {
        e.preventDefault();
        document.getElementById("createButton")?.setAttribute("disabled", "");
        creationMessage = {
            message: "Creating game...",
            color: "blue"
        };
        const igdbId = (<HTMLInputElement>document.getElementById("igdbId"))
            ?.value;
        const hltbId = (<HTMLInputElement>document.getElementById("hltbId"))
            ?.value;
        const scId = (<HTMLInputElement>document.getElementById("scId"))?.value;
        const mcId = (<HTMLInputElement>document.getElementById("mcId"))?.value;
        const ocId = (<HTMLInputElement>document.getElementById("ocId"))?.value;
        const steamId = (<HTMLInputElement>document.getElementById("steamId"))?.value;

        fetch("/api/game/create", {
            method: "POST",
            body: JSON.stringify({
                igdbId,
                hltbId,
                scId,
                mcId,
                ocId,
                steamId
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
<form on:submit={createGame}>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="igdbId">IGDB ID:</Label>
            <Button class="p-1" size="xs" id="igdbHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#igdbHelpId">
                <p>Go to <a href="https://www.igdb.com/" style="text-decoration: underline" target="_blank">IGDB</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the ID from the Info on the right of the page</p>
            </Popover>
        </div>
        <Input type="text" id="igdbId" name="igdbId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="hltbId">HowLongToBeat ID:</Label>
            <Button class="p-1" size="xs" id="hltbHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#hltbHelpId">
                <p>Go to <a href="https://www.howlongtobeat.com/" style="text-decoration: underline" target="_blank">HowLongToBeat</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://www.howlongtobeat.com/game/<span style="color: red; font-weight: bold">68151</span></p>
            </Popover>
        </div>
        <Input type="text" id="hltbId" name="hltbId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="scId">SensCritique ID:</Label>
            <Button class="p-1" size="xs" id="scHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#scHelpId">
                <p>Go to <a href="https://www.senscritique.com/" style="text-decoration: underline" target="_blank">SensCritique</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the text and numeric from the URL of the page</p>
                <p>Example: https://www.senscritique.com/jeuvideo/<span style="color: red; font-weight: bold">ico/207869</span>/</p>
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
                <p>Search for the game you want to add</p>
                <p>Copy the text ID from the URL of the page</p>
                <p>Example: https://www.metacritic.com/game/<span style="color: red; font-weight: bold">secret-of-mana</span>/</p>
            </Popover>
        </div>
        <Input type="text" id="mcId" name="mcId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="ocId">OpenCritic ID:</Label>
            <Button class="p-1" size="xs" id="ocHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#ocHelpId">
                <p>Go to <a href="https://www.opencritic.com/" style="text-decoration: underline" target="_blank">OpenCritic</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://opencritic.com/game/<span style="color: red; font-weight: bold">12888</span>/tunic</p>
            </Popover>
        </div>
        <Input type="text" id="ocId" name="ocId" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="steamId">Steam ID:</Label>
            <Button class="p-1" size="xs" id="steamHelpId"><QuestionCircleOutline /></Button>
            <Popover class="text-sm" triggeredBy="#steamHelpId">
                <p>Go to <a href="https://store.steampowered.com/" style="text-decoration: underline" target="_blank">Steam Store</a></p>
                <p>Search for the game you want to add</p>
                <p>Copy the numeric ID from the URL of the page</p>
                <p>Example: https://store.steampowered.com/app/<span style="color: red; font-weight: bold">70</span>/HalfLife</p>
            </Popover>
        </div>
        <Input type="text" id="steamId" name="steamId" />
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
