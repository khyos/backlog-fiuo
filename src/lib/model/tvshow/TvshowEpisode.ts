import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import type { TvshowSeason } from "./TvshowSeason";

export const SERIALIZE_TYPE = 'TvshowEpisode';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ITvshowEpisode extends IArtifact {
}

export class TvshowEpisode extends Artifact implements Serializable<ITvshowEpisode> {
    override parent: TvshowSeason | null;

    constructor(id: number, childIndex: number | null, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.TVSHOW_EPISODE;
        this.childIndex = childIndex;
        this.parent = null;
    }

    get numbering(): string | null {
        if (this.childIndex === null) {
            return null;
        }
        const value = this.childIndex < 10 ? `0${this.childIndex}` : this.childIndex;
        return `${this.parent ? this.parent.numbering : ''}E${value}`;
    }

    computeMeanRating(): number | null {
        return null
    }

    computeLastAndNextOngoing(): { last: Artifact | null; next: Artifact | null; } {
        throw new Error('Not Compatible with this Artifact');
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