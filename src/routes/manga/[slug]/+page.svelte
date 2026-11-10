<script lang="ts">
    import { Manga } from "$lib/model/manga/Manga";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";
    import { initializeStore } from "$lib/stores/ArtifactItemStore";

    export let data: PageData;
    let manga = Manga.fromJSON(data.manga);
    initializeStore(manga);
</script>

<ArtifactItem
    userConnected={data.userConnected}
    canEdit={data.canEdit}
/>
