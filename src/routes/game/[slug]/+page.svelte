<script lang="ts">
    import { Game } from "$lib/model/game/Game";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;
    let game = Game.deserialize(data.game);
</script>

<ArtifactItem
    id={game.id}
    title={game.title}
    type={game.type}
    releaseDate={game.releaseDate}
    duration={game.duration}
    genres={game.genres}
    ratings={game.ratings}
    links={game.links}
    platforms={game.platforms}
    userConnected={data.userConnected}
    userScore={data.userInfo?.score}
    canEdit={data.canEdit}
/>