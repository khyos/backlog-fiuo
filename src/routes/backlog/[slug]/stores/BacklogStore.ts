import { Backlog, type IBacklog } from '$lib/model/Backlog';
import { fetchBacklog } from '$lib/services/BacklogService';
import { derived, get, writable } from 'svelte/store';
import { createBacklogFilters, filterBacklogItems, type BacklogFilters } from '../BacklogFilters';

export type BacklogStore = {
    backlog: Backlog,
    backlogFilters: BacklogFilters,
};

export const backlogStore = writable<BacklogStore>({});

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
}

export const refreshBacklog = () => {
    const store = get(backlogStore);
    return fetchBacklog(store.backlog.id).then((backlog) => {
        backlogStore.update(s => ({
            ...s,
            backlog: Backlog.fromJSON(backlog)
        }));
    });
}
