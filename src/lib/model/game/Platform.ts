import type { ISerializable, Serializable } from "../Serializable"

export const SERIALIZE_TYPE = 'Platform';

export interface IPlatformDB {
    id: number
    title: string
}

export interface IPlatform extends ISerializable {
    id: number
    title: string
}

export class Platform implements Serializable<IPlatform> {
    id: number
    title: string

    constructor(id: number, title: string) {
        this.id = id;
        this.title = title;
    }
    
    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            title: this.title
        }
    }

    static fromJSON(json: IPlatform) {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new Platform(json.id, json.title);
    }
}
