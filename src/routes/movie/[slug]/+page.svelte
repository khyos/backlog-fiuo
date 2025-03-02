<script lang="ts">
    import { Movie } from "$lib/model/movie/Movie";
    import ArtifactItem from "$lib/components/ArtifactItem.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;
    let movie = Movie.deserialize(data.movie);
</script>

<ArtifactItem
    id={movie.id}
    title={movie.title}
    type={movie.type}
    releaseDate={movie.releaseDate}
    duration={movie.duration}
    genres={movie.genres}
    ratings={movie.ratings}
    links={movie.links}
    userConnected={data.userConnected}
    userScore={data.userInfo?.score}
    canEdit={data.canEdit}
/>