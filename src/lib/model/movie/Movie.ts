import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";

export const SERIALIZE_TYPE = 'Movie';

export interface IMovie extends IArtifact {
}

export class Movie extends Artifact implements Serializable<IMovie> {
    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.MOVIE;
    }

    computeMeanRating(): number | null {
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

    toJSON() {
        return {
            ...super.toJSON(),
             __type: SERIALIZE_TYPE
        }
    }

    static fromJSON(data: IMovie) : Movie {
        const artifactData = super.fromJSON(data);
        const movie = new Movie(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        movie.links = artifactData.links;
        movie.genres = artifactData.genres;
        movie.ratings = artifactData.ratings;
        movie.tags = artifactData.tags;
        return movie;
    }
}