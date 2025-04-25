import { type ISerializable, type Serializable } from "./Serializable"

export enum UserArtifactStatus {
    DROPPED = 'dropped',
    FINISHED = 'finished',
    ON_GOING = 'ongoing',
    ON_HOLD = 'onhold',
    WISHLIST = 'wishlist'
}

export const SERIALIZE_TYPE = 'UserArtifact';

export interface IUserArtifactDB {
    userId: number
    artifactId: number
    status: UserArtifactStatus | null
    score: number | null
    startDate: string | null
    endDate: string | null
}

export interface IUserArtifact extends ISerializable {
    userId: number
    artifactId: number
    status: UserArtifactStatus | null
    score: number | null
    startDate: string | null
    endDate: string | null
}

export class UserArtifact implements Serializable<IUserArtifact> {
    userId: number
    artifactId: number
    status: UserArtifactStatus | null
    score: number | null
    startDate: Date | null
    endDate: Date | null

    constructor(userId: number, artifactId: number, status: UserArtifactStatus | null, score: number | null, startDate: Date | null, endDate: Date | null) {
        this.userId = userId;
        this.artifactId = artifactId;
        this.status = status;
        this.score = score;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    toJSON(): IUserArtifact {
        return {
            __type: SERIALIZE_TYPE,
            userId: this.userId,
            artifactId: this.artifactId,
            status: this.status,
            score: this.score,
            startDate: this.startDate?.toISOString() ?? null,
            endDate: this.endDate?.toISOString() ?? null
        }
    }

    static fromJSON(json: IUserArtifact) {
        return new UserArtifact(json.userId, json.artifactId, json.status, json.score,
            json.startDate ? new Date(json.startDate) : null,
            json.endDate ? new Date(json.endDate) : null
        );
    }
}