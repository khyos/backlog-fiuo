import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import { UserArtifactStatus } from "../UserArtifact";
import type { Tvshow } from "./Tvshow";
import { TvshowEpisode, type ITvshowEpisode } from "./TvshowEpisode";

export const SERIALIZE_TYPE = 'TvshowSeason';

export interface ITvshowSeason extends IArtifact {
    children: ITvshowEpisode[]
}

export class TvshowSeason extends Artifact implements Serializable<ITvshowSeason> {
    override children: TvshowEpisode[] = [];
    override parent: Tvshow | null;

    constructor(id: number, childIndex: number | null, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.TVSHOW_SEASON;
        this.childIndex = childIndex;
        this.parent = null;
    }

    get numbering(): string | null {
        if (this.childIndex === null) {
            return null;
        }
        const value = this.childIndex < 10 ? `0${this.childIndex}` : this.childIndex;
        return `S${value}`;
    }

    computeMeanRating(): number | null {
        return null
    }

    computeLastAndNextOngoing(): {
        last: TvshowEpisode | null,
        next: TvshowEpisode | null
    } {
        const lastAndNextOnGoing: {
            last: TvshowEpisode | null,
            next: TvshowEpisode | null
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

    toJSON() {
        return {
            ...super.toJSON(),
             __type: SERIALIZE_TYPE
        }
    }

    static fromJSON(data: ITvshowSeason) : TvshowSeason {
        const artifactData = super.fromJSON(data);
        const tvshowSeason = new TvshowSeason(artifactData.id, artifactData.childIndex, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        tvshowSeason.children = data.children.map((child) => {
            const episode = TvshowEpisode.fromJSON(child);
            episode.parent = tvshowSeason;
            return episode;
        });
        tvshowSeason.ratings = artifactData.ratings;
        tvshowSeason.userInfo = artifactData.userInfo;
        return tvshowSeason;
    }
}