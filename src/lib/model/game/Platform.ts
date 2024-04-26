export class Platform {
    id: number
    title: string

    constructor(id: number, title: string) {
        this.id = id;
        this.title = title;
    }
    
    serialize() {
        return {
            id: this.id,
            title: this.title
        }
    }

    static deserialize(data: any) {
        return new Platform(data.id, data.title);
    }
}
