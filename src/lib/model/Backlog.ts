import { ArtifactType } from "./Artifact"
import { BacklogItem } from "./BacklogItem"

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

export class Backlog {
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

    serialize() {
        return {
            id: this.id,
            rankingType: this.rankingType,
            title: this.title,
            artifactType: this.artifactType,
            backlogItems: this.backlogItems.map(backlogItem => backlogItem.serialize()),
        }
    }

    static deserialize(data: any) {
        const backlog = new Backlog(data.id, data.userId, data.type, data.title, data.artifactType);
        backlog.backlogItems = data.backlogItems.map((backlogItemData: any) => {
            return BacklogItem.deserialize(backlogItemData);
        });
        return backlog;
    }
}