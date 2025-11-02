import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import type { Serializable } from "../Serializable";
import type { TvshowEpisode } from "./TvshowEpisode";
import { TvshowSeason, type ITvshowSeason } from "./TvshowSeason";

export const SERIALIZE_TYPE = 'Tvshow';

export interface ITvshow extends IArtifact {
    children: ITvshowSeason[]
}

export class Tvshow extends Artifact implements Serializable<ITvshow> {
    override children: TvshowSeason[] = [];

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.TVSHOW;
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
        for (const child of this.children) {
            const childLastAndNextOnGoing = child.computeLastAndNextOngoing();
            if (childLastAndNextOnGoing.last) {
                lastAndNextOnGoing.last = childLastAndNextOnGoing.last;
            }
            if (childLastAndNextOnGoing.next) {
                lastAndNextOnGoing.next = childLastAndNextOnGoing.next;
            }
            if (lastAndNextOnGoing.last === null || lastAndNextOnGoing.next !== null) {
                break;
            }
        }
        this._lastAndNextOngoing = lastAndNextOnGoing;
        return lastAndNextOnGoing;
    }

    toJSON() {
        return {
            ...super.toJSON(),
             __type: SERIALIZE_TYPE
        }
    }

    static fromJSON(data: ITvshow) : Tvshow {
        const artifactData = super.fromJSON(data);
        const tvshow = new Tvshow(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        tvshow.children = data.children.map((child) => {
            const season = TvshowSeason.fromJSON(child);
            season.parent = tvshow;
            return season;
        });
        tvshow.links = artifactData.links;
        tvshow.genres = artifactData.genres;
        tvshow.ratings = artifactData.ratings;
        tvshow.tags = artifactData.tags;
        tvshow.userInfo = artifactData.userInfo;
        return tvshow;
    }
}