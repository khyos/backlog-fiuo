import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import { UserArtifactStatus } from "../UserArtifact";
import { type IAnimeEpisode, AnimeEpisode } from "./AnimeEpisode";

export const SERIALIZE_TYPE = 'Anime';

export interface IAnime extends IArtifact {
    children: IAnimeEpisode[]
    studio?: string
    source?: string
    status?: string
}

export class Anime extends Artifact implements Serializable<IAnime> {
    override children: AnimeEpisode[] = [];
    studio?: string;
    source?: string;
    status?: string;

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.ANIME;
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
        last: AnimeEpisode | null,
        next: AnimeEpisode | null
    } {
        const lastAndNextOnGoing: {
            last: AnimeEpisode | null,
            next: AnimeEpisode | null
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

    toJSON(): IAnime {
        return {
            ...super.toJSON(),
            __type: SERIALIZE_TYPE,
            studio: this.studio,
            source: this.source,
            status: this.status
        };
    }

    static fromJSON(data: IAnime): Anime {
        const artifactData = super.fromJSON(data);
        const anime = new Anime(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        anime.children = data.children.map((child) => {
            const episode = AnimeEpisode.fromJSON(child);
            episode.parent = anime;
            return episode;
        });
        anime.links = artifactData.links;
        anime.genres = artifactData.genres;
        anime.ratings = artifactData.ratings;
        anime.tags = artifactData.tags;
        anime.userInfo = artifactData.userInfo;
        anime.studio = data.studio;
        anime.source = data.source;
        anime.status = data.status;
        return anime;
    }
}