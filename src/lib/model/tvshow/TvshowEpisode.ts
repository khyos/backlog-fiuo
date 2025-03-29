import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";

export const SERIALIZE_TYPE = 'TvshowEpisode';

export interface ITvshowEpisode extends IArtifact {
}

export class TvshowEpisode extends Artifact implements Serializable<ITvshowEpisode> {
    constructor(id: number, childIndex: number | null, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.TVSHOW_EPISODE;
        this.childIndex = childIndex;
    }

    computeMeanRating(): number | null {
        return null
    }

    toJSON() {
        return {
            ...super.toJSON(),
             __type: SERIALIZE_TYPE
        }
    }

    static fromJSON(data: ITvshowEpisode) : TvshowEpisode {
        const artifactData = super.fromJSON(data);
        const tvshowEpisode = new TvshowEpisode(artifactData.id, artifactData.childIndex, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        tvshowEpisode.ratings = artifactData.ratings;
        tvshowEpisode.userInfo = artifactData.userInfo;
        return tvshowEpisode;
    }
}