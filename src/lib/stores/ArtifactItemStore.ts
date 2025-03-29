import { type Artifact } from "$lib/model/Artifact";
import { UserArtifactStatus } from "$lib/model/UserArtifact";
import { getArtifact, updateStatus as updateStatusAPI, updateScore as updateScoreAPI } from "$lib/services/ArtifactService";
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
    const { type, id } = store.artifact;
    const artifact = await getArtifact(type, id);
    artifact.copyUserInfos(store.artifact);
    artifactItemStore.update(s => ({
        ...s,
        artifact: artifact
    }));
}

export const updateStatus = async (artifactId: number, status: UserArtifactStatus | null) => {
    const store = get(artifactItemStore);
    const targetedArtifact = store.artifact.getArtifactById(artifactId);
    if (!targetedArtifact) {
        throw new Error('Artifact Not Found');
    }

    let artifactIds = [targetedArtifact.id];
    if (status === UserArtifactStatus.FINISHED) {
        artifactIds = targetedArtifact.getArtifactIds();
    }

    await updateStatusAPI(artifactIds, status);

    targetedArtifact.updateUserStatus(status);
    artifactItemStore.update(s => ({
        ...s,
        artifact: store.artifact
    }));
}

export const updateScore = async (score: number | null) => {
    const store = get(artifactItemStore);
    await updateScoreAPI(store.artifact.id, score);

    store.artifact.updateUserScore(score);
    artifactItemStore.update(s => ({
        ...s,
        artifact: store.artifact
    }));
}