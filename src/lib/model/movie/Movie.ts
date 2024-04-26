import { Artifact, ArtifactType } from "../Artifact";

export class Movie extends Artifact {
    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date | null, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.MOVIE;
    }

    serialize() {
        return {
            ...super.serialize()
        }
    }

    static deserialize(data: any) : Movie {
        const artifactData = super.deserialize(data);
        const game = new Movie(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        game.links = artifactData.links;
        game.genres = artifactData.genres;
        game.ratings = artifactData.ratings;
        game.tags = artifactData.tags;
        return game;
    }
}