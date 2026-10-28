import type { ISerializable, Serializable } from "./Serializable";
import { TierListItem, type ITierListItem } from "./TierListItem";

export const SERIALIZE_TYPE = 'Tier';

export interface ITier extends ISerializable {
    id: number;
    label: string;
    color: string;
    position: number;
    items: ITierListItem[];
}

export class Tier implements Serializable<ITier> {
    id: number;
    label: string;
    color: string;
    position: number;
    items: TierListItem[];

    constructor(id: number, label: string, color: string, position: number, items: TierListItem[] = []) {
        this.id = id;
        this.label = label;
        this.color = color;
        this.position = position;
        this.items = items;
    }

    toJSON(): ITier {
        return {
            __type: SERIALIZE_TYPE,
            id: this.id,
            label: this.label,
            color: this.color,
            position: this.position,
            items: this.items.map(item => item.toJSON()),
        };
    }

    static fromJSON(json: ITier): Tier {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new Tier(
            json.id,
            json.label,
            json.color,
            json.position,
            json.items.map(item => TierListItem.fromJSON(item))
        );
    }
}
