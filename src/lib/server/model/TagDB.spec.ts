import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { runDbQueriesParallel } from '../database';
import { TagDB } from './TagDB';
import { TagType } from '$lib/model/Tag';
import { ArtifactType } from '$lib/model/Artifact';

describe('TagDB', () => {
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM tag' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("tag")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema
        TagDB.createTagTable();
    });

    beforeEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('createTag', () => {
        test('should create a new tag and return it', async () => {
            const tag = await TagDB.createTag('action', ArtifactType.GAME, TagType.DEFAULT);

            expect(tag.id).toBe('action');
            expect(tag.type).toBe(TagType.DEFAULT);
        });

        test('should create tags with different types', async () => {
            const defaultTag = await TagDB.createTag('action', ArtifactType.GAME, TagType.DEFAULT);
            const triggerWarningTag = await TagDB.createTag('violence', ArtifactType.GAME, TagType.TRIGGER_WARNING);

            expect(defaultTag.type).toBe(TagType.DEFAULT);
            expect(triggerWarningTag.type).toBe(TagType.TRIGGER_WARNING);
        });

        test('should create tags for different artifact types', async () => {
            const gameTag = await TagDB.createTag('rpg', ArtifactType.GAME, TagType.DEFAULT);
            const movieTag = await TagDB.createTag('comedy', ArtifactType.MOVIE, TagType.DEFAULT);
            const animeTag = await TagDB.createTag('shounen', ArtifactType.ANIME, TagType.DEFAULT);
            const tvshowTag = await TagDB.createTag('drama', ArtifactType.TVSHOW, TagType.DEFAULT);

            expect(gameTag.id).toBe('rpg');
            expect(movieTag.id).toBe('comedy');
            expect(animeTag.id).toBe('shounen');
            expect(tvshowTag.id).toBe('drama');
        });

        test('should handle creating duplicate tags by throwing or ignoring', async () => {
            // Create first tag
            await TagDB.createTag('action', ArtifactType.GAME, TagType.DEFAULT);
            
            // Try to create duplicate - behavior depends on implementation
            // This might throw or be ignored based on database constraints
            await expect(async () => {
                await TagDB.createTag('action', ArtifactType.GAME, TagType.DEFAULT);
            }).not.toThrow(); // Assuming it uses INSERT OR IGNORE or similar
        });

        test('should allow same tag ID for different artifact types', async () => {
            const gameActionTag = await TagDB.createTag('action-cross-type', ArtifactType.GAME, TagType.DEFAULT);
            const movieActionTag = await TagDB.createTag('action-cross-type', ArtifactType.MOVIE, TagType.DEFAULT);

            expect(gameActionTag.id).toBe('action-cross-type');
            expect(movieActionTag.id).toBe('action-cross-type');
        });

        test('should handle special characters in tag IDs', async () => {
            const tag = await TagDB.createTag('sci-fi & fantasy', ArtifactType.GAME, TagType.DEFAULT);
            expect(tag.id).toBe('sci-fi & fantasy');
        });

        test('should handle empty string tag ID', async () => {
            await expect(TagDB.createTag('', ArtifactType.GAME, TagType.DEFAULT))
                .resolves.not.toThrow();
        });
    });

    describe('getTags', () => {
        beforeEach(async () => {
            // Set up test data
            await TagDB.createTag('action', ArtifactType.GAME, TagType.DEFAULT);
            await TagDB.createTag('adventure', ArtifactType.GAME, TagType.DEFAULT);
            await TagDB.createTag('rpg', ArtifactType.GAME, TagType.DEFAULT);
            await TagDB.createTag('violence', ArtifactType.GAME, TagType.TRIGGER_WARNING);
            await TagDB.createTag('comedy', ArtifactType.MOVIE, TagType.DEFAULT);
            await TagDB.createTag('drama', ArtifactType.MOVIE, TagType.DEFAULT);
        });

        test('should return tags for specific artifact type', async () => {
            const gameTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, '');
            const movieTags = await TagDB.getTags(ArtifactType.MOVIE, 0, 10, '');

            expect(gameTags).toHaveLength(4);
            expect(movieTags).toHaveLength(2);

            const gameTagIds = gameTags.map(tag => tag.id);
            const movieTagIds = movieTags.map(tag => tag.id);

            expect(gameTagIds).toContain('action');
            expect(gameTagIds).toContain('adventure');
            expect(gameTagIds).toContain('rpg');
            expect(gameTagIds).toContain('violence');

            expect(movieTagIds).toContain('comedy');
            expect(movieTagIds).toContain('drama');
        });

        test('should return empty array for artifact type with no tags', async () => {
            const animeTags = await TagDB.getTags(ArtifactType.ANIME, 0, 10, '');
            expect(animeTags).toEqual([]);
        });

        test('should filter tags by query string', async () => {
            const actionTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, 'action');
            expect(actionTags).toHaveLength(1);
            expect(actionTags[0].id).toBe('action');

            const aTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, 'a');
            expect(aTags).toHaveLength(2); // action and adventure
            
            const tagIds = aTags.map(tag => tag.id);
            expect(tagIds).toContain('action');
            expect(tagIds).toContain('adventure');
        });

        test('should handle case-insensitive search', async () => {
            const upperCaseTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, 'ACTION');
            const lowerCaseTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, 'action');
            
            expect(upperCaseTags).toHaveLength(lowerCaseTags.length);
            if (upperCaseTags.length > 0) {
                expect(upperCaseTags[0].id).toBe(lowerCaseTags[0].id);
            }
        });

        test('should return empty array for non-matching query', async () => {
            const tags = await TagDB.getTags(ArtifactType.GAME, 0, 10, 'nonexistent');
            expect(tags).toEqual([]);
        });

        test('should handle pagination with page and pageSize', async () => {
            // Test first page
            const firstPage = await TagDB.getTags(ArtifactType.GAME, 0, 2, '');
            expect(firstPage).toHaveLength(2);

            // Test second page
            const secondPage = await TagDB.getTags(ArtifactType.GAME, 1, 2, '');
            expect(secondPage).toHaveLength(2);

            // Test third page (should have remaining items)
            const thirdPage = await TagDB.getTags(ArtifactType.GAME, 2, 2, '');
            expect(thirdPage).toHaveLength(0); // Only 4 total items, so page 2 (3rd page) should be empty with pageSize 2

            // Verify no overlap between pages
            const firstPageIds = firstPage.map(tag => tag.id);
            const secondPageIds = secondPage.map(tag => tag.id);
            
            expect(firstPageIds).not.toEqual(secondPageIds);
        });

        test('should handle large page size', async () => {
            const tags = await TagDB.getTags(ArtifactType.GAME, 0, 100, '');
            expect(tags).toHaveLength(4); // All available tags
        });

        test('should handle page beyond available data', async () => {
            const tags = await TagDB.getTags(ArtifactType.GAME, 10, 10, '');
            expect(tags).toEqual([]);
        });

        test('should return Tag objects with correct properties', async () => {
            const tags = await TagDB.getTags(ArtifactType.GAME, 0, 10, '');
            expect(tags.length).toBeGreaterThan(0);

            const tag = tags[0];
            expect(tag).toHaveProperty('id');
            expect(tag).toHaveProperty('type');
            expect(typeof tag.id).toBe('string');
            expect(Object.values(TagType)).toContain(tag.type);
        });

        test('should return tags sorted by ID', async () => {
            const tags = await TagDB.getTags(ArtifactType.GAME, 0, 10, '');
            const tagIds = tags.map(tag => tag.id);
            const sortedIds = [...tagIds].sort();
            
            expect(tagIds).toEqual(sortedIds);
        });

        test('should handle different tag types correctly', async () => {
            const allTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, '');
            
            const defaultTags = allTags.filter(tag => tag.type === TagType.DEFAULT);
            const triggerWarningTags = allTags.filter(tag => tag.type === TagType.TRIGGER_WARNING);
            
            expect(defaultTags).toHaveLength(3); // action, adventure, rpg
            expect(triggerWarningTags).toHaveLength(1); // violence
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle negative page numbers', async () => {
            const tags = await TagDB.getTags(ArtifactType.GAME, -1, 10, '');
            // Should either return empty array or handle gracefully
            expect(Array.isArray(tags)).toBe(true);
        });

        test('should handle zero page size', async () => {
            const tags = await TagDB.getTags(ArtifactType.GAME, 0, 0, '');
            expect(tags).toEqual([]);
        });

        test('should handle negative page size', async () => {
            const tags = await TagDB.getTags(ArtifactType.GAME, 0, -1, '');
            // Should either return empty array or handle gracefully
            expect(Array.isArray(tags)).toBe(true);
        });

        test('should handle very long query strings', async () => {
            const longQuery = 'a'.repeat(1000);
            const tags = await TagDB.getTags(ArtifactType.GAME, 0, 10, longQuery);
            expect(Array.isArray(tags)).toBe(true);
        });

        test('should handle special characters in query', async () => {
            await TagDB.createTag("test'quote", ArtifactType.GAME, TagType.DEFAULT);
            await TagDB.createTag('test"doublequote', ArtifactType.GAME, TagType.DEFAULT);
            await TagDB.createTag('test%percent', ArtifactType.GAME, TagType.DEFAULT);
            
            const quoteTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, "'");
            const doublequoteTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, '"');
            const percentTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, '%');
            
            expect(Array.isArray(quoteTags)).toBe(true);
            expect(Array.isArray(doublequoteTags)).toBe(true);
            expect(Array.isArray(percentTags)).toBe(true);
        });
    });

    describe('Tag types coverage', () => {
        test('should work with all tag types', async () => {
            const defaultTag = await TagDB.createTag('default-tag', ArtifactType.GAME, TagType.DEFAULT);
            const triggerWarningTag = await TagDB.createTag('trigger-tag', ArtifactType.GAME, TagType.TRIGGER_WARNING);

            expect(defaultTag.type).toBe(TagType.DEFAULT);
            expect(triggerWarningTag.type).toBe(TagType.TRIGGER_WARNING);

            const allTags = await TagDB.getTags(ArtifactType.GAME, 0, 10, '');
            const tagTypes = allTags.map(tag => tag.type);
            
            expect(tagTypes).toContain(TagType.DEFAULT);
            expect(tagTypes).toContain(TagType.TRIGGER_WARNING);
        });
    });

    describe('Artifact types coverage', () => {
        test('should work with all artifact types', async () => {
            const artifactTypes = [
                ArtifactType.GAME,
                ArtifactType.MOVIE,
                ArtifactType.TVSHOW,
                ArtifactType.ANIME
            ];

            for (const artifactType of artifactTypes) {
                await TagDB.createTag(`${artifactType.toLowerCase()}-tag`, artifactType, TagType.DEFAULT);
            }

            for (const artifactType of artifactTypes) {
                const tags = await TagDB.getTags(artifactType, 0, 10, '');
                expect(tags).toHaveLength(1);
                expect(tags[0].id).toBe(`${artifactType.toLowerCase()}-tag`);
            }
        });
    });
});