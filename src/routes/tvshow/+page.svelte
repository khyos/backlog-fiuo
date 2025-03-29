<script lang="ts">
    import ArtifactList from '$lib/components/ArtifactList.svelte';
    import { ArtifactType } from '$lib/model/Artifact';
    import type { PageData } from './$types';

    export let data: PageData;
</script>

<ArtifactList 
    artifacts={data.tvshows} 
    artifactType={ArtifactType.TVSHOW}
    permissions={data.permissions} 
    title="TV Shows" 
/>