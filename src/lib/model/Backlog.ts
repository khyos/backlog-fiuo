import { ArtifactType } from "./Artifact"
import { BacklogItem, type IBacklogItem } from "./BacklogItem"
import type { ISerializable, Serializable } from "./Serializable";

export enum BacklogRankingType {
    RANK = "rank",
    ELO = "elo",
    WISHLIST= "wishlist"
}

export enum BacklogOrder {
    RANK = "rank",
    ELO = "elo",
    DATE_ADDED = "dateAdded",
    DATE_RELEASE = "dateRelease"
}


export const SERIALIZE_TYPE = 'Backlog';

export interface IBacklogDB {
    id: number
    title: string
}

export interface IBacklog extends ISerializable {
    id: number
    userId: number
    rankingType: BacklogRankingType
    backlogItems: IBacklogItem[]
    artifactType: ArtifactType
    title: string
}

export class Backlog implements Serializable<IBacklog> {
    id: number
    userId: number
    rankingType: BacklogRankingType
    backlogItems: BacklogItem[]
    artifactType: ArtifactType
    title: string

    constructor(id: number, userId: number, rankingType: BacklogRankingType, title: string, artifactType: ArtifactType) {
        this.id = id;
        this.userId = userId;
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
        const backlog = new Backlog(json.id, json.userId, json.rankingType, json.title, json.artifactType);
        backlog.backlogItems = json.backlogItems.map((backlogItemData) => {
            return BacklogItem.fromJSON(backlogItemData);
        });
        return backlog;
    }
}