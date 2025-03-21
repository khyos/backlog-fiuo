<script lang="ts">
    import ArtifactList from '$lib/components/ArtifactList.svelte';
    import { ArtifactType } from '$lib/model/Artifact';
    import type { PageData } from './$types';

    export let data: PageData;
</script>

<ArtifactList 
    artifacts={data.movies} 
    artifactType={ArtifactType.MOVIE}
    permissions={data.permissions} 
    title="Movies" 
/>