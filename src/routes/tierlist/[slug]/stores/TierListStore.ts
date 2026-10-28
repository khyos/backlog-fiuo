import { ArtifactType } from '#lib/model/Artifact';
import { TierList, type ITierList } from '#lib/model/TierList';
import { get, writable } from 'svelte/store';

export type TierListStoreData = {
    tierList: TierList;
};

export const tierListStore = writable<TierListStoreData>({
    tierList: new TierList(-1, -1, null, ArtifactType.GAME, '')
});

export const initializeStore = (init: ITierList) => {
    tierListStore.set({ tierList: TierList.fromJSON(init) });
};

export const refreshTierList = async () => {
    const store = get(tierListStore);
    const response = await fetch(`/api/tierlist/${store.tierList.id}`);
    if (!response.ok) {
        throw new Error('Error while Fetching Tier List');
    }
    const json = await response.json();
    tierListStore.update(s => ({ ...s, tierList: TierList.fromJSON(json) }));
};
