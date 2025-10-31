import { describe, expect, test } from 'vitest';
import { Genre, SERIALIZE_TYPE, type IGenre } from './Genre';

describe('Genre', () => {
    test('should create a genre with correct initial values', () => {
        const genre = new Genre(1, 'Action');
        
        expect(genre.id).toBe(1);
        expect(genre.title).toBe('Action');
    });

    test('should serialize to JSON', () => {
        const genre = new Genre(1, 'Action');
        const json = genre.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Action'
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Action'
        };

        const genre = Genre.fromJSON(json);

        expect(genre).toBeInstanceOf(Genre);
        expect(genre.id).toBe(1);
        expect(genre.title).toBe('Action');
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            id: 1,
            title: 'Action'
        };

        expect(() => Genre.fromJSON(json as IGenre)).toThrow('Invalid Type');
    });
});