export enum RatingType {
    IDMB = 'IDMB',
    METACRITIC = 'METACRITIC',
    OPENCRITIC = 'OPENCRITIC',
    ROTTEN_TOMATOES_CRITICS = 'ROTTEN_TOMATOES_CRITICS',
    ROTTEN_TOMATOES_AUDIENCE = 'ROTTEN_TOMATOES_AUDIENCE',
    SENSCRITIQUE = 'SENSCRITIQUE',
    STEAM = 'STEAM'
}

export class Rating {
    type: RatingType
    rating: number

    constructor(type: RatingType, rating: number) {
        this.type = type;
        this.rating = rating;
    }

    serialize() {
        return {
            type: this.type,
            rating: this.rating
        }
    }

    static deserialize(data: any) {
        return new Rating(data.type, data.rating);
    }
}