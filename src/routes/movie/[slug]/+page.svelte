<script lang="ts">
    import { Movie } from "$lib/model/movie/Movie";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";
    import { UserArtifact } from "$lib/model/UserArtifact";
    import { initializeStore } from "$lib/stores/ArtifactItemStore";

    export let data: PageData;
    let movie = Movie.fromJSON(data.movie);
    initializeStore(movie)
    let userInfo = UserArtifact.fromJSON(data.userInfo);
</script>

<ArtifactItem
    userConnected={data.userConnected}
    userInfo={userInfo}
    canEdit={data.canEdit}
/>