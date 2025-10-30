<script lang="ts">
    import { Anime } from "$lib/model/anime/Anime";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";
    import { initializeStore } from "$lib/stores/ArtifactItemStore";

    export let data: PageData;
    let anime = Anime.fromJSON(data.anime);
    initializeStore(anime);
</script>

<ArtifactItem
    userConnected={data.userConnected}
    canEdit={data.canEdit}
/>