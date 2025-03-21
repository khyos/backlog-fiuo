import type { ISerializable, Serializable } from "./Serializable";

export enum TagType {
    DEFAULT = 'DEFAULT',
    TRIGGER_WARNING = 'TRIGGER_WARNING'
}

export const SERIALIZE_TYPE = 'Tag';

export interface ITagDB {
    id: string
    type: TagType
}

export interface ITag extends ISerializable {
    id: string
    type: TagType
}

export class Tag implements Serializable<ITag> {
    id: string
    type: TagType

    constructor(id: string, type: TagType) {
        this.id = id;
        this.type = type;
    }

    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            type: this.type
        }
    }

    static fromJSON(json: ITag) {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new Tag(json.id, json.type);
    }
}