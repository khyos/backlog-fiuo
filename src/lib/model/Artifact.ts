import { Genre } from "./Genre";
import { Link } from "./Link";
import { Rating } from "./Rating";
import { Tag } from "./Tag";

export enum ArtifactType {
    GAME = 'game',
    MOVIE = 'movie'
}

export abstract class Artifact {
    id: number
    links: Link[] = []
    releaseDate: Date | null
    title: string
    type: ArtifactType
    duration: number
    genres: Genre[] = []
    ratings: Rating[] = []
    tags: Tag[] = []

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date | null, duration: number) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.releaseDate = releaseDate;
        this.duration = duration;
    }

    abstract getMeanRating(): number | null;

    serialize() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            releaseDate: this.releaseDate?.toISOString(),
            duration: this.duration,
            links: this.links.map(link => link.serialize()),
            genres: this.genres.map(genre => genre.serialize()),
            ratings: this.ratings.map(rating => rating.serialize()),
            meanRating: this.getMeanRating(),
            tags: this.tags.map(tag => tag.serialize())
        }
    }

    static deserialize(data: any): any {
        return {
            id: data.id,
            title: data.title,
            type: data.type,
            releaseDate: new Date(data.releaseDate),
            duration: data.duration,
            links: data.links.map((linkData: any) => {
                return Link.deserialize(linkData);
            }),
            genres: data.genres.map((genreData: any) => {
                return Genre.deserialize(genreData);
            }),
            ratings: data.ratings.map((ratingData: any) => {
                return Rating.deserialize(ratingData);
            }),
            tags: data.tags.map((tagData: any) => {
                return Tag.deserialize(tagData);
            })
        }
    }
}