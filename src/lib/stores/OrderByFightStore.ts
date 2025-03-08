import { ArtifactType } from '$lib/model/Artifact';
import type { BacklogItem } from '$lib/model/BacklogItem';
import { getPosterURL } from '$lib/services/ArtifactService';
import { OrderUtil } from '$lib/util/OrderUtil';
import { get, writable } from 'svelte/store';

export type OrderByFightState = {
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

export const orderByFightState = writable<OrderByFightState>({
    artifactType: ArtifactType.GAME,
    fightType: 'rank',
    pickType: 'locked',
    highestValue: 1,
    lowestValue: 0
});

let previousItemA: BacklogItem | undefined;
let previousItemB: BacklogItem | undefined;
orderByFightState.subscribe((state) => {
    if (state.itemA !== previousItemA) {
        previousItemA = state.itemA;
        updatePosterA(state);
    }
    if (state.itemB !== previousItemB) {
        previousItemB = state.itemB;
        updatePosterB(state);
    }
});

const updatePosterA = async (state: OrderByFightState) => {
    if (!state.itemA) {
        return;
    }
    orderByFightState.update(s => ({
        ...s,
        itemAPoster: undefined
    }));
    getPosterURL(state.artifactType, state.itemA.artifact.id).then((newItemAPoster) => {
        orderByFightState.update(s => ({
            ...s,
            itemAPoster: newItemAPoster
        }));
    });
};

const updatePosterB = async (state: OrderByFightState) => {
    if (!state.itemB) {
        return;
    }
    orderByFightState.update(s => ({
        ...s,
        itemBPoster: undefined
    }));
    getPosterURL(state.artifactType, state.itemB.artifact.id).then((newItemBPoster) => {
        orderByFightState.update(s => ({
            ...s,
            itemBPoster: newItemBPoster
        }));
    });
};

export const startOrderByFight = async (backlog: { backlogItems: BacklogItem[], artifactType: ArtifactType }, type: 'elo' | 'rank', artifactId?: number) => {
    if (backlog.backlogItems.length < 2) {
        throw new Error("You can't fight alone");
    }
    orderByFightState.update(s => ({
        ...s,
        artifactType: backlog.artifactType,
        fightType: type,
        pickType: artifactId ? 'locked' : 'random',
        highestValue: 1,
        lowestValue: backlog.backlogItems.length
    }));
    if (artifactId) {
        orderByFightState.update(s => ({
            ...s,
            itemA: backlog.backlogItems.find(bi => bi.artifact.id === artifactId)
        }));
    } else {
        await getRandomItemA(backlog);
    }
    do {
        await getRandomItemB(backlog);
    } while (get(orderByFightState).itemA?.artifact.id === get(orderByFightState).itemB?.artifact.id);
};

export const getRandomItemA = async (backlog: { backlogItems: BacklogItem[], artifactType: ArtifactType }) => {
    const state = get(orderByFightState);
    const randomIndex = OrderUtil.getRandomIntegerBetween(state.highestValue - 1, state.lowestValue - 1);
    const itemA = backlog.backlogItems[randomIndex];
    orderByFightState.update(s => ({
        ...s,
        itemA
    }));
};

export const getRandomItemB = async (backlog: { backlogItems: BacklogItem[], artifactType: ArtifactType }) => {
    const state = get(orderByFightState);
    const randomIndex = OrderUtil.getRandomIntegerBetween(state.highestValue - 1, state.lowestValue - 1);
    const itemB = backlog.backlogItems[randomIndex];
    orderByFightState.update(s => ({
        ...s,
        itemB
    }));
};