import type { ISerializable, Serializable } from "./Serializable";

export const SERIALIZE_TYPE = 'Genre';

export interface IGenreDB {
    id: number
    title: string
}

export interface IGenre extends ISerializable {
    id: number
    title: string
}

export class Genre implements Serializable<IGenre> {
    id: number
    title: string

    constructor(id: number, title: string) {
        this.id = id;
        this.title = title;
    }

    toJSON(): IGenre {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            title: this.title
        }
    }

    static fromJSON(json: IGenre) {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new Genre(json.id, json.title);
    }
}