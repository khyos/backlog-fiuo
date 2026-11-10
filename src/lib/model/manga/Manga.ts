import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import { UserArtifactStatus } from "../UserArtifact";
import { type IMangaChapter, MangaChapter } from "./MangaChapter";

export const SERIALIZE_TYPE = 'Manga';

export interface IManga extends IArtifact {
    children: IMangaChapter[]
    volumes?: number
    chapters?: number
    authors?: string
}

export class Manga extends Artifact implements Serializable<IManga> {
    override children: MangaChapter[] = [];
    volumes?: number;
    chapters?: number;
    authors?: string;

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number, status?: string | null) {
        super(id, title, type, releaseDate, duration, status);
        this.type = ArtifactType.MANGA;
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
        const lastAndNextOnGoing: {
            last: MangaChapter | null,
            next: MangaChapter | null
        } = {
            last: null,
            next: null
        };
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const nextChild = i < this.children.length - 1 ? this.children[i + 1] : null;
            if (child.userInfo?.status !== UserArtifactStatus.FINISHED) {
                return {
                    last: null,
                    next: child
                }
            }
            if (child.userInfo?.status === UserArtifactStatus.FINISHED) {
                lastAndNextOnGoing.last = child;
                if (nextChild?.userInfo?.status !== UserArtifactStatus.FINISHED) {
                    lastAndNextOnGoing.next = nextChild;
                    break;
                }
            }
        }
        return lastAndNextOnGoing;
    }

    toJSON(): IManga {
        return {
            ...super.toJSON(),
            __type: SERIALIZE_TYPE,
            volumes: this.volumes,
            chapters: this.chapters,
            authors: this.authors,
            status: this.status
        };
    }

    static fromJSON(data: IManga): Manga {
        const artifactData = super.fromJSON(data);
        const manga = new Manga(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration, artifactData.status);
        manga.children = data.children.map((child) => {
            const chapter = MangaChapter.fromJSON(child);
            chapter.parent = manga;
            return chapter;
        });
        manga.links = artifactData.links;
        manga.genres = artifactData.genres;
        manga.ratings = artifactData.ratings;
        manga.tags = artifactData.tags;
        manga.userInfo = artifactData.userInfo;
        manga.volumes = data.volumes;
        manga.chapters = data.chapters;
        manga.authors = data.authors;
        manga.status = data.status ?? null;
        return manga;
    }
}
