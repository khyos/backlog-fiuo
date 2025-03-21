import { Genre, type IGenre } from "./Genre";
import { Link, type ILink } from "./Link";
import { Rating, type IRating } from "./Rating";
import type { ISerializable, Serializable } from "./Serializable";
import { Tag, type ITag } from "./Tag";

export enum ArtifactType {
    GAME = 'game',
    MOVIE = 'movie'
}

export const SERIALIZE_TYPE = 'Artifact';

export interface IArtifactDB {
    id: number,
    title: string,
    description?: string,
    type: ArtifactType,
    duration: number,
    releaseDate: string
}

export interface IArtifact extends ISerializable {
    id: number
    links: ILink[]
    releaseDate: string
    title: string
    type: ArtifactType
    duration: number
    genres: IGenre[]
    ratings: IRating[]
    meanRating: number | null
    tags: ITag[]
}

export abstract class Artifact implements Serializable<IArtifact> {
    id: number
    links: Link[] = []
    releaseDate: Date
    title: string
    type: ArtifactType
    duration: number
    genres: Genre[] = []
    ratings: Rating[] = []
    tags: Tag[] = []

    private _meanRating: number | null | undefined

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.releaseDate = releaseDate;
        this.duration = duration;
    }

    abstract computeMeanRating(): number | null;

    get meanRating(): number | null {
        if (this._meanRating === undefined) {
            this._meanRating = this.computeMeanRating();
        }
        return this._meanRating;
    }

    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            title: this.title,
            type: this.type,
            releaseDate: this.releaseDate.toISOString(),
            duration: this.duration,
            links: this.links.map(link => link.toJSON()),
            genres: this.genres.map(genre => genre.toJSON()),
            ratings: this.ratings.map(rating => rating.toJSON()),
            meanRating: this.meanRating,
            tags: this.tags.map(tag => tag.toJSON())
        }
    }

    static fromJSON(data: IArtifact) {
        return {
            id: data.id,
            title: data.title,
            type: data.type,
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
            })
        }
    }
}