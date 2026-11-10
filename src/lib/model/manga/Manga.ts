import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import { UserArtifactStatus } from "../UserArtifact";
import { type IMangaChapter, MangaChapter } from "./MangaChapter";
import { MangaVolume, type IMangaVolume } from "./MangaVolume";

export const SERIALIZE_TYPE = 'Manga';

export interface IManga extends IArtifact {
    children: (IMangaVolume | IMangaChapter)[]
    volumeCount?: number
    chapterCount?: number
    authors?: string
}

export class Manga extends Artifact implements Serializable<IManga> {
    /** Direct children: MangaVolume items and/or standalone MangaChapter items. */
    override children: Array<MangaVolume | MangaChapter> = [];
    volumeCount?: number;
    chapterCount?: number;
    authors?: string;

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number, status?: string | null) {
        super(id, title, type, releaseDate, duration, status);
        this.type = ArtifactType.MANGA;
    }

    /** Volumes that are direct children of this manga. */
    get volumes(): MangaVolume[] {
        return this.children.filter((c): c is MangaVolume => c instanceof MangaVolume);
    }

    /** Chapters that are direct children of this manga (not inside a volume). */
    get standaloneChapters(): MangaChapter[] {
        return this.children.filter((c): c is MangaChapter => c instanceof MangaChapter);
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

    computeLastAndNextOngoing(): {
        last: MangaChapter | null,
        next: MangaChapter | null
    } {
        // Collect all chapters in reading order: chapters from volumes first, then standalone chapters.
        const allChapters: MangaChapter[] = [
            ...this.volumes.flatMap(v => v.children),
            ...this.standaloneChapters
        ];
        const result: { last: MangaChapter | null; next: MangaChapter | null } = { last: null, next: null };
        for (let i = 0; i < allChapters.length; i++) {
            const child = allChapters[i];
            const nextChild = i < allChapters.length - 1 ? allChapters[i + 1] : null;
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

    toJSON(): IManga {
        return {
            ...super.toJSON(),
            __type: SERIALIZE_TYPE,
            volumeCount: this.volumeCount,
            chapterCount: this.chapterCount,
            authors: this.authors,
            status: this.status
        };
    }

    static fromJSON(data: IManga): Manga {
        const artifactData = super.fromJSON(data);
        const manga = new Manga(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration, artifactData.status);
        manga.children = (data.children ?? []).map((child) => {
            if (child.type === ArtifactType.MANGA_VOLUME) {
                const volume = MangaVolume.fromJSON(child as IMangaVolume);
                volume.parent = manga;
                return volume;
            } else {
                const chapter = MangaChapter.fromJSON(child as IMangaChapter);
                chapter.parent = manga;
                return chapter;
            }
        });
        manga.links = artifactData.links;
        manga.genres = artifactData.genres;
        manga.ratings = artifactData.ratings;
        manga.tags = artifactData.tags;
        manga.userInfo = artifactData.userInfo;
        manga.volumeCount = data.volumeCount;
        manga.chapterCount = data.chapterCount;
        manga.authors = data.authors;
        manga.status = data.status ?? null;
        return manga;
    }
}
