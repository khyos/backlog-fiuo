<script lang="ts">
    import { ArtifactType } from "$lib/model/Artifact";
    import { BacklogRankingType } from "$lib/model/Backlog";
    import { Alert, Button, Input, Label, Select } from "flowbite-svelte";

    let creationMessage: any = null;
    let selectedArtifactType: string = ArtifactType.GAME;
    let selectedRankingType: string = BacklogRankingType.RANK;

    let artifactTypes = [
        { value: ArtifactType.GAME, name: 'Game' },
        { value: ArtifactType.MOVIE, name: 'Movie' },
        { value: ArtifactType.TVSHOW, name: 'TV Show' },
        { value: ArtifactType.ANIME, name: 'Anime' },
    ];

    let types = [
        { value: BacklogRankingType.ELO, name: 'Elo' },
        { value: BacklogRankingType.RANK, name: 'Rank' },
        { value: BacklogRankingType.WISHLIST, name: 'Wishlist' },
    ];

    const createBacklog = (e: any) => {
        e.preventDefault();
        document.getElementById("createButton")?.setAttribute("disabled", "");
        creationMessage = {
            message: "Creating backlog...",
            color: "blue"
        };
        const title = (document.getElementById("title") as HTMLInputElement)
            ?.value;

        fetch("/api/backlog/create", {
            method: "POST",
            body: JSON.stringify({
                title: title,
                artifactType: selectedArtifactType,
                rankingType: selectedRankingType
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
            window.location.href = `/backlog/${json.id}`;
        });
    };
</script>

<h2 class="text-4xl font-extrabold dark:text-white mb-6">Create Backlog</h2>
<form on:submit={createBacklog}>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="igdbId">Name:</Label>
        </div>
        <Input type="text" id="title" name="title" />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="igdbId">Type</Label>
        </div>
        <Select size="sm" class="w-24" items={artifactTypes} bind:value={selectedArtifactType} />
    </div>
    <div class="mb-6">
        <div style="display: inline-flex; align-items: center;" class="mb-1">
            <Label class="m-1" for="igdbId">Ranking System:</Label>
        </div>
        <Select size="sm" class="w-24" items={types} bind:value={selectedRankingType} />
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
