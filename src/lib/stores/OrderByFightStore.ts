import { ArtifactType } from '$lib/model/Artifact';
import type { BacklogItem } from '$lib/model/BacklogItem';
import { getPosterURL } from '$lib/services/ArtifactService';
import { OrderUtil } from '$lib/util/OrderUtil';
import { get, writable } from 'svelte/store';
import { backlogStore } from '../../routes/backlog/[slug]/stores/BacklogStore';
import { BacklogRankingType } from '$lib/model/Backlog';
import { pageStore } from '../../routes/backlog/[slug]/stores/PageStore';

export type OrderByFightStore = {
    artifactType: ArtifactType
    fightType: 'elo' | 'rank'
    pickType: 'locked' | 'random'
    highestValue: number
    lowestValue: number
    itemA?: BacklogItem
    itemAPoster?: string
    itemB?: BacklogItem
    itemBPoster?: string
};

export const orderByFightStore = writable<OrderByFightStore>({
    artifactType: ArtifactType.GAME,
    fightType: 'rank',
    pickType: 'locked',
    highestValue: 1,
    lowestValue: 0
});

let previousItemA: BacklogItem | undefined;
let previousItemB: BacklogItem | undefined;
orderByFightStore.subscribe((store) => {
    if (store.itemA !== previousItemA) {
        previousItemA = store.itemA;
        updatePosterA(store);
    }
    if (store.itemB !== previousItemB) {
        previousItemB = store.itemB;
        updatePosterB(store);
    }
});

const updatePosterA = async (store: OrderByFightStore) => {
    if (!store.itemA) {
        return;
    }
    orderByFightStore.update(s => ({
        ...s,
        itemAPoster: undefined
    }));
    getPosterURL(store.artifactType, store.itemA.artifact.id).then((newItemAPoster) => {
        orderByFightStore.update(s => ({
            ...s,
            itemAPoster: newItemAPoster
        }));
    });
};

const updatePosterB = async (store: OrderByFightStore) => {
    if (!store.itemB) {
        return;
    }
    orderByFightStore.update(s => ({
        ...s,
        itemBPoster: undefined
    }));
    getPosterURL(store.artifactType, store.itemB.artifact.id).then((newItemBPoster) => {
        orderByFightStore.update(s => ({
            ...s,
            itemBPoster: newItemBPoster
        }));
    });
};

export const startOrderByFight = async (artifactId?: number) => {
    const pageStoreInst = get(pageStore);
    if (pageStoreInst.hiddenDrawer || pageStoreInst.selectedTab !== 'order') {
        pageStore.update(s => ({
            ...s,
            hiddenDrawer: false,
            selectedTab: 'order'
        }));
    }

    const backlog = get(backlogStore).backlog;
    
    if (backlog.backlogItems.length < 2) {
        throw new Error("You can't fight alone");
    }
    orderByFightStore.update(s => ({
        ...s,
        artifactType: backlog.artifactType,
        fightType: backlog.rankingType === BacklogRankingType.RANK ? 'rank' : 'elo',
        pickType: artifactId ? 'locked' : 'random',
        highestValue: 1,
        lowestValue: backlog.backlogItems.length
    }));
    if (artifactId) {
        orderByFightStore.update(s => ({
            ...s,
            itemA: backlog.backlogItems.find(bi => bi.artifact.id === artifactId)
        }));
    } else {
        await getRandomItemA();
    }
    do {
        await getRandomItemB();
    } while (get(orderByFightStore).itemA?.artifact.id === get(orderByFightStore).itemB?.artifact.id);
};

export const getRandomItemA = async () => {
    const backlog = get(backlogStore).backlog;
    const store = get(orderByFightStore);
    const randomIndex = OrderUtil.getRandomIntegerBetween(store.highestValue - 1, store.lowestValue - 1);
    const itemA = backlog.backlogItems[randomIndex];
    orderByFightStore.update(s => ({
        ...s,
        itemA
    }));
};

export const getRandomItemB = async () => {
    const backlog = get(backlogStore).backlog;
    const store = get(orderByFightStore);
    const randomIndex = OrderUtil.getRandomIntegerBetween(store.highestValue - 1, store.lowestValue - 1);
    const itemB = backlog.backlogItems[randomIndex];
    orderByFightStore.update(s => ({
        ...s,
        itemB
    }));
};