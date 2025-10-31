import { runDbInsert, runDbQueries, runDbQueriesParallel } from '../../database';
import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactStatus } from '$lib/model/UserArtifact';
import { Genre } from '$lib/model/Genre';
import { BacklogRankingType, BacklogOrder } from '$lib/model/Backlog';
import { Link, LinkType } from '$lib/model/Link';
import { Rating, RatingType } from '$lib/model/Rating';
import { Game } from '$lib/model/game/Game';
import { Platform } from '$lib/model/game/Platform';
import { GameDB } from './GameDB';
import { ArtifactDB } from '../ArtifactDB';
import { BacklogDB } from '../BacklogDB';
import { RatingDB } from '../RatingDB';
import { LinkDB } from '../LinkDB';
import { TagDB } from '../TagDB';
import { PlatformDB } from './PlatformDB';

describe('GameDB', () => {
    // Shared cleanup function to eliminate duplication
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM game_game_genre' },
            { query: 'DELETE FROM game_platform' },
            { query: 'DELETE FROM user_artifact' },
            { query: 'DELETE FROM backlog_items' },
            { query: 'DELETE FROM backlog_item_tag' },
            { query: 'DELETE FROM backlog' },
            { query: 'DELETE FROM rating' },
            { query: 'DELETE FROM link' },
            { query: 'DELETE FROM tag' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM game_genre' },
            { query: 'DELETE FROM platform' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("artifact", "game_genre", "platform", "backlog", "rating", "link")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema using existing creation methods
        await ArtifactDB.createArtifactTable();
        await ArtifactDB.createUserArtifactTable();
        
        // Create game-specific tables
        await GameDB.createGameGenreTable();
        await GameDB.createGameGameGenreTable();
        await GameDB.createGamePlatformTable();
        await PlatformDB.createPlatformTable();
        
        // Create backlog-related tables for testing
        await BacklogDB.createBacklogTable();
        await BacklogDB.createBacklogItemsTable();
        await BacklogDB.createBacklogItemTagTable();
        
        // Create additional tables needed for comprehensive testing
        await RatingDB.createRatingTable();
        await LinkDB.createLinkTable();
        await TagDB.createTagTable();
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

    describe('Basic Getters', () => {
        test('getById should return game by ID', async () => {
            // Insert test game
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Legend of Zelda: Breath of the Wild', 'game', '1488240000000', 7200)");

            const game = await GameDB.getById(gameId);
            expect(game).not.toBeNull();
            expect(game!.title).toBe('The Legend of Zelda: Breath of the Wild');
            expect(game!.type).toBe(ArtifactType.GAME);
            expect(game!.duration).toBe(7200);
            expect(game!.platforms).toHaveLength(0);
        });

        test('getById should return null for non-existent ID', async () => {
            const game = await GameDB.getById(99999);
            expect(game).toBeNull();
        });

        test('getGames should return paginated games', async () => {
            // Insert test games
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Super Mario Odyssey', 'game', '1509494400000', 1440)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('God of War', 'game', '1524700800000', 2400)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Cyberpunk 2077', 'game', '1607558400000', 5760)" }
            ]);

            const games = await GameDB.getGames(0, 10);
            expect(games).toHaveLength(3);
            expect(games[0]).toBeInstanceOf(Game);
            expect(games.some(g => g.title === 'Super Mario Odyssey')).toBe(true);
            expect(games.some(g => g.title === 'God of War')).toBe(true);
            expect(games.some(g => g.title === 'Cyberpunk 2077')).toBe(true);
        });

        test('getGames should support search functionality', async () => {
            // Insert test games
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Witcher 3', 'game', '1431993600000', 5760)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Witcher 2', 'game', '1305504000000', 2400)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Cyberpunk 2077', 'game', '1607558400000', 5760)" }
            ]);

            const searchResults = await GameDB.getGames(0, 10, 'witcher');
            expect(searchResults).toHaveLength(2);
            expect(searchResults.every(g => g.title.toLowerCase().includes('witcher'))).toBe(true);
        });

        test('getGames should handle pagination correctly', async () => {
            // Insert multiple games
            const gameIds = [];
            for (let i = 1; i <= 5; i++) {
                const gameId = await runDbInsert(`INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Game ${i}', 'game', '1431993600000', 1440)`);
                gameIds.push(gameId);
            }

            // Verify all games were inserted
            const allGames = await GameDB.getGames(0, 10);
            expect(allGames).toHaveLength(5);

            // Test first page
            const firstPage = await GameDB.getGames(0, 2);
            expect(firstPage).toHaveLength(2);

            // Test second page
            const secondPage = await GameDB.getGames(1, 2);
            expect(secondPage).toHaveLength(2);

            // Test third page (partial)
            const thirdPage = await GameDB.getGames(2, 2);
            expect(thirdPage).toHaveLength(1);
        });
    });

    describe('Platform Methods', () => {
        test('getPlatforms should return platforms for a game', async () => {
            // Insert game and platforms
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");
            const platform1Id = await runDbInsert("INSERT INTO platform (title) VALUES ('PlayStation 5')");
            const platform2Id = await runDbInsert("INSERT INTO platform (title) VALUES ('Xbox Series X')");

            // Assign platforms to game
            await runDbQueries([
                { query: "INSERT INTO game_platform (artifactId, platformId) VALUES (?, ?)", params: [gameId, platform1Id] },
                { query: "INSERT INTO game_platform (artifactId, platformId) VALUES (?, ?)", params: [gameId, platform2Id] }
            ]);

            const platforms = await GameDB.getPlatforms(gameId);
            expect(platforms).toHaveLength(2);
            expect(platforms[0]).toBeInstanceOf(Platform);
            expect(platforms.find(p => p.title === 'PlayStation 5')).toBeDefined();
            expect(platforms.find(p => p.title === 'Xbox Series X')).toBeDefined();
        });

        test('getPlatforms should return empty array for game with no platforms', async () => {
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('No Platform Game', 'game', '1431993600000', 1440)");

            const platforms = await GameDB.getPlatforms(gameId);
            expect(platforms).toHaveLength(0);
        });

        test('getAllPlatforms should return all platforms', async () => {
            // Insert platforms
            await runDbQueries([
                { query: "INSERT INTO platform (title) VALUES ('Nintendo Switch')" },
                { query: "INSERT INTO platform (title) VALUES ('PC')" },
                { query: "INSERT INTO platform (title) VALUES ('PlayStation 4')" }
            ]);

            const platforms = await GameDB.getAllPlatforms();
            expect(platforms).toHaveLength(3);
            expect(platforms.find(p => p.title === 'Nintendo Switch')).toBeDefined();
            expect(platforms.find(p => p.title === 'PC')).toBeDefined();
            expect(platforms.find(p => p.title === 'PlayStation 4')).toBeDefined();
        });

        test('addPlatform should add platform to game', async () => {
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");
            const platformId = await runDbInsert("INSERT INTO platform (title) VALUES ('Steam Deck')");

            await GameDB.addPlatform(gameId, platformId);

            const platforms = await GameDB.getPlatforms(gameId);
            expect(platforms).toHaveLength(1);
            expect(platforms[0].title).toBe('Steam Deck');
        });

        test('deletePlatform should remove platform from game', async () => {
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");
            const platformId = await runDbInsert("INSERT INTO platform (title) VALUES ('Xbox One')");

            // Add then remove platform
            await GameDB.addPlatform(gameId, platformId);
            await GameDB.deletePlatform(gameId, platformId);

            const platforms = await GameDB.getPlatforms(gameId);
            expect(platforms).toHaveLength(0);
        });

        test('updatePlatforms should update platform assignments', async () => {
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");
            
            // Insert platforms
            const platform1Id = await runDbInsert("INSERT INTO platform (title) VALUES ('PlayStation 5')");
            const platform2Id = await runDbInsert("INSERT INTO platform (title) VALUES ('Xbox Series X')");
            const platform3Id = await runDbInsert("INSERT INTO platform (title) VALUES ('PC')");
            const platform4Id = await runDbInsert("INSERT INTO platform (title) VALUES ('Nintendo Switch')");

            // Initially assign PlayStation 5 and Xbox Series X
            await GameDB.addPlatform(gameId, platform1Id);
            await GameDB.addPlatform(gameId, platform2Id);

            // Update to have Xbox Series X, PC, and Nintendo Switch (remove PS5, add PC and Switch, keep Xbox)
            await GameDB.updatePlatforms(gameId, [platform2Id, platform3Id, platform4Id]);

            // Verify final state
            const finalPlatforms = await GameDB.getPlatforms(gameId);
            expect(finalPlatforms).toHaveLength(3);
            
            const platformTitles = finalPlatforms.map(p => p.title).sort();
            expect(platformTitles).toEqual(['Nintendo Switch', 'PC', 'Xbox Series X']);
        });

        test('updatePlatforms should handle empty arrays', async () => {
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");
            const platformId = await runDbInsert("INSERT INTO platform (title) VALUES ('PlayStation 5')");

            // Initially assign platform
            await GameDB.addPlatform(gameId, platformId);

            // Update to empty array (should remove all platforms)
            await GameDB.updatePlatforms(gameId, []);

            const finalPlatforms = await GameDB.getPlatforms(gameId);
            expect(finalPlatforms).toHaveLength(0);
        });
    });

    describe('Genre Methods', () => {
        test('getGenreDefinitions should return game genres', async () => {
            // Insert test genres
            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (2, 'RPG')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (3, 'Adventure')" }
            ]);

            const genres = await GameDB.getGenreDefinitions();
            expect(genres).toHaveLength(3);
            expect(genres[0]).toBeInstanceOf(Genre);
            expect(genres.find(g => g.title === 'Action')).toBeDefined();
            expect(genres.find(g => g.title === 'RPG')).toBeDefined();
            expect(genres.find(g => g.title === 'Adventure')).toBeDefined();
        });

        test('addGenreDefinition should add new game genre', async () => {
            await GameDB.addGenreDefinition(10, 'Strategy');

            const genres = await GameDB.getGenreDefinitions();
            expect(genres).toHaveLength(1);
            expect(genres[0].id).toBe(10);
            expect(genres[0].title).toBe('Strategy');
        });

        test('assignGenre and getAssignedGenres should work together', async () => {
            // Insert game and genres
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");

            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (2, 'RPG')" }
            ]);

            // Assign genres
            await GameDB.assignGenre(gameId, 1);
            await GameDB.assignGenre(gameId, 2);

            // Get assigned genres
            const assignedGenres = await GameDB.getAssignedGenres(gameId);
            expect(assignedGenres).toHaveLength(2);
            expect(assignedGenres.find(g => g.title === 'Action')).toBeDefined();
            expect(assignedGenres.find(g => g.title === 'RPG')).toBeDefined();
        });

        test('unassignGenre should remove genre assignment', async () => {
            // Insert game and genre
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");
            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Simulation')" }
            ]);

            // Assign and then unassign genre
            await GameDB.assignGenre(gameId, 1);
            await GameDB.unassignGenre(gameId, 1);

            const assignedGenres = await GameDB.getAssignedGenres(gameId);
            expect(assignedGenres).toHaveLength(0);
        });

        test('updateAssignedGenres should update genre assignments', async () => {
            // Insert game and genres
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");

            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (2, 'RPG')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (3, 'Adventure')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (4, 'Strategy')" }
            ]);

            // Initially assign Action and RPG
            await GameDB.assignGenre(gameId, 1);
            await GameDB.assignGenre(gameId, 2);

            // Update to have RPG, Adventure, and Strategy (remove Action, add Adventure and Strategy, keep RPG)
            await GameDB.updateAssignedGenres(gameId, [2, 3, 4]);

            // Verify final state
            const finalGenres = await GameDB.getAssignedGenres(gameId);
            expect(finalGenres).toHaveLength(3);
            
            const genreTitles = finalGenres.map(g => g.title).sort();
            expect(genreTitles).toEqual(['Adventure', 'RPG', 'Strategy']);
        });

        test('updateAssignedGenres should handle empty arrays', async () => {
            // Insert game and genres
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");

            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (2, 'RPG')" }
            ]);

            // Initially assign genres
            await GameDB.assignGenre(gameId, 1);
            await GameDB.assignGenre(gameId, 2);

            // Update to empty array (should remove all genres)
            await GameDB.updateAssignedGenres(gameId, []);

            const finalGenres = await GameDB.getAssignedGenres(gameId);
            expect(finalGenres).toHaveLength(0);
        });
    });

    describe('User-related Methods', () => {
        test('getBacklogItems should return game backlog items', async () => {
            // Create a backlog
            const backlogId = await runDbInsert("INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (1, 'Game Backlog', 'game', 'elo')");
            
            // Create games
            const gameId1 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Game A', 'game', '1609459200000', 1440)");
            const gameId2 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Game B', 'game', '1577836800000', 1440)");

            // Add items to backlog with different ELO scores
            await runDbQueries([
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1200, '2023-01-01', 1)", params: [backlogId, gameId1] },
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1500, '2023-01-02', 2)", params: [backlogId, gameId2] }
            ]);

            const items = await GameDB.getBacklogItems(backlogId, BacklogRankingType.ELO, BacklogOrder.ELO);
            
            expect(items).toHaveLength(2);
            expect(items[0].artifact).toBeInstanceOf(Game);
            expect(items[0].artifact.title).toBe('Game B'); // Higher ELO first
            expect(items[0].elo).toBe(1500);
            expect(items[1].artifact.title).toBe('Game A');
            expect(items[1].elo).toBe(1200);
        });
    });

    describe('Create Operations', () => {
        test('createGame should create new game with all associated data', async () => {
            // Setup genres, platforms, links, and ratings
            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (2, 'RPG')" }
            ]);

            const platform1Id = await runDbInsert("INSERT INTO platform (title) VALUES ('PlayStation 5')");
            const platform2Id = await runDbInsert("INSERT INTO platform (title) VALUES ('PC')");

            const links = [
                new Link(LinkType.STEAM, 'https://store.steampowered.com/app/1234/test'),
                new Link(LinkType.METACRITIC, 'https://metacritic.com/game/test')
            ];

            const ratings = [
                new Rating(RatingType.METACRITIC, 85),
                new Rating(RatingType.OPENCRITIC, 88)
            ];

            const releaseDate = new Date('2023-04-01');
            const game = await GameDB.createGame(
                'Test Game',
                releaseDate,
                1440,
                [platform1Id, platform2Id],
                [1, 2],
                links,
                ratings
            );

            expect(game).toBeInstanceOf(Game);
            expect(game.title).toBe('Test Game');
            expect(game.type).toBe(ArtifactType.GAME);
            expect(game.releaseDate).toEqual(releaseDate);
            expect(game.duration).toBe(1440);

            // Verify genres were assigned
            expect(game.genres).toHaveLength(2);
            expect(game.genres.find(g => g.title === 'Action')).toBeDefined();
            expect(game.genres.find(g => g.title === 'RPG')).toBeDefined();

            // Verify platforms were assigned
            expect(game.platforms).toHaveLength(2);
            expect(game.platforms.find(p => p.title === 'PlayStation 5')).toBeDefined();
            expect(game.platforms.find(p => p.title === 'PC')).toBeDefined();

            // Verify links were added
            expect(game.links).toHaveLength(2);
            expect(game.links.find(l => l.type === LinkType.STEAM)).toBeDefined();
            expect(game.links.find(l => l.type === LinkType.METACRITIC)).toBeDefined();

            // Verify ratings were added
            expect(game.ratings).toHaveLength(2);
            expect(game.ratings.find(r => r.type === RatingType.METACRITIC)).toBeDefined();
            expect(game.ratings.find(r => r.type === RatingType.OPENCRITIC)).toBeDefined();
        });

        test('createGame should work with minimal parameters', async () => {
            const game = await GameDB.createGame('Minimal Game', new Date(), 0, [], [], [], []);

            expect(game).toBeInstanceOf(Game);
            expect(game.title).toBe('Minimal Game');
            expect(game.type).toBe(ArtifactType.GAME);
            expect(game.duration).toBe(0);
            expect(game.genres).toHaveLength(0);
            expect(game.platforms).toHaveLength(0);
            expect(game.links).toHaveLength(0);
            expect(game.ratings).toHaveLength(0);
        });
    });

    describe('Update Operations', () => {
        test('updateGame should update game properties', async () => {
            // Create game
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Original Title', 'game', '1431993600000', 1440)");

            // Update game
            const newReleaseDate = new Date('2024-01-01');
            await GameDB.updateGame(gameId, 'Updated Title', newReleaseDate);

            // Verify update
            const game = await GameDB.getById(gameId);
            expect(game!.title).toBe('Updated Title');
            expect(game!.releaseDate).toEqual(newReleaseDate);
        });

        test('updateGame should work with default parameters', async () => {
            // Create game
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Original Title', 'game', '1431993600000', 1440)");

            // Update only title
            await GameDB.updateGame(gameId, 'New Title');

            // Verify update
            const game = await GameDB.getById(gameId);
            expect(game!.title).toBe('New Title');
            expect(game!.releaseDate).toEqual(new Date(7258118400000)); // Default date
        });

        test('updateDuration should update game duration', async () => {
            // Create game
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Game', 'game', '1431993600000', 1440)");

            // Update duration
            await GameDB.updateDuration(gameId, 2400);

            // Verify update
            const game = await GameDB.getById(gameId);
            expect(game!.duration).toBe(2400);
        });
    });

    describe('Delete Operations', () => {
        test('deleteGame should delete game and all related data', async () => {
            // Create game with platforms and genres
            const gameId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Game to Delete', 'game', '1431993600000', 1440)");
            
            // Add platforms
            const platformId = await runDbInsert("INSERT INTO platform (title) VALUES ('PlayStation 5')");
            await GameDB.addPlatform(gameId, platformId);

            // Add genres
            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Action')" }
            ]);
            await GameDB.assignGenre(gameId, 1);

            // Add user data
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status, score) VALUES (1, ?, 'finished', 9)", params: [gameId] }
            ]);

            // Add ratings and links
            await runDbQueries([
                { query: "INSERT INTO rating (artifactId, type, rating) VALUES (?, 'metacritic', 85)", params: [gameId] },
                { query: "INSERT INTO link (artifactId, type, url) VALUES (?, 'steam', 'https://example.com/steam')", params: [gameId] }
            ]);

            // Verify data exists before deletion
            expect(await GameDB.getById(gameId)).not.toBeNull();
            expect(await ArtifactDB.getUserInfo(1, gameId)).not.toBeNull();
            expect(await GameDB.getAssignedGenres(gameId)).toHaveLength(1);
            expect(await GameDB.getPlatforms(gameId)).toHaveLength(1);

            // Delete game
            await GameDB.deleteGame(gameId);

            // Verify deletion
            expect(await GameDB.getById(gameId)).toBeNull();
            expect(await ArtifactDB.getUserInfo(1, gameId)).toBeNull();
            expect(await GameDB.getAssignedGenres(gameId)).toHaveLength(0);
            expect(await GameDB.getPlatforms(gameId)).toHaveLength(0);
        });

        test('deleteGame should handle non-existent game gracefully', async () => {
            // Should not throw error for non-existent game
            await expect(GameDB.deleteGame(99999)).resolves.not.toThrow();
        });
    });

    describe('Table Creation Methods', () => {
        test('createGameGenreTable should be callable', () => {
            // These methods are already called in beforeAll, so just verify they don't throw
            expect(() => GameDB.createGameGenreTable()).not.toThrow();
        });

        test('createGameGameGenreTable should be callable', () => {
            expect(() => GameDB.createGameGameGenreTable()).not.toThrow();
        });

        test('createGamePlatformTable should be callable', () => {
            expect(() => GameDB.createGamePlatformTable()).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('getById should handle invalid IDs', async () => {
            const result1 = await GameDB.getById(-1);
            expect(result1).toBeNull();

            const result2 = await GameDB.getById(0);
            expect(result2).toBeNull();
        });

        test('getGames should handle edge cases', async () => {
            // Test with large page number
            const result = await GameDB.getGames(999, 10);
            expect(result).toHaveLength(0);

            // Test with zero page size
            const result2 = await GameDB.getGames(0, 0);
            expect(result2).toHaveLength(0);
        });

        test('assignGenre should handle non-existent game or genre', async () => {
            // These operations may fail silently or throw - behavior depends on implementation
            // Testing that they don't cause crashes
            await expect(GameDB.assignGenre(99999, 1)).resolves.not.toThrow();
        });

        test('updateGame should handle non-existent game', async () => {
            // Should complete without error (similar to ArtifactDB behavior)
            await expect(GameDB.updateGame(99999, 'Non-existent Game'))
                .resolves.not.toThrow();
        });

        test('getBacklogItems should handle non-existent backlog', async () => {
            const result = await GameDB.getBacklogItems(99999, BacklogRankingType.ELO, BacklogOrder.ELO);
            expect(result).toHaveLength(0);
        });

        test('getPlatforms should handle non-existent game', async () => {
            const result = await GameDB.getPlatforms(99999);
            expect(result).toHaveLength(0);
        });
    });

    describe('Integration Tests', () => {
        test('complete game workflow - create, update, fetch, delete', async () => {
            // Create genres and platforms
            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (2, 'Adventure')" }
            ]);

            const platform1Id = await runDbInsert("INSERT INTO platform (title) VALUES ('PlayStation 5')");
            const platform2Id = await runDbInsert("INSERT INTO platform (title) VALUES ('PC')");

            // Create game
            const links = [new Link(LinkType.STEAM, 'https://store.steampowered.com/app/test')];
            const ratings = [new Rating(RatingType.METACRITIC, 90)];
            
            const game = await GameDB.createGame(
                'Integration Test Game',
                new Date('2023-01-01'),
                2400,
                [platform1Id, platform2Id],
                [1, 2],
                links,
                ratings
            );

            // Update game
            await GameDB.updateGame(game.id, 'Updated Integration Test Game', new Date('2023-02-01'));
            await GameDB.updateDuration(game.id, 3600);

            // Update platforms and genres
            const platform3Id = await runDbInsert("INSERT INTO platform (title) VALUES ('Xbox Series X')");
            await GameDB.updatePlatforms(game.id, [platform2Id, platform3Id]); // Keep PC, add Xbox, remove PS5

            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (3, 'RPG')" }
            ]);
            await GameDB.updateAssignedGenres(game.id, [2, 3]); // Keep Adventure, add RPG, remove Action

            // Fetch updated game
            const fetchedGame = await GameDB.getById(game.id);
            expect(fetchedGame).not.toBeNull();
            expect(fetchedGame!.title).toBe('Updated Integration Test Game');
            expect(fetchedGame!.duration).toBe(3600);

            // Verify platforms
            expect(fetchedGame!.platforms).toHaveLength(2);
            const platformTitles = fetchedGame!.platforms.map(p => p.title).sort();
            expect(platformTitles).toEqual(['PC', 'Xbox Series X']);

            // Verify genres
            expect(fetchedGame!.genres).toHaveLength(2);
            const genreTitles = fetchedGame!.genres.map(g => g.title).sort();
            expect(genreTitles).toEqual(['Adventure', 'RPG']);

            // Delete game
            await GameDB.deleteGame(game.id);
            
            const deletedGame = await GameDB.getById(game.id);
            expect(deletedGame).toBeNull();
        });

        test('game with user interactions workflow', async () => {
            // Create game
            const game = await GameDB.createGame('User Test Game', new Date(), 0, [], [], [], []);
            
            // Set user status and interactions
            await ArtifactDB.setUserStatus(1, [game.id], UserArtifactStatus.FINISHED);
            await ArtifactDB.setUserScore(1, game.id, 8);

            // Create backlog and add game
            const backlogId = await runDbInsert("INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (1, 'My Game Backlog', 'game', 'rank')");
            await runDbQueries([
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1300, '2023-01-01', 1)", params: [backlogId, game.id] }
            ]);

            // Get backlog items
            const backlogItems = await GameDB.getBacklogItems(backlogId, BacklogRankingType.RANK, BacklogOrder.RANK);
            expect(backlogItems).toHaveLength(1);
            expect(backlogItems[0].artifact.title).toBe('User Test Game');
            expect(backlogItems[0].artifact.genres).toBeDefined(); // Should have loaded genres
            expect((backlogItems[0].artifact as Game).platforms).toBeDefined(); // Should have loaded platforms
            expect(backlogItems[0].artifact.ratings).toBeDefined(); // Should have loaded ratings

            // Update genres and platforms
            await runDbQueries([
                { query: "INSERT INTO game_genre (id, title) VALUES (1, 'Indie')" },
                { query: "INSERT INTO game_genre (id, title) VALUES (2, 'Puzzle')" }
            ]);
            await GameDB.updateAssignedGenres(game.id, [1, 2]);

            const platformId = await runDbInsert("INSERT INTO platform (title) VALUES ('Nintendo Switch')");
            await GameDB.updatePlatforms(game.id, [platformId]);

            // Verify updates
            const updatedGame = await GameDB.getById(game.id);
            expect(updatedGame!.genres).toHaveLength(2);
            expect(updatedGame!.genres.find(g => g.title === 'Indie')).toBeDefined();
            expect(updatedGame!.genres.find(g => g.title === 'Puzzle')).toBeDefined();
            expect(updatedGame!.platforms).toHaveLength(1);
            expect(updatedGame!.platforms[0].title).toBe('Nintendo Switch');

            // Clean up
            await GameDB.deleteGame(game.id);
        });
    });
});