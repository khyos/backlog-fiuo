import { Artifact, ArtifactType } from "../Artifact";

export class Movie extends Artifact {
    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date | null, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.MOVIE;
    }

    getMeanRating(): number | null {
        let nbOfRatings = 0;
        let meanRating = 0;
        for (const rating of this.ratings) {
            if (rating.rating != null) {
                meanRating += rating.rating;
                nbOfRatings++;
            }
        }

        return nbOfRatings > 0 ? meanRating / nbOfRatings : null;
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