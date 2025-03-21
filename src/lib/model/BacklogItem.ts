import { Artifact, ArtifactType, type IArtifact } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";
import { Tag, type ITag } from "./Tag";
import { Game, type IGame } from "./game/Game";
import { Movie } from "./movie/Movie";

export const SERIALIZE_TYPE = 'BacklogItem';

export interface IBacklogItemDB {
    id: number
    title: string
}

export interface IBacklogItem extends ISerializable {
    rank: number;
    elo: number;
    dateAdded: number;
    artifact: IArtifact;
    tags: ITag[];
}

export class BacklogItem implements Serializable<IBacklogItem> {
    rank: number;
    elo: number;
    dateAdded: number;
    artifact: Artifact;
    tags: Tag[];

    constructor(rank: number, elo: number, dateAdded: number, artifact: Artifact, tags: Tag[]) {
        this.rank = rank;
        this.elo = elo;
        this.dateAdded = dateAdded;
        this.artifact = artifact;
        this.tags = tags;
    }

    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            rank: this.rank,
            elo: this.elo,
            dateAdded: this.dateAdded,
            artifact: this.artifact.toJSON(),
            tags: this.tags.map(tag => tag.toJSON()),
        };
    }

    static fromJSON(json: IBacklogItem): BacklogItem {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        let artifact: Artifact;
        if (json.artifact.type === ArtifactType.GAME) {
            artifact = Game.fromJSON(json.artifact as IGame);
        } else if (json.artifact.type === ArtifactType.MOVIE) {
            artifact = Movie.fromJSON(json.artifact);
        } else {
            artifact = Artifact.fromJSON(json.artifact);
        }
        const tags = json.tags.map((tagData) => {
            return Tag.fromJSON(tagData);
        });
        return new BacklogItem(json.rank, json.elo, json.dateAdded, artifact, tags);
    }
}