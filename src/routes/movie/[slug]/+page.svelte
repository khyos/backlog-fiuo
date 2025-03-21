<script lang="ts">
    import { Movie } from "$lib/model/movie/Movie";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";
    import { UserArtifact } from "$lib/model/UserArtifact";

    export let data: PageData;
    let movie = Movie.fromJSON(data.movie);
    let userInfo = UserArtifact.fromJSON(data.userInfo);
</script>

<ArtifactItem
    artifact={movie}
    userConnected={data.userConnected}
    userInfo={userInfo}
    canEdit={data.canEdit}
/>