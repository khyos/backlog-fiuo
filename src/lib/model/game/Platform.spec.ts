import { describe, expect, test } from 'vitest';
import { Platform, SERIALIZE_TYPE } from './Platform';

describe('Platform', () => {
    test('should create a platform with correct initial values', () => {
        const platform = new Platform(1, 'PlayStation 5');
        
        expect(platform.id).toBe(1);
        expect(platform.title).toBe('PlayStation 5');
    });

    test('should serialize to JSON', () => {
        const platform = new Platform(1, 'PlayStation 5');
        
        const json = platform.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'PlayStation 5'
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'PlayStation 5'
        };

        const platform = Platform.fromJSON(json);

        expect(platform).toBeInstanceOf(Platform);
        expect(platform.id).toBe(1);
        expect(platform.title).toBe('PlayStation 5');
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            id: 1,
            title: 'PlayStation 5'
        };

        expect(() => Platform.fromJSON(json)).toThrow('Invalid Type');
    });
});