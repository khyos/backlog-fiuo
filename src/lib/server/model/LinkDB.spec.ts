import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { runDbQueriesParallel } from '../database';
import { LinkDB } from './LinkDB';
import { LinkType } from '$lib/model/Link';
import { ArtifactDB } from './ArtifactDB';
import { ArtifactType } from '$lib/model/Artifact';

describe('LinkDB', () => {
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM link' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("artifact")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema
        ArtifactDB.createArtifactTable();
        LinkDB.createLinkTable();
    });

    beforeEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('addLink', () => {
        test('should add a link to the database', async () => {
            // Create a test artifact first
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await LinkDB.addLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/123456');

            const links = await LinkDB.getLinks(artifactId);
            expect(links).toHaveLength(1);
            expect(links[0].type).toBe(LinkType.STEAM);
            expect(links[0].url).toBe('https://store.steampowered.com/app/123456');
        });

        test('should allow adding multiple links for the same artifact', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await LinkDB.addLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/123456');
            await LinkDB.addLink(artifactId, LinkType.METACRITIC, 'https://www.metacritic.com/game/test-game');

            const links = await LinkDB.getLinks(artifactId);
            expect(links).toHaveLength(2);
            
            const steamLink = links.find(link => link.type === LinkType.STEAM);
            const metacriticLink = links.find(link => link.type === LinkType.METACRITIC);
            
            expect(steamLink).toBeDefined();
            expect(steamLink?.url).toBe('https://store.steampowered.com/app/123456');
            expect(metacriticLink).toBeDefined();
            expect(metacriticLink?.url).toBe('https://www.metacritic.com/game/test-game');
        });

        test('should handle duplicate link type for same artifact by replacing', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            // Add first link
            await LinkDB.addLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/123456');
            
            // Try to add another link of the same type - should throw or replace based on implementation
            await expect(LinkDB.addLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/789012'))
                .rejects.toThrow();
        });
    });

    describe('updateLink', () => {
        test('should update an existing link', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await LinkDB.addLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/123456');
            await LinkDB.updateLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/789012');

            const links = await LinkDB.getLinks(artifactId);
            expect(links).toHaveLength(1);
            expect(links[0].type).toBe(LinkType.STEAM);
            expect(links[0].url).toBe('https://store.steampowered.com/app/789012');
        });

        test('should not affect other links when updating one', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await LinkDB.addLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/123456');
            await LinkDB.addLink(artifactId, LinkType.METACRITIC, 'https://www.metacritic.com/game/test-game');
            
            await LinkDB.updateLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/789012');

            const links = await LinkDB.getLinks(artifactId);
            expect(links).toHaveLength(2);
            
            const steamLink = links.find(link => link.type === LinkType.STEAM);
            const metacriticLink = links.find(link => link.type === LinkType.METACRITIC);
            
            expect(steamLink?.url).toBe('https://store.steampowered.com/app/789012');
            expect(metacriticLink?.url).toBe('https://www.metacritic.com/game/test-game');
        });
    });

    describe('exists', () => {
        test('should return true for existing link', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            const testUrl = 'https://store.steampowered.com/app/123456';
            await LinkDB.addLink(artifactId, LinkType.STEAM, testUrl);

            const exists = await LinkDB.exists(LinkType.STEAM, testUrl);
            expect(exists).toBe(true);
        });

        test('should return false for non-existing link', async () => {
            const exists = await LinkDB.exists(LinkType.STEAM, 'https://store.steampowered.com/app/nonexistent');
            expect(exists).toBe(false);
        });

        test('should return false for existing URL but different type', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            const testUrl = 'https://store.steampowered.com/app/123456';
            await LinkDB.addLink(artifactId, LinkType.STEAM, testUrl);

            const exists = await LinkDB.exists(LinkType.METACRITIC, testUrl);
            expect(exists).toBe(false);
        });
    });

    describe('getLinks', () => {
        test('should return empty array for artifact with no links', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            const links = await LinkDB.getLinks(artifactId);
            expect(links).toEqual([]);
        });

        test('should return all links for an artifact', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await LinkDB.addLink(artifactId, LinkType.STEAM, 'https://store.steampowered.com/app/123456');
            await LinkDB.addLink(artifactId, LinkType.METACRITIC, 'https://www.metacritic.com/game/test-game');
            await LinkDB.addLink(artifactId, LinkType.IGDB, 'https://www.igdb.com/games/test-game');

            const links = await LinkDB.getLinks(artifactId);
            expect(links).toHaveLength(3);
            
            const linkTypes = links.map(link => link.type);
            expect(linkTypes).toContain(LinkType.STEAM);
            expect(linkTypes).toContain(LinkType.METACRITIC);
            expect(linkTypes).toContain(LinkType.IGDB);
        });

        test('should return empty array for non-existing artifact', async () => {
            const links = await LinkDB.getLinks(999999);
            expect(links).toEqual([]);
        });
    });

    describe('getLinksMultiple', () => {
        test('should return links for multiple artifacts', async () => {
            const artifact1Id = await ArtifactDB.createArtifact(
                'Test Game 1',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            const artifact2Id = await ArtifactDB.createArtifact(
                'Test Game 2',
                ArtifactType.GAME,
                '',
                new Date('2024-02-01'),
                90
            );

            await LinkDB.addLink(artifact1Id, LinkType.STEAM, 'https://store.steampowered.com/app/123456');
            await LinkDB.addLink(artifact2Id, LinkType.STEAM, 'https://store.steampowered.com/app/789012');

            const links = await LinkDB.getLinksMultiple(LinkType.STEAM, [artifact1Id, artifact2Id]);
            expect(Object.keys(links)).toHaveLength(2);
            expect(links[artifact1Id]).toBe('https://store.steampowered.com/app/123456');
            expect(links[artifact2Id]).toBe('https://store.steampowered.com/app/789012');
        });

        test('should return empty object when no artifacts have the specified link type', async () => {
            const artifact1Id = await ArtifactDB.createArtifact(
                'Test Game 1',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            const links = await LinkDB.getLinksMultiple(LinkType.STEAM, [artifact1Id]);
            expect(links).toEqual({});
        });

        test('should return partial results when only some artifacts have the link type', async () => {
            const artifact1Id = await ArtifactDB.createArtifact(
                'Test Game 1',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            const artifact2Id = await ArtifactDB.createArtifact(
                'Test Game 2',
                ArtifactType.GAME,
                '',
                new Date('2024-02-01'),
                90
            );

            // Only add Steam link for artifact1
            await LinkDB.addLink(artifact1Id, LinkType.STEAM, 'https://store.steampowered.com/app/123456');

            const links = await LinkDB.getLinksMultiple(LinkType.STEAM, [artifact1Id, artifact2Id]);
            expect(Object.keys(links)).toHaveLength(1);
            expect(links[artifact1Id]).toBe('https://store.steampowered.com/app/123456');
            expect(links[artifact2Id]).toBeUndefined();
        });

        test('should handle empty artifact IDs array', async () => {
            const links = await LinkDB.getLinksMultiple(LinkType.STEAM, []);
            expect(links).toEqual({});
        });
    });
});