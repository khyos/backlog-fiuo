export enum TagType {
    DEFAULT = 'DEFAULT',
    TRIGGER_WARNING = 'TRIGGER_WARNING'
}

export class Tag {
    id: string
    type: TagType

    constructor(id: string, type: TagType) {
        this.id = id;
        this.type = type;
    }

    serialize() {
        return {
            id: this.id,
            type: this.type
        }
    }

    static deserialize(data: any) {
        return new Tag(data.id, data.type);
    }
}