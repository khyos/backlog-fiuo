import { ArtifactType } from "$lib/model/Artifact";

export async function getPosterURL(artifactType: ArtifactType, artifactId: number) {
    let url = "";
    if (artifactType === ArtifactType.GAME) {
        const response = await fetch(`/api/game/${artifactId}/poster`);
        url = await response.text();
    } else if (artifactType === ArtifactType.MOVIE) {
        const response = await fetch(`/api/movie/${artifactId}/poster`);
        url = await response.text();
    }
    return url;
}