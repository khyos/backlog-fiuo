import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";

export const SERIALIZE_TYPE = 'MangaChapter';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IMangaChapter extends IArtifact {
}

export class MangaChapter extends Artifact implements Serializable<IMangaChapter> {
    constructor(id: number, childIndex: number | null, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.MANGA_CHAPTER;
        this.childIndex = childIndex;
        this.parent = null;
    }

    get numbering(): string | null {
        if (this.childIndex === null) {
            return null;
        }
        const value = this.childIndex < 10 ? `0${this.childIndex}` : this.childIndex;
        return `C${value}`;
    }

    computeMeanRating(): number | null {
        return null;
    }

    computeLastAndNextOngoing(): { last: Artifact | null; next: Artifact | null; } {
        throw new Error('Not Compatible with this Artifact');
    }

    toJSON(): IMangaChapter {
        return {
            ...super.toJSON(),
            __type: SERIALIZE_TYPE
        };
    }

    static fromJSON(data: IMangaChapter): MangaChapter {
        const artifactData = super.fromJSON(data);
        const chapter = new MangaChapter(artifactData.id, artifactData.childIndex, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        chapter.links = artifactData.links;
        chapter.genres = artifactData.genres;
        chapter.ratings = artifactData.ratings;
        chapter.tags = artifactData.tags;
        chapter.userInfo = artifactData.userInfo;
        return chapter;
    }
}
