import { runDbInsert, runDbQueriesParallel, getDbRows, getDbRow } from '../../database';
import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { Platform, type IPlatformDB } from '$lib/model/game/Platform';
import { PlatformDB } from './PlatformDB';
import { GameDB } from './GameDB';
import { ArtifactDB } from '../ArtifactDB';

describe('PlatformDB', () => {
    // Shared cleanup function to eliminate duplication
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM game_platform' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM platform' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("platform", "artifact")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema using existing creation methods
        await ArtifactDB.createArtifactTable();
        await PlatformDB.createPlatformTable();
        await GameDB.createGamePlatformTable();
    });

    beforeEach(async () => {
        // Clean up data before each test using the shared cleanup function
        await cleanupTestData();
    });

    afterAll(async () => {
        // Clean up test data but don't close the shared database connection
        // This prevents SQLITE_READONLY errors in other test files
        try {
            await cleanupTestData();
        } catch (error) {
            console.error('Error cleaning up test data:', error);
        }
    });

    describe('Table Creation', () => {
        test('createPlatformTable should be callable and create table', () => {
            // This method is already called in beforeAll, so just verify it doesn't throw
            expect(() => PlatformDB.createPlatformTable()).not.toThrow();
        });

        test('createPlatformTable should create table with correct structure', async () => {
            // Verify table exists by querying its structure
            interface TableInfo {
                cid: number;
                name: string;
                type: string;
                notnull: number;
                dflt_value: string | null;
                pk: number;
            }
            const tableInfo = await getDbRows<TableInfo>(`PRAGMA table_info(platform)`);
            
            expect(tableInfo).toHaveLength(2);
            
            // Check id column
            const idColumn = tableInfo.find(col => col.name === 'id');
            expect(idColumn).toBeDefined();
            expect(idColumn!.type).toBe('INTEGER');
            expect(idColumn!.pk).toBe(1); // Primary key
            
            // Check title column
            const titleColumn = tableInfo.find(col => col.name === 'title');
            expect(titleColumn).toBeDefined();
            expect(titleColumn!.type).toBe('TEXT');
            expect(titleColumn!.notnull).toBe(1); // NOT NULL
        });
    });

    describe('Platform Addition', () => {
        test('addPlatform should add a new platform successfully', async () => {
            await PlatformDB.addPlatform(1, 'PlayStation 5');

            const platforms = await getDbRows<IPlatformDB>('SELECT * FROM platform');
            expect(platforms).toHaveLength(1);
            expect(platforms[0].id).toBe(1);
            expect(platforms[0].title).toBe('PlayStation 5');
        });

        test('addPlatform should handle multiple platforms', async () => {
            await PlatformDB.addPlatform(1, 'PlayStation 5');
            await PlatformDB.addPlatform(2, 'Xbox Series X');
            await PlatformDB.addPlatform(3, 'Nintendo Switch');

            const platforms = await getDbRows<IPlatformDB>('SELECT * FROM platform ORDER BY id');
            expect(platforms).toHaveLength(3);
            expect(platforms[0].title).toBe('PlayStation 5');
            expect(platforms[1].title).toBe('Xbox Series X');
            expect(platforms[2].title).toBe('Nintendo Switch');
        });

        test('addPlatform should handle duplicate IDs gracefully (INSERT OR IGNORE)', async () => {
            // Add platform first time
            await PlatformDB.addPlatform(1, 'PlayStation 5');
            
            // Try to add same ID again with different title - should be ignored
            await PlatformDB.addPlatform(1, 'PlayStation 4');

            const platforms = await getDbRows<IPlatformDB>('SELECT * FROM platform');
            expect(platforms).toHaveLength(1);
            expect(platforms[0].id).toBe(1);
            expect(platforms[0].title).toBe('PlayStation 5'); // Original title should remain
        });

        test('addPlatform should handle empty strings', async () => {
            await PlatformDB.addPlatform(1, '');

            const platform = await getDbRow<IPlatformDB>('SELECT * FROM platform WHERE id = ?', [1]);
            expect(platform).not.toBeNull();
            expect(platform!.title).toBe('');
        });

        test('addPlatform should handle special characters and unicode', async () => {
            const specialTitle = 'PlayStation™ 5 (Édition Spéciale) 🎮';
            await PlatformDB.addPlatform(1, specialTitle);

            const platform = await getDbRow<IPlatformDB>('SELECT * FROM platform WHERE id = ?', [1]);
            expect(platform).not.toBeNull();
            expect(platform!.title).toBe(specialTitle);
        });

        test('addPlatform should handle very long titles', async () => {
            const longTitle = 'A'.repeat(1000);
            await PlatformDB.addPlatform(1, longTitle);

            const platform = await getDbRow<IPlatformDB>('SELECT * FROM platform WHERE id = ?', [1]);
            expect(platform).not.toBeNull();
            expect(platform!.title).toBe(longTitle);
        });
    });

    describe('Error Handling', () => {
        test('addPlatform should handle negative IDs', async () => {
            await expect(PlatformDB.addPlatform(-1, 'Test Platform')).resolves.not.toThrow();
            
            const platform = await getDbRow<IPlatformDB>('SELECT * FROM platform WHERE id = ?', [-1]);
            expect(platform).not.toBeNull();
            expect(platform!.id).toBe(-1);
        });

        test('addPlatform should handle zero ID', async () => {
            await expect(PlatformDB.addPlatform(0, 'Test Platform')).resolves.not.toThrow();
            
            const platform = await getDbRow<IPlatformDB>('SELECT * FROM platform WHERE id = ?', [0]);
            expect(platform).not.toBeNull();
            expect(platform!.id).toBe(0);
        });

        test('addPlatform should handle very large IDs', async () => {
            const largeId = Number.MAX_SAFE_INTEGER;
            await expect(PlatformDB.addPlatform(largeId, 'Test Platform')).resolves.not.toThrow();
            
            const platform = await getDbRow<IPlatformDB>('SELECT * FROM platform WHERE id = ?', [largeId]);
            expect(platform).not.toBeNull();
            expect(platform!.id).toBe(largeId);
        });
    });

    describe('Integration with GameDB', () => {
        test('getAllPlatforms should work with PlatformDB added platforms', async () => {
            // Add platforms using PlatformDB
            await PlatformDB.addPlatform(1, 'PlayStation 5');
            await PlatformDB.addPlatform(2, 'Xbox Series X');
            await PlatformDB.addPlatform(3, 'Nintendo Switch');

            // Retrieve using GameDB
            const platforms = await GameDB.getAllPlatforms();
            
            expect(platforms).toHaveLength(3);
            expect(platforms[0]).toBeInstanceOf(Platform);
            
            // Should be ordered by title (from GameDB.getAllPlatforms ORDER BY title)
            const sortedTitles = platforms.map(p => p.title).sort();
            expect(platforms.map(p => p.title)).toEqual(sortedTitles);
            
            // Verify all platforms are found
            expect(platforms.find(p => p.title === 'PlayStation 5')).toBeDefined();
            expect(platforms.find(p => p.title === 'Xbox Series X')).toBeDefined();
            expect(platforms.find(p => p.title === 'Nintendo Switch')).toBeDefined();
        });

        test('platforms added via PlatformDB should be usable in game platform assignments', async () => {
            // Add platforms
            await PlatformDB.addPlatform(1, 'PC');
            await PlatformDB.addPlatform(2, 'PlayStation 5');

            // Create a game
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1609459200000', 0)");

            // Assign platforms to the game using GameDB
            await GameDB.addPlatform(gameId, 1);
            await GameDB.addPlatform(gameId, 2);

            // Retrieve game platforms
            const gamePlatforms = await GameDB.getPlatforms(gameId);
            
            expect(gamePlatforms).toHaveLength(2);
            expect(gamePlatforms[0]).toBeInstanceOf(Platform);
            expect(gamePlatforms.find(p => p.title === 'PC')).toBeDefined();
            expect(gamePlatforms.find(p => p.title === 'PlayStation 5')).toBeDefined();
        });

        test('updatePlatforms should work with PlatformDB added platforms', async () => {
            // Add platforms
            await PlatformDB.addPlatform(1, 'PC');
            await PlatformDB.addPlatform(2, 'PlayStation 5');
            await PlatformDB.addPlatform(3, 'Xbox Series X');

            // Create a game
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1609459200000', 0)");

            // Initially assign PC and PlayStation 5
            await GameDB.updatePlatforms(gameId, [1, 2]);

            // Verify initial assignment
            let gamePlatforms = await GameDB.getPlatforms(gameId);
            expect(gamePlatforms).toHaveLength(2);
            expect(gamePlatforms.find(p => p.title === 'PC')).toBeDefined();
            expect(gamePlatforms.find(p => p.title === 'PlayStation 5')).toBeDefined();

            // Update to PlayStation 5 and Xbox Series X (remove PC, add Xbox)
            await GameDB.updatePlatforms(gameId, [2, 3]);

            // Verify updated assignment
            gamePlatforms = await GameDB.getPlatforms(gameId);
            expect(gamePlatforms).toHaveLength(2);
            expect(gamePlatforms.find(p => p.title === 'PlayStation 5')).toBeDefined();
            expect(gamePlatforms.find(p => p.title === 'Xbox Series X')).toBeDefined();
            expect(gamePlatforms.find(p => p.title === 'PC')).toBeUndefined();
        });
    });

    describe('Real-world Scenarios', () => {
        test('should handle IGDB-style platform initialization', async () => {
            // Simulate how IGDB.initPlatforms() would use PlatformDB
            const igdbPlatforms = [
                { id: 6, name: 'PC (Microsoft Windows)' },
                { id: 167, name: 'PlayStation 5' },
                { id: 169, name: 'Xbox Series X|S' },
                { id: 130, name: 'Nintendo Switch' },
                { id: 48, name: 'PlayStation 4' },
                { id: 49, name: 'Xbox One' }
            ];

            // Add all platforms
            for (const platform of igdbPlatforms) {
                await PlatformDB.addPlatform(platform.id, platform.name);
            }

            // Verify all were added correctly
            const allPlatforms = await GameDB.getAllPlatforms();
            expect(allPlatforms).toHaveLength(igdbPlatforms.length);

            for (const expectedPlatform of igdbPlatforms) {
                const foundPlatform = allPlatforms.find(p => p.id === expectedPlatform.id);
                expect(foundPlatform).toBeDefined();
                expect(foundPlatform!.title).toBe(expectedPlatform.name);
            }
        });

        test('should handle duplicate initialization attempts gracefully', async () => {
            // First initialization
            await PlatformDB.addPlatform(6, 'PC (Microsoft Windows)');
            await PlatformDB.addPlatform(167, 'PlayStation 5');

            // Second initialization (simulating app restart)
            await PlatformDB.addPlatform(6, 'PC (Microsoft Windows)');  // Same data
            await PlatformDB.addPlatform(167, 'PlayStation 5');         // Same data
            await PlatformDB.addPlatform(169, 'Xbox Series X|S');       // New data

            const allPlatforms = await GameDB.getAllPlatforms();
            expect(allPlatforms).toHaveLength(3); // Should have 3 unique platforms
            
            expect(allPlatforms.find(p => p.id === 6 && p.title === 'PC (Microsoft Windows)')).toBeDefined();
            expect(allPlatforms.find(p => p.id === 167 && p.title === 'PlayStation 5')).toBeDefined();
            expect(allPlatforms.find(p => p.id === 169 && p.title === 'Xbox Series X|S')).toBeDefined();
        });

        test('should support complex game platform workflows', async () => {
            // Set up platforms
            await PlatformDB.addPlatform(1, 'PC');
            await PlatformDB.addPlatform(2, 'PlayStation 5');
            await PlatformDB.addPlatform(3, 'Xbox Series X');
            await PlatformDB.addPlatform(4, 'Nintendo Switch');

            // Create multiple games
            const game1Id = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Cyberpunk 2077', 'game', '1607472000000', 0)");
            const game2Id = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Legend of Zelda: Breath of the Wild', 'game', '1488326400000', 0)");
            const game3Id = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Halo Infinite', 'game', '1638835200000', 0)");

            // Assign platforms to games
            await GameDB.updatePlatforms(game1Id, [1, 2, 3]); // Multi-platform game
            await GameDB.updatePlatforms(game2Id, [4]);       // Nintendo exclusive
            await GameDB.updatePlatforms(game3Id, [1, 3]);    // PC + Xbox

            // Verify assignments
            const game1Platforms = await GameDB.getPlatforms(game1Id);
            expect(game1Platforms).toHaveLength(3);
            expect(game1Platforms.map(p => p.title).sort()).toEqual(['PC', 'PlayStation 5', 'Xbox Series X']);

            const game2Platforms = await GameDB.getPlatforms(game2Id);
            expect(game2Platforms).toHaveLength(1);
            expect(game2Platforms[0].title).toBe('Nintendo Switch');

            const game3Platforms = await GameDB.getPlatforms(game3Id);
            expect(game3Platforms).toHaveLength(2);
            expect(game3Platforms.map(p => p.title).sort()).toEqual(['PC', 'Xbox Series X']);
        });
    });

    describe('Edge Cases and Robustness', () => {
        test('should handle platform data with SQL injection attempts', async () => {
            const maliciousTitle = "'; DROP TABLE platform; --";
            
            await expect(PlatformDB.addPlatform(1, maliciousTitle)).resolves.not.toThrow();
            
            // Verify the table still exists and the data was stored safely
            const platform = await getDbRow<IPlatformDB>('SELECT * FROM platform WHERE id = ?', [1]);
            expect(platform).not.toBeNull();
            expect(platform!.title).toBe(maliciousTitle);
            
            // Verify table still exists by querying it
            const allPlatforms = await getDbRows<IPlatformDB>('SELECT * FROM platform');
            expect(allPlatforms).toHaveLength(1);
        });

        test('should handle null-like values in titles', async () => {
            await PlatformDB.addPlatform(1, 'null');
            await PlatformDB.addPlatform(2, 'undefined');
            await PlatformDB.addPlatform(3, 'NULL');

            const platforms = await getDbRows<IPlatformDB>('SELECT * FROM platform ORDER BY id');
            expect(platforms).toHaveLength(3);
            expect(platforms[0].title).toBe('null');
            expect(platforms[1].title).toBe('undefined');
            expect(platforms[2].title).toBe('NULL');
        });
    });

    describe('Performance and Scale', () => {
        test('should handle adding many platforms efficiently', async () => {
            const startTime = Date.now();
            
            // Add 100 platforms
            const promises = [];
            for (let i = 1; i <= 100; i++) {
                promises.push(PlatformDB.addPlatform(i, `Platform ${i}`));
            }
            await Promise.all(promises);
            
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
            
            // Verify all were added
            const countResult = await getDbRows<{ count: number }>('SELECT COUNT(*) as count FROM platform');
            expect(countResult[0].count).toBe(100);
        });

        test('should handle retrieving large numbers of platforms efficiently', async () => {
            // Add many platforms
            for (let i = 1; i <= 50; i++) {
                await PlatformDB.addPlatform(i, `Platform ${i.toString().padStart(3, '0')}`);
            }

            const startTime = Date.now();
            const allPlatforms = await GameDB.getAllPlatforms();
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
            expect(allPlatforms).toHaveLength(50);
            
            // Verify ordering (getAllPlatforms uses ORDER BY title)
            for (let i = 1; i < allPlatforms.length; i++) {
                expect(allPlatforms[i].title >= allPlatforms[i-1].title).toBe(true);
            }
        });
    });
});