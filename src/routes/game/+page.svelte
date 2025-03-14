<script lang="ts">
    import ArtifactList from '$lib/components/ArtifactList.svelte';
    import type { PageData } from './$types';

    export let data: PageData;
</script>

<ArtifactList 
    artifacts={data.games} 
    artifactType="game" 
    permissions={data.permissions} 
    title="Games" 
/>