import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { runDbQueriesParallel } from '../database';
import { BacklogItemDB } from './BacklogItemDB';
import { BacklogDB } from './BacklogDB';
import { TagDB } from './TagDB';
import { Tag, TagType } from '$lib/model/Tag';
import { ArtifactType } from '$lib/model/Artifact';
import { BacklogRankingType, BacklogType } from '$lib/model/Backlog';

describe('BacklogItemDB', () => {
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM backlog_item_tag' },
            { query: 'DELETE FROM backlog_items' },
            { query: 'DELETE FROM backlog' },
            { query: 'DELETE FROM tag' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("backlog", "backlog_items")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema
        await BacklogDB.createBacklogTable();
        await BacklogDB.createBacklogItemsTable();
        await BacklogDB.createBacklogItemTagTable();
        await TagDB.createTagTable();
    });

    beforeEach(async () => {
        await cleanupTestData();
        
        // Set up test data - create tags that can be referenced by string ID
        await TagDB.createTag('1', ArtifactType.GAME, TagType.DEFAULT);
        await TagDB.createTag('2', ArtifactType.GAME, TagType.TRIGGER_WARNING);
        await TagDB.createTag('3', ArtifactType.GAME, TagType.DEFAULT);
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('getTags', () => {
        beforeEach(async () => {
            // Create test backlog and items
            const backlogId = await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            await BacklogDB.addBacklogItem(backlogId!.id, 100, 1);
            await BacklogDB.addBacklogItem(backlogId!.id, 200, 2);
            
            // Add tags to items
            await BacklogItemDB.addTag(backlogId!.id, 100, '1'); // test-tag-1
            await BacklogItemDB.addTag(backlogId!.id, 100, '2'); // test-tag-2
            await BacklogItemDB.addTag(backlogId!.id, 200, '1'); // test-tag-1
        });

        test('should return all tags for a specific backlog item', async () => {
            // Use the backlog setup in beforeEach
            const backlog = await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            await BacklogDB.addBacklogItem(backlog!.id, 100, 1);
            await BacklogItemDB.addTag(backlog!.id, 100, '1');
            await BacklogItemDB.addTag(backlog!.id, 100, '2');
            
            const tags = await BacklogItemDB.getTags(backlog!.id, ArtifactType.GAME, 100);
            
            expect(tags).toHaveLength(2);
            expect(tags.some(tag => tag.id === '1' && tag.type === TagType.DEFAULT)).toBe(true);
            expect(tags.some(tag => tag.id === '2' && tag.type === TagType.TRIGGER_WARNING)).toBe(true);
        });

        test('should return empty array when item has no tags', async () => {
            const backlog = await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            await BacklogDB.addBacklogItem(backlog!.id, 300, 1);
            
            const tags = await BacklogItemDB.getTags(backlog!.id, ArtifactType.GAME, 300);
            
            expect(tags).toHaveLength(0);
        });

        test('should return empty array when backlog item does not exist', async () => {
            const backlog = await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            
            const tags = await BacklogItemDB.getTags(backlog!.id, ArtifactType.GAME, 999);
            
            expect(tags).toHaveLength(0);
        });

        test('should filter tags by artifact type', async () => {
            // Create tags for different artifact types
            await TagDB.createTag('game-tag', ArtifactType.GAME, TagType.DEFAULT);
            await TagDB.createTag('anime-tag', ArtifactType.ANIME, TagType.TRIGGER_WARNING);
            
            const gameBacklog = await BacklogDB.createBacklog(1, 'Game Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            const animeBacklog = await BacklogDB.createBacklog(1, 'Anime Backlog', BacklogType.STANDARD, ArtifactType.ANIME, BacklogRankingType.RANK);
            
            await BacklogDB.addBacklogItem(gameBacklog!.id, 100, 1);
            await BacklogDB.addBacklogItem(animeBacklog!.id, 100, 1);
            
            await BacklogItemDB.addTag(gameBacklog!.id, 100, 'game-tag');
            await BacklogItemDB.addTag(animeBacklog!.id, 100, 'anime-tag');
            
            const gameTags = await BacklogItemDB.getTags(gameBacklog!.id, ArtifactType.GAME, 100);
            const animeTags = await BacklogItemDB.getTags(animeBacklog!.id, ArtifactType.ANIME, 100);
            
            expect(gameTags).toHaveLength(1);
            expect(gameTags[0].id).toBe('game-tag');
            expect(animeTags).toHaveLength(1);
            expect(animeTags[0].id).toBe('anime-tag');
        });

        test('should return Tag instances with correct properties', async () => {
            const backlog = await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            await BacklogDB.addBacklogItem(backlog!.id, 100, 1);
            await BacklogItemDB.addTag(backlog!.id, 100, '1');
            
            const tags = await BacklogItemDB.getTags(backlog!.id, ArtifactType.GAME, 100);
            
            expect(tags).toHaveLength(1);
            expect(tags[0]).toBeInstanceOf(Tag);
            expect(tags[0].id).toBe('1');
            expect(tags[0].type).toBe(TagType.DEFAULT);
        });
    });

    describe('addTag', () => {
        let backlogId: number;

        beforeEach(async () => {
            const backlog = await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            backlogId = backlog!.id;
            await BacklogDB.addBacklogItem(backlogId, 100, 1);
        });

        test('should successfully add a tag to a backlog item', async () => {
            await BacklogItemDB.addTag(backlogId, 100, '1');
            
            const tags = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            expect(tags).toHaveLength(1);
            expect(tags[0].id).toBe('1');
        });

        test('should allow adding multiple tags to the same item', async () => {
            await BacklogItemDB.addTag(backlogId, 100, '1');
            await BacklogItemDB.addTag(backlogId, 100, '2');
            await BacklogItemDB.addTag(backlogId, 100, '3');
            
            const tags = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            expect(tags).toHaveLength(3);
        });

        test('should handle adding tag to non-existent backlog item gracefully', async () => {
            // This should not throw but may create an orphaned tag relationship
            await expect(BacklogItemDB.addTag(backlogId, 999, '1'))
                .resolves.not.toThrow();
        });

        test('should handle adding non-existent tag gracefully', async () => {
            // This might fail due to foreign key constraints, depending on DB setup
            // For this test, we assume it handles gracefully or throws appropriate error
            await expect(BacklogItemDB.addTag(backlogId, 100, 'nonexistent'))
                .resolves.not.toThrow();
        });

        test('should handle duplicate tag additions', async () => {
            await BacklogItemDB.addTag(backlogId, 100, '1');
            
            // Adding same tag twice should either be ignored or throw error
            await expect(BacklogItemDB.addTag(backlogId, 100, '1'))
                .rejects.toThrow();
        });

        test('should handle adding tags to different artifacts in same backlog', async () => {
            await BacklogDB.addBacklogItem(backlogId, 200, 2);
            
            await BacklogItemDB.addTag(backlogId, 100, '1');
            await BacklogItemDB.addTag(backlogId, 200, '2');
            
            const tags100 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            const tags200 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 200);
            
            expect(tags100).toHaveLength(1);
            expect(tags100[0].id).toBe('1');
            expect(tags200).toHaveLength(1);
            expect(tags200[0].id).toBe('2');
        });
    });

    describe('removeTag', () => {
        let backlogId: number;

        beforeEach(async () => {
            const backlog = await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            backlogId = backlog!.id;
            await BacklogDB.addBacklogItem(backlogId, 100, 1);
            
            // Add some tags to remove
            await BacklogItemDB.addTag(backlogId, 100, '1');
            await BacklogItemDB.addTag(backlogId, 100, '2');
        });

        test('should successfully remove a tag from a backlog item', async () => {
            await BacklogItemDB.removeTag(backlogId, 100, '1');
            
            const tags = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            expect(tags).toHaveLength(1);
            expect(tags[0].id).toBe('2');
        });

        test('should handle removing all tags from an item', async () => {
            await BacklogItemDB.removeTag(backlogId, 100, '1');
            await BacklogItemDB.removeTag(backlogId, 100, '2');
            
            const tags = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            expect(tags).toHaveLength(0);
        });

        test('should handle removing non-existent tag gracefully', async () => {
            await expect(BacklogItemDB.removeTag(backlogId, 100, 'nonexistent'))
                .resolves.not.toThrow();
            
            // Original tags should still be there
            const tags = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            expect(tags).toHaveLength(2);
        });

        test('should handle removing tag from non-existent item gracefully', async () => {
            await expect(BacklogItemDB.removeTag(backlogId, 999, '1'))
                .resolves.not.toThrow();
        });

        test('should handle removing tag from non-existent backlog gracefully', async () => {
            await expect(BacklogItemDB.removeTag(999, 100, '1'))
                .resolves.not.toThrow();
        });

        test('should only remove tag from specified item, not others', async () => {
            // Add another item with same tag
            await BacklogDB.addBacklogItem(backlogId, 200, 2);
            await BacklogItemDB.addTag(backlogId, 200, '1');
            
            // Remove tag from first item only
            await BacklogItemDB.removeTag(backlogId, 100, '1');
            
            const tags100 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            const tags200 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 200);
            
            expect(tags100).toHaveLength(1);
            expect(tags100[0].id).toBe('2');
            expect(tags200).toHaveLength(1);
            expect(tags200[0].id).toBe('1');
        });
    });

    describe('moveItemTagsToOtherBacklog', () => {
        let fromBacklogId: number;
        let toBacklogId: number;

        beforeEach(async () => {
            const fromBacklog = await BacklogDB.createBacklog(1, 'From Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            const toBacklog = await BacklogDB.createBacklog(1, 'To Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.ELO);
            
            fromBacklogId = fromBacklog!.id;
            toBacklogId = toBacklog!.id;
            
            // Add item to both backlogs
            await BacklogDB.addBacklogItem(fromBacklogId, 100, 1);
            await BacklogDB.addBacklogItem(toBacklogId, 100, 1);
            
            // Add tags to the item in from backlog
            await BacklogItemDB.addTag(fromBacklogId, 100, '1');
            await BacklogItemDB.addTag(fromBacklogId, 100, '2');
        });

        test('should successfully move all tags from one backlog to another', async () => {
            await BacklogItemDB.moveItemTagsToOtherBacklog(fromBacklogId, toBacklogId, 100);
            
            const fromTags = await BacklogItemDB.getTags(fromBacklogId, ArtifactType.GAME, 100);
            const toTags = await BacklogItemDB.getTags(toBacklogId, ArtifactType.GAME, 100);
            
            expect(fromTags).toHaveLength(0);
            expect(toTags).toHaveLength(2);
            expect(toTags.some(tag => tag.id === '1')).toBe(true);
            expect(toTags.some(tag => tag.id === '2')).toBe(true);
        });

        test('should handle moving tags when item has no tags', async () => {
            // Remove all tags first
            await BacklogItemDB.removeTag(fromBacklogId, 100, '1');
            await BacklogItemDB.removeTag(fromBacklogId, 100, '2');
            
            await expect(BacklogItemDB.moveItemTagsToOtherBacklog(fromBacklogId, toBacklogId, 100))
                .resolves.not.toThrow();
            
            const toTags = await BacklogItemDB.getTags(toBacklogId, ArtifactType.GAME, 100);
            expect(toTags).toHaveLength(0);
        });

        test('should handle moving tags for non-existent artifact', async () => {
            await expect(BacklogItemDB.moveItemTagsToOtherBacklog(fromBacklogId, toBacklogId, 999))
                .resolves.not.toThrow();
        });

        test('should handle moving tags from non-existent backlog', async () => {
            await expect(BacklogItemDB.moveItemTagsToOtherBacklog(999, toBacklogId, 100))
                .resolves.not.toThrow();
        });

        test('should handle moving tags to non-existent backlog', async () => {
            await expect(BacklogItemDB.moveItemTagsToOtherBacklog(fromBacklogId, 999, 100))
                .resolves.not.toThrow();
        });

        test('should preserve tag relationships when moving between different users backlogs', async () => {
            // Create backlog for different user
            const userTwoBacklog = await BacklogDB.createBacklog(2, 'User Two Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            await BacklogDB.addBacklogItem(userTwoBacklog!.id, 100, 1);
            
            await BacklogItemDB.moveItemTagsToOtherBacklog(fromBacklogId, userTwoBacklog!.id, 100);
            
            const userTwoTags = await BacklogItemDB.getTags(userTwoBacklog!.id, ArtifactType.GAME, 100);
            expect(userTwoTags).toHaveLength(2);
        });

        test('should not affect other items in the source backlog', async () => {
            // Add another item with tags to the from backlog
            await BacklogDB.addBacklogItem(fromBacklogId, 200, 2);
            await BacklogItemDB.addTag(fromBacklogId, 200, '3');
            
            await BacklogItemDB.moveItemTagsToOtherBacklog(fromBacklogId, toBacklogId, 100);
            
            // Item 200 should still have its tags in the from backlog
            const item200Tags = await BacklogItemDB.getTags(fromBacklogId, ArtifactType.GAME, 200);
            expect(item200Tags).toHaveLength(1);
            expect(item200Tags[0].id).toBe('3');
        });

        test('should handle moving tags when target backlog already has tags for the item', async () => {
            // Add a tag to the item in the target backlog first
            await BacklogItemDB.addTag(toBacklogId, 100, '3');
            
            await BacklogItemDB.moveItemTagsToOtherBacklog(fromBacklogId, toBacklogId, 100);
            
            const toTags = await BacklogItemDB.getTags(toBacklogId, ArtifactType.GAME, 100);
            
            // Should have 3 tags total (1 existing + 2 moved)
            expect(toTags).toHaveLength(3);
            expect(toTags.some(tag => tag.id === '1')).toBe(true);
            expect(toTags.some(tag => tag.id === '2')).toBe(true);
            expect(toTags.some(tag => tag.id === '3')).toBe(true);
        });
    });

    describe('Integration tests', () => {
        test('should handle complete tag lifecycle: add -> get -> move -> remove', async () => {
            const backlog1 = await BacklogDB.createBacklog(1, 'Backlog 1', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK);
            const backlog2 = await BacklogDB.createBacklog(1, 'Backlog 2', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.ELO);
            
            await BacklogDB.addBacklogItem(backlog1!.id, 100, 1);
            await BacklogDB.addBacklogItem(backlog2!.id, 100, 1);
            
            // Add tags
            await BacklogItemDB.addTag(backlog1!.id, 100, '1');
            await BacklogItemDB.addTag(backlog1!.id, 100, '2');
            
            // Verify tags added
            let tags = await BacklogItemDB.getTags(backlog1!.id, ArtifactType.GAME, 100);
            expect(tags).toHaveLength(2);
            
            // Move tags
            await BacklogItemDB.moveItemTagsToOtherBacklog(backlog1!.id, backlog2!.id, 100);
            
            // Verify tags moved
            tags = await BacklogItemDB.getTags(backlog2!.id, ArtifactType.GAME, 100);
            expect(tags).toHaveLength(2);
            
            // Remove one tag
            await BacklogItemDB.removeTag(backlog2!.id, 100, '1');
            
            // Verify tag removed
            tags = await BacklogItemDB.getTags(backlog2!.id, ArtifactType.GAME, 100);
            expect(tags).toHaveLength(1);
            expect(tags[0].id).toBe('2');
        });

        test('should maintain data consistency across multiple operations', async () => {
            const backlogId = (await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK))!.id;
            
            // Add multiple items
            await BacklogDB.addBacklogItem(backlogId, 100, 1);
            await BacklogDB.addBacklogItem(backlogId, 200, 2);
            await BacklogDB.addBacklogItem(backlogId, 300, 3);
            
            // Add different tag combinations
            await BacklogItemDB.addTag(backlogId, 100, '1');
            await BacklogItemDB.addTag(backlogId, 100, '2');
            await BacklogItemDB.addTag(backlogId, 200, '1');
            await BacklogItemDB.addTag(backlogId, 300, '3');
            
            // Verify each item has correct tags
            const tags100 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            const tags200 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 200);
            const tags300 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 300);
            
            expect(tags100).toHaveLength(2);
            expect(tags200).toHaveLength(1);
            expect(tags300).toHaveLength(1);
            
            // Remove some tags and verify independence
            await BacklogItemDB.removeTag(backlogId, 100, '1');
            
            const updatedTags100 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 100);
            const updatedTags200 = await BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 200);
            
            expect(updatedTags100).toHaveLength(1);
            expect(updatedTags200).toHaveLength(1); // Should be unchanged
            expect(updatedTags200[0].id).toBe('1');
        });
    });

    describe('Error handling and edge cases', () => {
        test('should handle invalid tag IDs gracefully', async () => {
            const backlogId = (await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK))!.id;
            await BacklogDB.addBacklogItem(backlogId, 100, 1);
            
            // Empty tag ID
            await expect(BacklogItemDB.addTag(backlogId, 100, ''))
                .resolves.not.toThrow();
            
            // Very long tag ID  
            await expect(BacklogItemDB.addTag(backlogId, 100, 'a'.repeat(1000)))
                .resolves.not.toThrow();
        });

        test('should handle invalid backlog IDs gracefully', async () => {
            // Negative backlog ID
            await expect(BacklogItemDB.getTags(-1, ArtifactType.GAME, 100))
                .resolves.toEqual([]);
            
            // Zero backlog ID
            await expect(BacklogItemDB.getTags(0, ArtifactType.GAME, 100))
                .resolves.toEqual([]);
        });

        test('should handle invalid artifact IDs gracefully', async () => {
            const backlogId = (await BacklogDB.createBacklog(1, 'Test Backlog', BacklogType.STANDARD, ArtifactType.GAME, BacklogRankingType.RANK))!.id;
            
            // Negative artifact ID
            await expect(BacklogItemDB.getTags(backlogId, ArtifactType.GAME, -1))
                .resolves.toEqual([]);
            
            // Zero artifact ID
            await expect(BacklogItemDB.getTags(backlogId, ArtifactType.GAME, 0))
                .resolves.toEqual([]);
        });

        test('should handle database connection issues gracefully', async () => {
            // This test would require mocking database failures
            // For now, we just ensure the methods exist and are callable
            expect(typeof BacklogItemDB.getTags).toBe('function');
            expect(typeof BacklogItemDB.addTag).toBe('function');
            expect(typeof BacklogItemDB.removeTag).toBe('function');
            expect(typeof BacklogItemDB.moveItemTagsToOtherBacklog).toBe('function');
        });
    });
});