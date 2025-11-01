import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";

export const SERIALIZE_TYPE = 'AnimeEpisode';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IAnimeEpisode extends IArtifact {
}

export class AnimeEpisode extends Artifact implements Serializable<IAnimeEpisode> {
    constructor(id: number, childIndex: number | null, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.ANIME_EPISODE;
        this.childIndex = childIndex;
        this.parent = null;
    }

    get numbering(): string | null {
        if (this.childIndex === null) {
            return null;
        }
        const value = this.childIndex < 10 ? `0${this.childIndex}` : this.childIndex;
        return `E${value}`;
    }

    computeMeanRating(): number | null {
        return null
    }

    computeLastAndNextOngoing(): { last: Artifact | null; next: Artifact | null; } {
        throw new Error('Not Compatible with this Artifact');
    }

    toJSON(): IAnimeEpisode {
        return {
            ...super.toJSON(),
            __type: SERIALIZE_TYPE
        };
    }

    static fromJSON(data: IAnimeEpisode): AnimeEpisode {
        const artifactData = super.fromJSON(data);
        const episode = new AnimeEpisode(artifactData.id, artifactData.childIndex, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        episode.links = artifactData.links;
        episode.genres = artifactData.genres;
        episode.ratings = artifactData.ratings;
        episode.tags = artifactData.tags;
        episode.userInfo = artifactData.userInfo;
        return episode;
    }
}