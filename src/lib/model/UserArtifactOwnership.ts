import type { ISerializable, Serializable } from "./Serializable";

export const SERIALIZE_TYPE = 'UserArtifactOwnership';

export interface IUserArtifactOwnershipDB {
    id: number
    userId: number
    artifactId: number
    platform: string
    note: string | null
}

export interface IUserArtifactOwnership extends ISerializable {
    id: number
    userId: number
    artifactId: number
    platform: string
    note: string | null
}

export class UserArtifactOwnership implements Serializable<IUserArtifactOwnership> {
    id: number
    userId: number
    artifactId: number
    platform: string
    note: string | null

    constructor(id: number, userId: number, artifactId: number, platform: string, note: string | null) {
        this.id = id;
        this.userId = userId;
        this.artifactId = artifactId;
        this.platform = platform;
        this.note = note;
    }

    toJSON(): IUserArtifactOwnership {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            userId: this.userId,
            artifactId: this.artifactId,
            platform: this.platform,
            note: this.note
        };
    }

    static fromJSON(json: IUserArtifactOwnership): UserArtifactOwnership {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new UserArtifactOwnership(json.id, json.userId, json.artifactId, json.platform, json.note);
    }
}
