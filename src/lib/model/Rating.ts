import type { ColorVariant } from "flowbite-svelte";
import type { ArtifactType } from "./Artifact";

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
        case RatingType.METACRITIC:
            if (rating >= 90) return "green";
            if (rating >= 80) return "indigo";
            if (rating >= 70) return "yellow";
            return "red";
        case RatingType.OPENCRITIC:
            if (rating >= 90) return "green";
            if (rating >= 80) return "indigo";
            if (rating >= 70) return "yellow";
            return "red";
        case RatingType.ROTTEN_TOMATOES_AUDIENCE:
            if (rating >= 90) return "green";
            if (rating >= 80) return "indigo";
            if (rating >= 70) return "yellow";
            return "red";
        case RatingType.ROTTEN_TOMATOES_CRITICS:
            if (rating >= 90) return "green";
            if (rating >= 80) return "indigo";
            if (rating >= 70) return "yellow";
            return "red";
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