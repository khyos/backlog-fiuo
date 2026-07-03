import type { ArtifactType } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";

export const SERIALIZE_TYPE = 'SubscriptionService';

export interface ISubscriptionServiceDB {
    id: number
    name: string
}

export interface ISubscriptionService extends ISerializable {
    id: number
    name: string
    artifactTypes: ArtifactType[]
}

export class SubscriptionService implements Serializable<ISubscriptionService> {
    id: number
    name: string
    artifactTypes: ArtifactType[]

    constructor(id: number, name: string, artifactTypes: ArtifactType[]) {
        this.id = id;
        this.name = name;
        this.artifactTypes = artifactTypes;
    }

    toJSON(): ISubscriptionService {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            name: this.name,
            artifactTypes: this.artifactTypes
        };
    }

    static fromJSON(json: ISubscriptionService): SubscriptionService {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new SubscriptionService(json.id, json.name, json.artifactTypes);
    }
}
