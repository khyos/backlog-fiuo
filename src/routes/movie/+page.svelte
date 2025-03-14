<script lang="ts">
    import ArtifactList from '$lib/components/ArtifactList.svelte';
    import type { PageData } from './$types';

    export let data: PageData;
</script>

<ArtifactList 
    artifacts={data.movies} 
    artifactType="movie" 
    permissions={data.permissions} 
    title="Movies" 
/>