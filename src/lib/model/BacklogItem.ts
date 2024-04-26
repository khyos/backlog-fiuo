import { Artifact, ArtifactType } from "./Artifact";
import { Tag } from "./Tag";
import { Game } from "./game/Game";
import { Movie } from "./movie/Movie";

export class BacklogItem {
    rank: number;
    artifact: Artifact;
    tags: Tag[];

    constructor(rank: number, artifact: Artifact, tags: Tag[]) {
        this.rank = rank;
        this.artifact = artifact;
        this.tags = tags;
    }

    serialize() {
        return {
            rank: this.rank,
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
        return new BacklogItem(data.rank, artifact, tags);
    }
}