import { type Artifact } from "$lib/model/Artifact";
import { UserArtifactStatus } from "$lib/model/UserArtifact";
import {
    getArtifact,
    updateStatus as updateStatusAPI,
    updateScore as updateScoreAPI,
    updateDate as updateDateAPI
} from "$lib/services/ArtifactService";
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

export const updateDate = async (date: Date | null) => {
    const store = get(artifactItemStore);
    await updateDateAPI(store.artifact.id, date, 'both');

    store.artifact.updateUserStartDate(date);
    store.artifact.updateUserEndDate(date);
    artifactItemStore.update(s => ({
        ...s,
        artifact: store.artifact
    }));
}

export const updateStartDate = async (date: Date | null) => {
    const store = get(artifactItemStore);
    await updateDateAPI(store.artifact.id, date, 'start');

    store.artifact.updateUserStartDate(date);
    artifactItemStore.update(s => ({
        ...s,
        artifact: store.artifact
    }));
}

export const updateEndDate = async (date: Date | null) => {
    const store = get(artifactItemStore);
    await updateDateAPI(store.artifact.id, date, 'end');

    store.artifact.updateUserEndDate(date);
    artifactItemStore.update(s => ({
        ...s,
        artifact: store.artifact
    }));
}

export const markFinishedUpTo = async (targetArtifactId: number) => {
    const store = get(artifactItemStore);
    const root = store.artifact;

    const target = root.getArtifactById(targetArtifactId);
    if (!target) throw new Error('Artifact Not Found');

    const parent = target.parent;
    if (!parent) throw new Error('Cannot mark root artifact');

    const targetIndex = parent.children.indexOf(target);
    const idsToMark: number[] = [];

    if (parent.parent === null) {
        // Target is a direct child of root
        for (let i = 0; i <= targetIndex; i++) {
            idsToMark.push(...root.children[i].getArtifactIds());
        }
        await updateStatusAPI(idsToMark, UserArtifactStatus.FINISHED);
        for (let i = 0; i <= targetIndex; i++) {
            root.children[i].updateUserStatus(UserArtifactStatus.FINISHED);
        }
    } else {
        // Target is a 2nd level child; parent is a 1st level child
        const firstLevelChild = parent;
        const firstLevelIndex = root.children.indexOf(firstLevelChild);
        for (let i = 0; i < firstLevelIndex; i++) {
            idsToMark.push(...root.children[i].getArtifactIds());
        }
        for (let j = 0; j <= targetIndex; j++) {
            idsToMark.push(firstLevelChild.children[j].id);
        }
        await updateStatusAPI(idsToMark, UserArtifactStatus.FINISHED);
        for (let i = 0; i < firstLevelIndex; i++) {
            root.children[i].updateUserStatus(UserArtifactStatus.FINISHED);
        }
        for (let j = 0; j <= targetIndex; j++) {
            firstLevelChild.children[j].updateUserStatus(UserArtifactStatus.FINISHED);
        }
    }

    artifactItemStore.update(s => ({
        ...s,
        artifact: root
    }));
}