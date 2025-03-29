<script lang="ts">
    import { Game } from "$lib/model/game/Game";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";
    import { initializeStore } from "$lib/stores/ArtifactItemStore";

    export let data: PageData;
    let game = Game.fromJSON(data.game);
    initializeStore(game);
</script>

<ArtifactItem
    userConnected={data.userConnected}
    canEdit={data.canEdit}
/>