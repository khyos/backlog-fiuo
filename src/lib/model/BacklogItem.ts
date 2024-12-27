import { Artifact, ArtifactType } from "./Artifact";
import { Tag } from "./Tag";
import { Game } from "./game/Game";
import { Movie } from "./movie/Movie";

export class BacklogItem {
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

    serialize() {
        return {
            rank: this.rank,
            elo: this.elo,
            dateAdded: this.dateAdded,
            artifact: this.artifact.serialize(),
            tags: this.tags.map(tag => tag.serialize()),
        };
    }

    static deserialize(data: any): BacklogItem {
        let artifact: Artifact;
        if (data.artifact.type === ArtifactType.GAME) {
            artifact = Game.deserialize(data.artifact);
        } else if (data.artifact.type === ArtifactType.MOVIE) {
            artifact = Movie.deserialize(data.artifact);
        } else {
            artifact = Artifact.deserialize(data.artifact);
        }
        const tags = data.tags.map((tagData: any) => {
            return Tag.deserialize(tagData);
        });
        return new BacklogItem(data.rank, data.elo, data.dateAdded, artifact, tags);
    }
}