import { ArtifactType, type Artifact } from "$lib/model/Artifact";
import { Game } from "$lib/model/game/Game";
import { Movie } from "$lib/model/movie/Movie";
import { get, writable } from "svelte/store";

export type ArtifactItemStore = {
    artifact: Artifact
};

export const artifactItemStore = writable<ArtifactItemStore>();

export const initializeStore = (initArtifact: Artifact) => {
    artifactItemStore.set({
        artifact: initArtifact
    });
}

export const refreshArtifact = async () => {
    const store = get(artifactItemStore);
    const response = await fetch(`/api/${store.artifact.type}/${store.artifact.id}`, {
        method: "GET"
    });
    const artifactJSON = await response.json();
    if (store.artifact.type === ArtifactType.GAME) {
        artifactItemStore.update(s => ({
            ...s,
            artifact: Game.fromJSON(artifactJSON)
        }));
    } else if (store.artifact.type === ArtifactType.MOVIE) {
        artifactItemStore.update(s => ({
            ...s,
            artifact: Movie.fromJSON(artifactJSON)
        }));
    }
}