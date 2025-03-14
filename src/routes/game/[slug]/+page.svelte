<script lang="ts">
    import { Game } from "$lib/model/game/Game";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;
    let game = Game.deserialize(data.game);
</script>

<ArtifactItem
    artifact={game}
    platforms={game.platforms}
    userConnected={data.userConnected}
    userScore={data.userInfo?.score}
    canEdit={data.canEdit}
/>