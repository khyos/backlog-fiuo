import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import type { Manga } from "./Manga";

export const SERIALIZE_TYPE = 'MangaVolume';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IMangaVolume extends IArtifact {
}

export class MangaVolume extends Artifact implements Serializable<IMangaVolume> {
    override parent: Manga | null;

    constructor(id: number, childIndex: number | null, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.MANGA_VOLUME;
        this.childIndex = childIndex;
        this.parent = null;
    }

    get numbering(): string | null {
        if (this.childIndex === null) return null;
        const value = this.childIndex < 10 ? `0${this.childIndex}` : this.childIndex;
        return `V${value}`;
    }

    computeMeanRating(): number | null {
        return null;
    }

    computeLastAndNextOngoing(): { last: Artifact | null; next: Artifact | null } {
        throw new Error('Not compatible with this Artifact');
    }

    toJSON(): IMangaVolume {
        return {
            ...super.toJSON(),
            __type: SERIALIZE_TYPE
        };
    }

    static fromJSON(data: IMangaVolume): MangaVolume {
        const artifactData = super.fromJSON(data);
        const volume = new MangaVolume(artifactData.id, artifactData.childIndex, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        volume.links = artifactData.links;
        volume.genres = artifactData.genres;
        volume.ratings = artifactData.ratings;
        volume.tags = artifactData.tags;
        volume.userInfo = artifactData.userInfo;
        return volume;
    }
}
