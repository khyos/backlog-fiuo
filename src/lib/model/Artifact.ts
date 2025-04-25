import { Genre, type IGenre } from "./Genre";
import { Link, type ILink } from "./Link";
import { Rating, type IRating } from "./Rating";
import type { ISerializable, Serializable } from "./Serializable";
import { Tag, type ITag } from "./Tag";
import { UserArtifact, UserArtifactStatus, type IUserArtifact } from "./UserArtifact";

export enum ArtifactType {
    COMICS = 'comics',
    GAME = 'game',
    MOVIE = 'movie',
    TVSHOW = 'tvshow',
    TVSHOW_SEASON = 'tvshow_season',
    TVSHOW_EPISODE = 'tvshow_episode'
}

export const SERIALIZE_TYPE = 'Artifact';

export interface IArtifactDB {
    id: number
    title: string
    description?: string
    type: ArtifactType
    parent_artifact_id: number | null
    child_index: number | null
    duration: number
    releaseDate: string
}

export interface IArtifact extends ISerializable {
    id: number
    links: ILink[]
    releaseDate: string
    title: string
    type: ArtifactType
    children: IArtifact[]
    childIndex: number | null
    duration: number
    genres: IGenre[]
    ratings: IRating[]
    meanRating: number | null
    tags: ITag[]
    userInfo: IUserArtifact | null
}

export abstract class Artifact implements Serializable<IArtifact> {
    id: number
    links: Link[] = []
    releaseDate: Date
    title: string
    type: ArtifactType
    parent: Artifact | null = null;
    children: Artifact[]
    childIndex: number | null
    duration: number
    genres: Genre[] = []
    ratings: Rating[] = []
    tags: Tag[] = []
    userInfo: UserArtifact | null

    protected _meanRating: number | null | undefined
    protected _lastAndNextOngoing: {
        last: Artifact | null,
        next: Artifact | null
    } | undefined

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.children = [];
        this.childIndex = null;
        this.releaseDate = releaseDate;
        this.duration = duration;
        this.userInfo = null;
    }

    abstract computeMeanRating(): number | null;

    get meanRating(): number | null {
        if (this._meanRating === undefined) {
            this._meanRating = this.computeMeanRating();
        }
        return this._meanRating;
    }

    abstract computeLastAndNextOngoing(): {
        last: Artifact | null,
        next: Artifact | null
    }

    get lastAndNextOngoing(): {
        last: Artifact | null,
        next: Artifact | null
    } {
        if (this._lastAndNextOngoing === undefined) {
            this._lastAndNextOngoing = this.computeLastAndNextOngoing();
        }
        return this._lastAndNextOngoing;
    }

    get numbering(): string | null {
        return null;
    }

    get rootParent(): Artifact {
        if (this.parent) {
            return this.parent.rootParent;
        }
        return this;
    }

    getArtifactIds(): number[] {
        const ids = [this.id];
        for (const child of this.children) {
            ids.push(...child.getArtifactIds());
        }
        return ids;
    }

    getArtifactById(artifactId: number): Artifact | null {
        if (this.id === artifactId) {
            return this;
        }
        for (const child of this.children) {
            const foundChild = child.getArtifactById(artifactId);
            if (foundChild) {
                return foundChild;
            }
        }
        return null;
    }

    setUserInfos(userInfos: { [k: number]: UserArtifact | null }) {
        this.userInfo = userInfos[this.id] ?? null;
        this.children.forEach(child => child.setUserInfos(userInfos));
    }

    copyUserInfos(fromArtifact: Artifact) {
        if (this.id != fromArtifact.id) {
            throw new Error('Incompatible Artifacts');
        }
        this.userInfo = fromArtifact.userInfo;
        for (const child of this.children) {
            const fromChild = fromArtifact.children.find(fromChild => fromChild.id === child.id);
            if (fromChild) {
                child.copyUserInfos(fromChild);
            }
        }
    }

    updateUserStatus(userStatus: UserArtifactStatus | null) {
        if (this.userInfo) {
            this.userInfo.status = userStatus;
        } else {
            this.userInfo = new UserArtifact(-1, this.id, userStatus, null, null, null);
        }
        if (userStatus === UserArtifactStatus.FINISHED) {
            for (const child of this.children) {
                child.updateUserStatus(userStatus);
            }
        }
    }

    updateUserScore(userScore: number | null) {
        if (this.userInfo) {
            this.userInfo.score = userScore;
        } else {
            this.userInfo = new UserArtifact(-1, this.id, null, userScore, null, null);
        }
    }

    updateUserStartDate(userStartDate: Date | null) {
        if (this.userInfo) {
            this.userInfo.startDate = userStartDate;
        } else {
            this.userInfo = new UserArtifact(-1, this.id, null, null, userStartDate, null);
        }
    }

    updateUserEndDate(userEndDate: Date | null) {
        if (this.userInfo) {
            this.userInfo.endDate = userEndDate;
        } else {
            this.userInfo = new UserArtifact(-1, this.id, null, null, null, userEndDate);
        }
    }

    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            title: this.title,
            type: this.type,
            children: this.children.map(child => child.toJSON()),
            childIndex: this.childIndex,
            releaseDate: this.releaseDate.toISOString(),
            duration: this.duration,
            links: this.links.map(link => link.toJSON()),
            genres: this.genres.map(genre => genre.toJSON()),
            ratings: this.ratings.map(rating => rating.toJSON()),
            meanRating: this.meanRating,
            tags: this.tags.map(tag => tag.toJSON()),
            userInfo: this.userInfo?.toJSON() ?? null
        }
    }

    static fromJSON(data: IArtifact) {
        return {
            id: data.id,
            title: data.title,
            type: data.type,
            childIndex: data.childIndex,
            releaseDate: new Date(data.releaseDate),
            duration: data.duration,
            links: data.links.map((linkData) => {
                return Link.fromJSON(linkData);
            }),
            genres: data.genres.map((genreData) => {
                return Genre.fromJSON(genreData);
            }),
            ratings: data.ratings.map((ratingData) => {
                return Rating.fromJSON(ratingData);
            }),
            meanRating: data.meanRating,
            tags: data.tags.map((tagData) => {
                return Tag.fromJSON(tagData);
            }),
            userInfo: data.userInfo ? UserArtifact.fromJSON(data.userInfo) : null
        }
    }
}