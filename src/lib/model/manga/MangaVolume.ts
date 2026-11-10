import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import { UserArtifactStatus } from "../UserArtifact";
import type { Manga } from "./Manga";
import { MangaChapter, type IMangaChapter } from "./MangaChapter";

export const SERIALIZE_TYPE = 'MangaVolume';

export interface IMangaVolume extends IArtifact {
    children: IMangaChapter[]
}

export class MangaVolume extends Artifact implements Serializable<IMangaVolume> {
    override children: MangaChapter[] = [];
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

    computeLastAndNextOngoing(): { last: MangaChapter | null; next: MangaChapter | null } {
        const result: { last: MangaChapter | null; next: MangaChapter | null } = { last: null, next: null };
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const nextChild = i < this.children.length - 1 ? this.children[i + 1] : null;
            if (child.userInfo?.status !== UserArtifactStatus.FINISHED) {
                return { last: null, next: child };
            }
            if (child.userInfo?.status === UserArtifactStatus.FINISHED) {
                result.last = child;
                if (nextChild?.userInfo?.status !== UserArtifactStatus.FINISHED) {
                    result.next = nextChild;
                    break;
                }
            }
        }
        return result;
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
        volume.children = (data.children ?? []).map(child => {
            const chapter = MangaChapter.fromJSON(child);
            chapter.parent = volume;
            return chapter;
        });
        volume.links = artifactData.links;
        volume.genres = artifactData.genres;
        volume.ratings = artifactData.ratings;
        volume.tags = artifactData.tags;
        volume.userInfo = artifactData.userInfo;
        return volume;
    }
}
