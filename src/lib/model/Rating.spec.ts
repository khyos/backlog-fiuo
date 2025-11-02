import { describe, expect, test } from 'vitest';
import { Rating, RatingType, SERIALIZE_TYPE, getRatingColor, getMeanRatingColor, type IRating } from './Rating';
import { ArtifactType } from './Artifact';

describe('Rating', () => {
    test('should create a rating with correct initial values', () => {
        const rating = new Rating(RatingType.METACRITIC, 85);
        
        expect(rating.type).toBe(RatingType.METACRITIC);
        expect(rating.rating).toBe(85);
    });

    test('should serialize to JSON', () => {
        const rating = new Rating(RatingType.METACRITIC, 85);
        const json = rating.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            type: RatingType.METACRITIC,
            rating: 85
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            type: RatingType.METACRITIC,
            rating: 85
        };

        const rating = Rating.fromJSON(json);

        expect(rating).toBeInstanceOf(Rating);
        expect(rating.type).toBe(RatingType.METACRITIC);
        expect(rating.rating).toBe(85);
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            type: RatingType.METACRITIC,
            rating: 85
        };

        expect(() => Rating.fromJSON(json as IRating)).toThrow('Invalid Type');
    });
});

describe('getRatingColor', () => {
    test('should return correct colors for MAL ratings', () => {
        expect(getRatingColor(ArtifactType.ANIME, RatingType.MAL, 90)).toBe('green');
        expect(getRatingColor(ArtifactType.ANIME, RatingType.MAL, 80)).toBe('indigo');
        expect(getRatingColor(ArtifactType.ANIME, RatingType.MAL, 70)).toBe('yellow');
        expect(getRatingColor(ArtifactType.ANIME, RatingType.MAL, 60)).toBe('red');
    });

    test('should return correct colors for SensCritique ratings', () => {
        expect(getRatingColor(ArtifactType.MOVIE, RatingType.SENSCRITIQUE, 80)).toBe('green');
        expect(getRatingColor(ArtifactType.MOVIE, RatingType.SENSCRITIQUE, 72)).toBe('indigo');
        expect(getRatingColor(ArtifactType.MOVIE, RatingType.SENSCRITIQUE, 65)).toBe('yellow');
        expect(getRatingColor(ArtifactType.MOVIE, RatingType.SENSCRITIQUE, 55)).toBe('red');
    });

    test('should return correct colors for Steam ratings', () => {
        expect(getRatingColor(ArtifactType.GAME, RatingType.STEAM, 96)).toBe('green');
        expect(getRatingColor(ArtifactType.GAME, RatingType.STEAM, 92)).toBe('indigo');
        expect(getRatingColor(ArtifactType.GAME, RatingType.STEAM, 87)).toBe('yellow');
        expect(getRatingColor(ArtifactType.GAME, RatingType.STEAM, 80)).toBe('red');
    });

    test('should return correct colors for other rating types', () => {
        expect(getRatingColor(ArtifactType.MOVIE, RatingType.METACRITIC, 95)).toBe('green');
        expect(getRatingColor(ArtifactType.MOVIE, RatingType.METACRITIC, 85)).toBe('indigo');
        expect(getRatingColor(ArtifactType.MOVIE, RatingType.METACRITIC, 75)).toBe('yellow');
        expect(getRatingColor(ArtifactType.MOVIE, RatingType.METACRITIC, 65)).toBe('red');
    });
});

describe('getMeanRatingColor', () => {
    test('should return correct colors for mean ratings', () => {
        expect(getMeanRatingColor(95)).toBe('green');
        expect(getMeanRatingColor(85)).toBe('indigo');
        expect(getMeanRatingColor(75)).toBe('yellow');
        expect(getMeanRatingColor(65)).toBe('red');
    });
});