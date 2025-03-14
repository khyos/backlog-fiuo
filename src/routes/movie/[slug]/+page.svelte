<script lang="ts">
    import { Movie } from "$lib/model/movie/Movie";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;
    let movie = Movie.deserialize(data.movie);
</script>

<ArtifactItem
    artifact={movie}
    userConnected={data.userConnected}
    userScore={data.userInfo?.score}
    canEdit={data.canEdit}
/>