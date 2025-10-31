import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactStatus } from '$lib/model/UserArtifact';
import { UserList, type IUserList } from '$lib/model/UserList';
import { updateDate, updateStatus as updateStatusAPI } from '$lib/services/ArtifactService';
import { get, writable } from 'svelte/store';

export type UserListStore = {
    userList: UserList
};

export const userListStore = writable<UserListStore>({
    userList: new UserList(-1, ArtifactType.GAME, [])
});

export const initializeStore = (initUserList: IUserList) => {
    const userList = UserList.fromJSON(initUserList);
    userListStore.set({
        userList: userList
    })
}

export const updateStatus = async (artifactId: number) => {
    const store = get(userListStore);
    let targetedArtifact = null;
    for (const artifact of store.userList.artifacts) {
        targetedArtifact = artifact.getArtifactById(artifactId);
        if (targetedArtifact) {
            break;
        }
    }
    if (!targetedArtifact) {
        throw new Error('Artifact Not Found');
    }

    await updateStatusAPI([artifactId], UserArtifactStatus.FINISHED);
    await updateDate(artifactId, new Date(), 'both');

    targetedArtifact.updateUserStatus(UserArtifactStatus.FINISHED);
    targetedArtifact.rootParent.computeLastAndNextOngoing();

    userListStore.update(s => ({
        ...s,
        userList: store.userList
    }));
}
