<script lang="ts">
    import { Movie } from "#lib/model/movie/Movie";
    import ArtifactItem from "#lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";
    import { initializeStore } from "#lib/stores/ArtifactItemStore";

    export let data: PageData;
    let movie = Movie.fromJSON(data.movie);
    initializeStore(movie);
</script>

<ArtifactItem
    userConnected={data.userConnected}
    canEdit={data.canEdit}
/>