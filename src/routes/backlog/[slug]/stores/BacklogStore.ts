import { Backlog, BacklogRankingType, type IBacklog } from '$lib/model/Backlog';
import { fetchBacklog, fetchVirtualWishlistBacklog, fetchVirtualFutureBacklog } from '$lib/services/BacklogService';
import { derived, get, writable } from 'svelte/store';
import { createBacklogFilters, filterBacklogItems, type BacklogFilters } from '../BacklogFilters';
import { showCopiedToast } from './PageStore';
import { ArtifactType } from '$lib/model/Artifact';

export type BacklogStore = {
    backlog: Backlog,
    backlogFilters: BacklogFilters,
};

export const backlogStore = writable<BacklogStore>({
    backlog: new Backlog(-1, -1, BacklogRankingType.RANK, '', ArtifactType.GAME),
    backlogFilters: createBacklogFilters(ArtifactType.GAME, BacklogRankingType.RANK)
});

export const filteredBacklogItems = derived(backlogStore, $store => {
    if ($store.backlog && $store.backlogFilters) {
        return filterBacklogItems($store.backlog.backlogItems, $store.backlog.artifactType, $store.backlogFilters);
    }
    return [];
});

export const initializeStore = (initBacklog: IBacklog) => {
    const backlog = Backlog.fromJSON(initBacklog);
    const backlogFilters = createBacklogFilters(backlog.artifactType, backlog.rankingType);
    backlogStore.set({
        backlog: backlog,
        backlogFilters: backlogFilters
    })
    return backlog;
}

export const refreshBacklog = () => {
    const store = get(backlogStore);
    
    // Check if this is a virtual wishlist (id = -1)
    if (store.backlog.id === -1) {
        return fetchVirtualWishlistBacklog(store.backlog.artifactType).then((backlog: IBacklog) => {
            backlogStore.update(s => ({
                ...s,
                backlog: Backlog.fromJSON(backlog)
            }));
        });
    } 
    // Check if this is a virtual future list (id = -2)
    else if (store.backlog.id === -2) {
        return fetchVirtualFutureBacklog(store.backlog.artifactType).then((backlog: IBacklog) => {
            backlogStore.update(s => ({
                ...s,
                backlog: Backlog.fromJSON(backlog)
            }));
        });
    } else {
        return fetchBacklog(store.backlog.id).then((backlog) => {
            backlogStore.update(s => ({
                ...s,
                backlog: Backlog.fromJSON(backlog)
            }));
        });
    }
}

export const copyAiPrompt = () => {
    const items = get(filteredBacklogItems);
    const itemList = items.map(item => item.artifact.title).join(' | ');
    const prompt = `Je recherche dans cette liste de films des films qui correspondraient à ces critères:\n""\n${itemList}`;
    navigator.clipboard.writeText(prompt);
    showCopiedToast();
}
