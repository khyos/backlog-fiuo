import type { ColorVariant } from "flowbite-svelte";
import type { ArtifactType } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";

export enum RatingType {
    METACRITIC = 'METACRITIC',
    OPENCRITIC = 'OPENCRITIC',
    ROTTEN_TOMATOES_AUDIENCE = 'ROTTEN_TOMATOES_AUDIENCE',
    ROTTEN_TOMATOES_CRITICS = 'ROTTEN_TOMATOES_CRITICS',
    SENSCRITIQUE = 'SENSCRITIQUE',
    STEAM = 'STEAM'
}

export function getRatingColor(artifactType: ArtifactType, ratingType: RatingType, rating: number): ColorVariant {
    switch (ratingType) {
        case RatingType.SENSCRITIQUE:
            if (rating >= 75) return "green";
            if (rating >= 70) return "indigo";
            if (rating >= 60) return "yellow";
            return "red";
        case RatingType.STEAM:
            if (rating >= 95) return "green";
            if (rating >= 90) return "indigo";
            if (rating >= 85) return "yellow";
            return "red";
        case RatingType.METACRITIC:
        case RatingType.OPENCRITIC:
        case RatingType.ROTTEN_TOMATOES_AUDIENCE:
        case RatingType.ROTTEN_TOMATOES_CRITICS:
        default:
            if (rating >= 90) return "green";
            if (rating >= 80) return "indigo";
            if (rating >= 70) return "yellow";
            return "red";
    }
}

export function getMeanRatingColor(rating: number) {
    if (rating >= 90) return "green";
    if (rating >= 80) return "indigo";
    if (rating >= 70) return "yellow";
    return "red";
}

export const SERIALIZE_TYPE = 'Rating';

export interface IRatingDB {
    type: RatingType
    rating: number
}

export interface IRating extends ISerializable {
    type: RatingType
    rating: number
}

export class Rating implements Serializable<IRating> {
    type: RatingType
    rating: number

    constructor(type: RatingType, rating: number) {
        this.type = type;
        this.rating = rating;
    }

    toJSON() {
        return {
            __type: SERIALIZE_TYPE,
            type: this.type,
            rating: this.rating
        }
    }

    static fromJSON(json: IRating) {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new Rating(json.type, json.rating);
    }
}