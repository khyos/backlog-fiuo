export interface ISerializable {
    __type: string
}

export interface Serializable<T extends ISerializable> {
    toJSON(): T
}

export interface SerializableStatic<T extends ISerializable> {
    new(...args: any[]): Serializable<T>
    fromJSON(json: T | null): Serializable<T> | null
}