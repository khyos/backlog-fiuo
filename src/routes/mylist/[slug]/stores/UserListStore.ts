import { UserList, type IUserList } from '$lib/model/UserList';
import { fetchUserList } from '$lib/services/UserListService';
import { derived, get, writable } from 'svelte/store';
import { createUserListFilters, filterUserListItems, type UserListFilters } from '../UserListFilters';
import { ArtifactType } from '$lib/model/Artifact';

export type UserListStore = {
    userList: UserList,
    userListFilters: UserListFilters,
};

export const userListStore = writable<UserListStore>({
    userList: new UserList(-1, ArtifactType.GAME, []),
    userListFilters: createUserListFilters(ArtifactType.GAME)
});

export const filteredArtifacts = derived(userListStore, $store => {
    if ($store.userList && $store.userListFilters) {
        return filterUserListItems($store.userList.artifacts, $store.userList.artifactType, $store.userListFilters);
    }
    return [];
});

export const initializeStore = (initUserList: IUserList) => {
    const userList = UserList.fromJSON(initUserList);
    const userListFilters = createUserListFilters(userList.artifactType);
    userListStore.set({
        userList: userList,
        userListFilters: userListFilters
    })
}

export const refreshUserList = () => {
    const store = get(userListStore);
    return fetchUserList(store.userList.userId, store.userList.artifactType).then((userList) => {
        userListStore.update(s => ({
            ...s,
            userList: userList
        }));
    });
}
