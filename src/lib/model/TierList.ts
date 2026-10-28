import { ArtifactType } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";
import { Tier, type ITier } from "./Tier";
import { TierListItem, type ITierListItem } from "./TierListItem";

export const SERIALIZE_TYPE = 'TierList';

export interface ITierList extends ISerializable {
    id: number;
    userId: number;
    backlogId: number | null;
    artifactType: ArtifactType;
    title: string;
    tiers: ITier[];
    unranked: ITierListItem[];
}

export class TierList implements Serializable<ITierList> {
    id: number;
    userId: number;
    backlogId: number | null;
    artifactType: ArtifactType;
    title: string;
    tiers: Tier[];
    unranked: TierListItem[];

    constructor(
        id: number,
        userId: number,
        backlogId: number | null,
        artifactType: ArtifactType,
        title: string,
        tiers: Tier[] = [],
        unranked: TierListItem[] = []
    ) {
        this.id = id;
        this.userId = userId;
        this.backlogId = backlogId;
        this.artifactType = artifactType;
        this.title = title;
        this.tiers = tiers;
        this.unranked = unranked;
    }

    toJSON(): ITierList {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            userId: this.userId,
            backlogId: this.backlogId,
            artifactType: this.artifactType,
            title: this.title,
            tiers: this.tiers.map(tier => tier.toJSON()),
            unranked: this.unranked.map(item => item.toJSON()),
        };
    }

    static fromJSON(json: ITierList): TierList {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new TierList(
            json.id,
            json.userId,
            json.backlogId,
            json.artifactType,
            json.title,
            json.tiers.map(tier => Tier.fromJSON(tier)),
            json.unranked.map(item => TierListItem.fromJSON(item))
        );
    }
}
