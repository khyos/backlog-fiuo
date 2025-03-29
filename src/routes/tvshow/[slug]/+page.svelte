<script lang="ts">
    import { Tvshow } from "$lib/model/tvshow/Tvshow";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";
    import { initializeStore } from "$lib/stores/ArtifactItemStore";


    export let data: PageData;
    let tvshow = Tvshow.fromJSON(data.tvshow);
    initializeStore(tvshow);
</script>

<ArtifactItem
    userConnected={data.userConnected}
    canEdit={data.canEdit}
/>