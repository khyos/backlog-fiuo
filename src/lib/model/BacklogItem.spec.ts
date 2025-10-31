import { describe, expect, test } from 'vitest';
import { BacklogItem, SERIALIZE_TYPE, type IBacklogItem } from './BacklogItem';
import { Movie } from './movie/Movie';
import { ArtifactType } from './Artifact';
import { Tag, TagType } from './Tag';

describe('BacklogItem', () => {
    const currentDate = new Date('2025-01-01');
    const movie = new Movie(1, 'Test Movie', ArtifactType.MOVIE, currentDate, 120);
    const tag1 = new Tag('tag1', TagType.DEFAULT);
    const tag2 = new Tag('tag2', TagType.DEFAULT);
    const dateAdded = Date.now();

    test('should create a backlog item with correct initial values', () => {
        const backlogItem = new BacklogItem(1, 1000, dateAdded, movie, [tag1, tag2]);

        expect(backlogItem.rank).toBe(1);
        expect(backlogItem.elo).toBe(1000);
        expect(backlogItem.dateAdded).toBe(dateAdded);
        expect(backlogItem.artifact).toBe(movie);
        expect(backlogItem.tags).toEqual([tag1, tag2]);
    });

    test('should serialize to JSON', () => {
        const backlogItem = new BacklogItem(1, 1000, dateAdded, movie, [tag1, tag2]);
        const json = backlogItem.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            rank: 1,
            elo: 1000,
            dateAdded: dateAdded,
            artifact: movie.toJSON(),
            tags: [tag1.toJSON(), tag2.toJSON()]
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            rank: 1,
            elo: 1000,
            dateAdded: dateAdded,
            artifact: {
                __type: 'Movie',
                id: 1,
                title: 'Test Movie',
                type: ArtifactType.MOVIE,
                children: [],
                childIndex: null,
                releaseDate: currentDate.toISOString(),
                duration: 120,
                links: [],
                genres: [],
                ratings: [],
                meanRating: null,
                tags: [],
                userInfo: null
            },
            tags: [
                {
                    __type: 'Tag',
                    id: 'tag1',
                    type: TagType.DEFAULT
                },
                {
                    __type: 'Tag',
                    id: 'tag2',
                    type: TagType.DEFAULT
                }
            ]
        };

        const backlogItem = BacklogItem.fromJSON(json);

        expect(backlogItem).toBeInstanceOf(BacklogItem);
        expect(backlogItem.rank).toBe(1);
        expect(backlogItem.elo).toBe(1000);
        expect(backlogItem.dateAdded).toBe(dateAdded);
        expect(backlogItem.artifact).toBeInstanceOf(Movie);
        expect(backlogItem.artifact.title).toBe('Test Movie');
        expect(backlogItem.tags).toHaveLength(2);
        expect(backlogItem.tags[0]).toBeInstanceOf(Tag);
        expect(backlogItem.tags[0].id).toBe('tag1');
        expect(backlogItem.tags[1].id).toBe('tag2');
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            rank: 1,
            elo: 1000,
            dateAdded: dateAdded,
            artifact: movie.toJSON(),
            tags: [tag1.toJSON(), tag2.toJSON()]
        };

        expect(() => BacklogItem.fromJSON(json as IBacklogItem)).toThrow('Invalid Type');
    });
});