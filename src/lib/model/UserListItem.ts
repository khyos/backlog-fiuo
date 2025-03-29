import { Artifact, ArtifactType, type IArtifact } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";
import { UserArtifact, UserArtifactStatus, type IUserArtifact } from "./UserArtifact";
import { Game, type IGame } from "./game/Game";
import { Movie } from "./movie/Movie";
import { Tvshow } from "./tvshow/Tvshow";

export const SERIALIZE_TYPE = 'UserListItem';

export interface IUserListItemDB {
    id: number
    title: string
    description?: string
    type: ArtifactType
    parent_artifact_id: number | null
    child_index: number | null
    duration: number
    releaseDate: string
    status: UserArtifactStatus
    score: number
    startDate: string
    endDate: string
}

export interface IUserListItem extends ISerializable {
    artifact: IArtifact;
    userArtifact: IUserArtifact;
}

export class UserListItem implements Serializable<IUserListItem> {
    artifact: Artifact;
    userArtifact: UserArtifact;

    constructor(artifact: Artifact, userArtifact: UserArtifact) {
        this.artifact = artifact;
        this.userArtifact = userArtifact;
    }

    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            artifact: this.artifact.toJSON(),
            userArtifact: this.userArtifact.toJSON()
        };
    }

    static fromJSON(json: IUserListItem): UserListItem {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        let artifact: Artifact;
        if (json.artifact.type === ArtifactType.GAME) {
            artifact = Game.fromJSON(json.artifact as IGame);
        } else if (json.artifact.type === ArtifactType.MOVIE) {
            artifact = Movie.fromJSON(json.artifact);
        } else if (json.artifact.type === ArtifactType.TVSHOW) {
            artifact = Tvshow.fromJSON(json.artifact);
        } else {
            throw new Error('Invalid Artifact Type');
        }
        const userArtifact = UserArtifact.fromJSON(json.userArtifact);
        return new UserListItem(artifact, userArtifact);
    }
}