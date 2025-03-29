import type { Artifact } from '$lib/model/Artifact';
import { writable } from 'svelte/store';

export type UserListPageStore = {
    hiddenDrawer: boolean;
    selectedTab: 'filters' | 'add';
    selectedArtifact?: Artifact;
};

export const pageStore = writable<UserListPageStore>({
    hiddenDrawer: true,
    selectedTab: 'filters'
});
export const toggleDrawer = () => {
    pageStore.update(s => ({
        ...s,
        hiddenDrawer: !s.hiddenDrawer
    }));
}
