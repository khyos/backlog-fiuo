import type { ArtifactType } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";

export const SERIALIZE_TYPE = 'SubscriptionService';

export interface ISubscriptionServiceDB {
    id: number
    name: string
    artifactType: ArtifactType | null
}

export interface ISubscriptionService extends ISerializable {
    id: number
    name: string
    artifactType: ArtifactType | null
}

export class SubscriptionService implements Serializable<ISubscriptionService> {
    id: number
    name: string
    artifactType: ArtifactType | null

    constructor(id: number, name: string, artifactType: ArtifactType | null) {
        this.id = id;
        this.name = name;
        this.artifactType = artifactType;
    }

    toJSON(): ISubscriptionService {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            name: this.name,
            artifactType: this.artifactType
        };
    }

    static fromJSON(json: ISubscriptionService): SubscriptionService {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new SubscriptionService(json.id, json.name, json.artifactType);
    }
}
