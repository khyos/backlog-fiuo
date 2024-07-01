import { ArtifactType } from "./Artifact"
import { BacklogItem } from "./BacklogItem"

export enum BacklogOrder {
    RANK = "rank",
    ELO = "elo",
}

export class Backlog {
    id: number
    userId: number
    backlogItems: BacklogItem[]
    artifactType: ArtifactType
    title: string

    constructor(id: number, userId: number, title: string, artifactType: ArtifactType) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.artifactType = artifactType;
        this.backlogItems = [];
    }

    serialize() {
        return {
            id: this.id,
            title: this.title,
            artifactType: this.artifactType,
            backlogItems: this.backlogItems.map(backlogItem => backlogItem.serialize()),
        }
    }

    static deserialize(data: any) {
        const backlog = new Backlog(data.id, data.userId, data.title, data.artifactType);
        backlog.backlogItems = data.backlogItems.map((backlogItemData: any) => {
            return BacklogItem.deserialize(backlogItemData);
        });
        return backlog;
    }
}