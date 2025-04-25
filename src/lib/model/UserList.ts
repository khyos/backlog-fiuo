import { Artifact, ArtifactType, type IArtifact } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";
import { artifactFromJSON } from "$lib/services/ArtifactService";

export enum UserListOrder {
    DATE_RELEASE = "dateRelease"
}

export const SERIALIZE_TYPE = 'UserList';

export interface IUserList extends ISerializable {
    userId: number
    artifactType: ArtifactType
    artifacts: IArtifact[]
}

export class UserList implements Serializable<IUserList> {
    userId: number
    artifactType: ArtifactType
    artifacts: Artifact[]

    constructor(userId: number, artifactType: ArtifactType, artifacts: Artifact[]) {
        this.userId = userId;
        this.artifactType = artifactType;
        this.artifacts = artifacts;
    }

    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            userId: this.userId,
            artifactType: this.artifactType,
            artifacts: this.artifacts.map(artifact => artifact.toJSON()),
        }
    }

    static fromJSON(json: IUserList) {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        const artifacts = json.artifacts.map((artifactJson) => {
            return artifactFromJSON(artifactJson.type, artifactJson);
        });
        const userList = new UserList(json.userId, json.artifactType, artifacts);
        
        return userList;
    }
}