import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import { TvshowSeason, type ITvshowSeason } from "./TvshowSeason";

export const SERIALIZE_TYPE = 'Tvshow';

export interface ITvshow extends IArtifact {
    children: ITvshowSeason[]
}

export class Tvshow extends Artifact implements Serializable<ITvshow> {
    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.TVSHOW;
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

    static fromJSON(data: ITvshow) : Tvshow {
        const artifactData = super.fromJSON(data);
        const tvshow = new Tvshow(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        tvshow.children = data.children.map(child => TvshowSeason.fromJSON(child));
        tvshow.links = artifactData.links;
        tvshow.genres = artifactData.genres;
        tvshow.ratings = artifactData.ratings;
        tvshow.tags = artifactData.tags;
        tvshow.userInfo = artifactData.userInfo;
        return tvshow;
    }
}