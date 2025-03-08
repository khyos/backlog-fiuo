import type { BacklogItem } from '$lib/model/BacklogItem';
import { writable } from 'svelte/store';

export type BacklogPageState = {
    hiddenDrawer: boolean;
    selectedTab: 'filters' | 'add' | 'order';
    selectedBacklogItem?: BacklogItem;
};

export const backlogPageState = writable<BacklogPageState>({
    hiddenDrawer: true,
    selectedTab: 'filters'
});

export const toggleDrawer = () => {
    backlogPageState.update(s => ({
        ...s,
        hiddenDrawer: !s.hiddenDrawer
    }));
}