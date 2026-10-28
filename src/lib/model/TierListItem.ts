import { artifactFromJSON } from "#lib/services/ArtifactService";
import { Artifact, type IArtifact } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";

export const SERIALIZE_TYPE = 'TierListItem';

export interface ITierListItem extends ISerializable {
    artifact: IArtifact;
    tierId: number | null;
    position: number;
}

export class TierListItem implements Serializable<ITierListItem> {
    artifact: Artifact;
    tierId: number | null;
    position: number;

    constructor(artifact: Artifact, tierId: number | null, position: number) {
        this.artifact = artifact;
        this.tierId = tierId;
        this.position = position;
    }

    toJSON(): ITierListItem {
        return {
            __type: SERIALIZE_TYPE,
            artifact: this.artifact.toJSON(),
            tierId: this.tierId,
            position: this.position,
        };
    }

    static fromJSON(json: ITierListItem): TierListItem {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        const artifact = artifactFromJSON(json.artifact.type, json.artifact);
        return new TierListItem(artifact, json.tierId, json.position);
    }
}
