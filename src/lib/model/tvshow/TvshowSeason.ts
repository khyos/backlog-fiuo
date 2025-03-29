import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import { TvshowEpisode, type ITvshowEpisode } from "./TvshowEpisode";

export const SERIALIZE_TYPE = 'TvshowSeason';

export interface ITvshowSeason extends IArtifact {
    children: ITvshowEpisode[]
}

export class TvshowSeason extends Artifact implements Serializable<ITvshowSeason> {
    constructor(id: number, childIndex: number | null, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.TVSHOW_SEASON;
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

    static fromJSON(data: ITvshowSeason) : TvshowSeason {
        const artifactData = super.fromJSON(data);
        const tvshowSeason = new TvshowSeason(artifactData.id, artifactData.childIndex, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        tvshowSeason.children = data.children.map(child => TvshowEpisode.fromJSON(child));
        tvshowSeason.ratings = artifactData.ratings;
        tvshowSeason.userInfo = artifactData.userInfo;
        return tvshowSeason;
    }
}