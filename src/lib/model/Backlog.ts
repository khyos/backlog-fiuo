import { ArtifactType } from "./Artifact"
import { BacklogItem, type IBacklogItem } from "./BacklogItem"
import type { ISerializable, Serializable } from "./Serializable";

export enum BacklogType {
    FUTURE = "future",
    STANDARD = "standard",
    CURRENT = "current"
}

export enum BacklogRankingType {
    RANK = "rank",
    ELO = "elo",
    WISHLIST = "wishlist"
}

export enum BacklogOrder {
    RANK = "rank",
    ELO = "elo",
    DATE_ADDED = "dateAdded",
    DATE_RELEASE = "dateRelease",
    RATING = "rating"
}

export const BacklogOrderLabel = {
    [BacklogOrder.RANK]: "Rank",
    [BacklogOrder.ELO]: "Elo",
    [BacklogOrder.DATE_ADDED]: "Date Added in List",
    [BacklogOrder.DATE_RELEASE]: "Release Date",
    [BacklogOrder.RATING]: "Rating"
} as const;

export const SERIALIZE_TYPE = 'Backlog';

export interface IBacklogDB {
    id: number
    title: string
}

export interface IBacklog extends ISerializable {
    id: number
    userId: number
    type: BacklogType
    rankingType: BacklogRankingType
    backlogItems: IBacklogItem[]
    artifactType: ArtifactType
    title: string
}

export class Backlog implements Serializable<IBacklog> {
    id: number
    userId: number
    type: BacklogType
    rankingType: BacklogRankingType
    backlogItems: BacklogItem[]
    artifactType: ArtifactType
    title: string

    constructor(id: number, userId: number, type: BacklogType, rankingType: BacklogRankingType, title: string, artifactType: ArtifactType) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.rankingType = rankingType;
        this.title = title;
        this.artifactType = artifactType;
        this.backlogItems = [];
    }

    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            userId: this.userId,
            type: this.type,
            rankingType: this.rankingType,
            title: this.title,
            artifactType: this.artifactType,
            backlogItems: this.backlogItems.map(backlogItem => backlogItem.toJSON()),
        }
    }

    static fromJSON(json: IBacklog) {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        const backlog = new Backlog(json.id, json.userId, json.type, json.rankingType, json.title, json.artifactType);
        backlog.backlogItems = json.backlogItems.map((backlogItemData) => {
            return BacklogItem.fromJSON(backlogItemData);
        });
        return backlog;
    }
}