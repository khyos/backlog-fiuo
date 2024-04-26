<script lang="ts">
    import { ArtifactType } from "$lib/model/Artifact";
</script>
<h1>Create a Backlog</h1>
<form method="POST" action="?/do">
    <label>
        Title:
        <input type="text" name="title" />
    </label>
    <label>
        Type:
        <select name="artifactType">
            <option value={ArtifactType.GAME}>Game</option>
            <option value={ArtifactType.MOVIE}>Movie</option>
        </select>
    </label>
    <button type="submit">Create</button>
</form>
