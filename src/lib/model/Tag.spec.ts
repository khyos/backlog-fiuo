import { describe, expect, test } from 'vitest';
import { Tag, TagType, SERIALIZE_TYPE, type ITag } from './Tag';

describe('Tag', () => {
    test('should create a tag with correct initial values', () => {
        const tag = new Tag('action', TagType.DEFAULT);
        
        expect(tag.id).toBe('action');
        expect(tag.type).toBe(TagType.DEFAULT);
    });

    test('should serialize to JSON', () => {
        const tag = new Tag('action', TagType.DEFAULT);
        const json = tag.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 'action',
            type: TagType.DEFAULT
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 'action',
            type: TagType.DEFAULT
        };

        const tag = Tag.fromJSON(json);

        expect(tag).toBeInstanceOf(Tag);
        expect(tag.id).toBe('action');
        expect(tag.type).toBe(TagType.DEFAULT);
    });

    test('should handle trigger warning tag type', () => {
        const tag = new Tag('violence', TagType.TRIGGER_WARNING);
        expect(tag.type).toBe(TagType.TRIGGER_WARNING);

        const json = tag.toJSON();
        expect(json.type).toBe(TagType.TRIGGER_WARNING);

        const deserializedTag = Tag.fromJSON(json);
        expect(deserializedTag.type).toBe(TagType.TRIGGER_WARNING);
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            id: 'action',
            type: TagType.DEFAULT
        };

        expect(() => Tag.fromJSON(json as ITag)).toThrow('Invalid Type');
    });
});