import type { BacklogItem } from '$lib/model/BacklogItem';
import { fetchBacklogs } from '$lib/services/BacklogService';
import type { SelectOptionType } from 'flowbite-svelte';
import { get, writable } from 'svelte/store';
import { backlogStore } from './BacklogStore';

export type BacklogPageStore = {
    backlogsForSelect?: SelectOptionType<any>[],
    openDrawer: boolean;
    isCopiedToastVisible: boolean;
    selectedTab: 'filters' | 'add' | 'order';
    selectedBacklogItem?: BacklogItem;
    showMoveToBacklog: boolean;
    showMoveToRank: boolean;
};

export const pageStore = writable<BacklogPageStore>({
    openDrawer: false,
    isCopiedToastVisible: false,
    selectedTab: 'filters',
    showMoveToBacklog: false,
    showMoveToRank: false,
});

export const toggleDrawer = () => {
    pageStore.update(s => ({
        ...s,
        openDrawer: !s.openDrawer
    }));
}

export const showCopiedToast = () => {
    pageStore.update(s => ({
        ...s,
        isCopiedToastVisible: true
    }));
    window.setTimeout(() => {
        pageStore.update(s => ({
            ...s,
            isCopiedToastVisible: false
        }));
    }, 5000);
}

export const showMoveToBacklog = async (backlogItem: BacklogItem) => {
    const pageStoreInst = get(pageStore);
    const backlogStoreInst = get(backlogStore)
    if (!pageStoreInst.backlogsForSelect) {
        const backlogs = await fetchBacklogs(backlogStoreInst.backlog.artifactType);
        const backlogsForSelect = backlogs.filter(b => b.id != backlogStoreInst.backlog.id).map((b) => {
            return {
                value: b.id,
                name: b.title
            };
        });
        pageStore.update(s => ({
            ...s,
            backlogsForSelect: backlogsForSelect,
        }));
    }
    
    pageStore.update(s => ({
        ...s,
        selectedBacklogItem: backlogItem,
        showMoveToBacklog: true
    }));
}

export const hideMoveToBacklog = async () => {
    pageStore.update(s => ({
        ...s,
        showMoveToBacklog: false
    }));
}

export const showMoveToRank = (backlogItem: BacklogItem) => {
    pageStore.update(s => ({
        ...s,
        selectedBacklogItem: backlogItem,
        showMoveToRank: true
    }));
}

export const hideMoveToRank = async () => {
    pageStore.update(s => ({
        ...s,
        showMoveToRank: false
    }));
}
