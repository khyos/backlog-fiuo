import { type ISerializable, type Serializable } from "./Serializable"

export const SERIALIZE_TYPE = 'UserArtifact';

export interface IUserArtifactDB {
    userId: number
    artifactId: number
    score: number | null
    startDate: string | null
    endDate: string | null
}

export interface IUserArtifact extends ISerializable {
    userId: number
    artifactId: number
    score: number | null
    startDate: string | null
    endDate: string | null
}

export class UserArtifact implements Serializable<IUserArtifact> {
    userId: number
    artifactId: number
    score: number | null
    startDate: Date | null
    endDate: Date | null

    constructor(userId: number, artifactId: number, score: number | null, startDate: string | null, endDate: string | null) {
        this.userId = userId;
        this.artifactId = artifactId;
        this.score = score;
        this.startDate = startDate ? new Date(startDate) : null;
        this.endDate = endDate ? new Date(endDate) : null;
    }

    toJSON(): IUserArtifact {
        return {
            __type: SERIALIZE_TYPE,
            userId: this.userId,
            artifactId: this.artifactId,
            score: this.score,
            startDate: this.startDate?.toISOString() ?? null,
            endDate: this.endDate?.toISOString() ?? null
        }
    }

    static fromJSON(json: IUserArtifact | null) {
        if (json === null) {
            return null;
        }
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new UserArtifact(json.userId, json.artifactId, json.score, json.startDate, json.endDate);
    }
}