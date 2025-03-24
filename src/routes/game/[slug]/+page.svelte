<script lang="ts">
    import { Game } from "$lib/model/game/Game";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";
    import { UserArtifact } from "$lib/model/UserArtifact";
    import { initializeStore } from "$lib/stores/ArtifactItemStore";

    export let data: PageData;
    let game = Game.fromJSON(data.game);
    initializeStore(game);
    let userInfo = UserArtifact.fromJSON(data.userInfo);
</script>

<ArtifactItem
    userConnected={data.userConnected}
    userInfo={userInfo}
    canEdit={data.canEdit}
/>