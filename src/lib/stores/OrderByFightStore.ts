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
    itemAPoster?: string | null
    itemB?: BacklogItem
    itemBPoster?: string | null
    similarElo: boolean
};

export const orderByFightStore = writable<OrderByFightStore>({
    artifactType: ArtifactType.GAME,
    fightType: 'rank',
    pickType: 'locked',
    highestValue: 1,
    lowestValue: 0,
    similarElo: false
});

let previousItemA: BacklogItem | undefined;
let previousItemB: BacklogItem | undefined;
orderByFightStore.subscribe((store) => {
    if (store.itemA?.artifact.id !== previousItemA?.artifact.id) {
        previousItemA = store.itemA;
        updatePosterA(store);
    }
    if (store.itemB?.artifact.id !== previousItemB?.artifact.id) {
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
    if (!pageStoreInst.openDrawer || pageStoreInst.selectedTab !== 'order') {
        pageStore.update(s => ({
            ...s,
            openDrawer: true,
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

export const updateItemA = async () => {
    const backlog = get(backlogStore).backlog;
    const store = get(orderByFightStore);
    const itemA = backlog.backlogItems.find(bi => bi.artifact.id === store.itemA?.artifact.id);
    orderByFightStore.update(s => ({
        ...s,
        itemA
    }));
}

export const getRandomItemB = async () => {
    const backlog = get(backlogStore).backlog;
    const store = get(orderByFightStore);
    let itemB;
    if (store.similarElo) {
        const eloFilteredBacklog = backlog.backlogItems.filter(bi => bi.elo > store.itemA!.elo - 100 && bi.elo < store.itemA!.elo + 100);
        let randomIndex;
        if (eloFilteredBacklog.length > 1) {
            randomIndex = OrderUtil.getRandomIntegerBetween(0, eloFilteredBacklog.length - 1);
            itemB = eloFilteredBacklog[randomIndex];
        } else {
            randomIndex = OrderUtil.getRandomIntegerBetween(store.highestValue - 1, store.lowestValue - 1);
            itemB = backlog.backlogItems[randomIndex];
        }
    } else {
        const randomIndex = OrderUtil.getRandomIntegerBetween(store.highestValue - 1, store.lowestValue - 1);
        itemB = backlog.backlogItems[randomIndex];
    }
    orderByFightStore.update(s => ({
        ...s,
        itemB
    }));
};

export const updateSimilarElo = (activated: boolean) => {
    orderByFightStore.update(s => ({
        ...s,
        similarElo: activated
    }));
}