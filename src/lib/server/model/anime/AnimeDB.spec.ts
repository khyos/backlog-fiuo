import { runDbInsert, runDbQueries, runDbQueriesParallel } from '../../database';
import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactStatus } from '$lib/model/UserArtifact';
import { Genre } from '$lib/model/Genre';
import { BacklogRankingType, BacklogOrder } from '$lib/model/Backlog';
import { Link, LinkType } from '$lib/model/Link';
import { Rating, RatingType } from '$lib/model/Rating';
import { Anime } from '$lib/model/anime/Anime';
import { AnimeEpisode } from '$lib/model/anime/AnimeEpisode';
import { AnimeDB } from './AnimeDB';
import { ArtifactDB } from '../ArtifactDB';
import { BacklogDB } from '../BacklogDB';
import { RatingDB } from '../RatingDB';
import { LinkDB } from '../LinkDB';
import { TagDB } from '../TagDB';

describe('AnimeDB', () => {
    // Shared cleanup function to eliminate duplication
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM anime_anime_genre' },
            { query: 'DELETE FROM user_artifact' },
            { query: 'DELETE FROM backlog_items' },
            { query: 'DELETE FROM backlog_item_tag' },
            { query: 'DELETE FROM backlog' },
            { query: 'DELETE FROM rating' },
            { query: 'DELETE FROM link' },
            { query: 'DELETE FROM tag' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM anime_genre' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("artifact", "anime_genre", "backlog", "rating", "link")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema using existing creation methods
        await ArtifactDB.createArtifactTable();
        await ArtifactDB.createUserArtifactTable();
        
        // Create anime-specific tables
        await AnimeDB.createAnimeGenreTable();
        await AnimeDB.createAnimeAnimeGenreTable();
        
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
        test('getById should return anime by ID without episodes', async () => {
            // Insert test anime
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Attack on Titan', 'anime', '1364688000000', 1440)");

            const anime = await AnimeDB.getById(animeId, false);
            expect(anime).not.toBeNull();
            expect(anime!.title).toBe('Attack on Titan');
            expect(anime!.type).toBe(ArtifactType.ANIME);
            expect(anime!.duration).toBe(1440);
            expect(anime!.children).toHaveLength(0);
        });

        test('getById should return anime by ID with episodes when requested', async () => {
            // Insert test anime
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Death Note', 'anime', '1160006400000', 1440)");
            
            // Insert episodes
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Rebirth', 'anime_episode', ?, 1, '1160006400000', 24)", params: [animeId] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Confrontation', 'anime_episode', ?, 2, '1160593200000', 24)", params: [animeId] }
            ]);

            const anime = await AnimeDB.getById(animeId, true);
            expect(anime).not.toBeNull();
            expect(anime!.title).toBe('Death Note');
            expect(anime!.children).toHaveLength(2);
            expect(anime!.children[0]).toBeInstanceOf(AnimeEpisode);
            expect(anime!.children[0].title).toBe('Rebirth');
            expect(anime!.children[0].childIndex).toBe(1);
            expect(anime!.children[1].title).toBe('Confrontation');
            expect(anime!.children[1].childIndex).toBe(2);
        });

        test('getById should return null for non-existent ID', async () => {
            const anime = await AnimeDB.getById(99999);
            expect(anime).toBeNull();
        });

        test('getAnimes should return paginated animes', async () => {
            // Insert test animes
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Naruto', 'anime', '1065398400000', 4320)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('One Piece', 'anime', '971136000000', 7200)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Dragon Ball Z', 'anime', '577152000000', 3600)" }
            ]);

            const animes = await AnimeDB.getAnimes(0, 10);
            expect(animes).toHaveLength(3);
            expect(animes[0]).toBeInstanceOf(Anime);
            expect(animes.some(a => a.title === 'Naruto')).toBe(true);
            expect(animes.some(a => a.title === 'One Piece')).toBe(true);
            expect(animes.some(a => a.title === 'Dragon Ball Z')).toBe(true);
        });

        test('getAnimes should support search functionality', async () => {
            // Insert test animes
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Naruto', 'anime', '1065398400000', 4320)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Naruto Shippuden', 'anime', '1139779200000', 6480)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('One Piece', 'anime', '971136000000', 7200)" }
            ]);

            const searchResults = await AnimeDB.getAnimes(0, 10, 'naruto');
            expect(searchResults).toHaveLength(2);
            expect(searchResults.every(a => a.title.toLowerCase().includes('naruto'))).toBe(true);
        });

        test('getAnimes should handle pagination correctly', async () => {
            // Insert multiple animes
            for (let i = 1; i <= 5; i++) {
                await runDbInsert(`INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Anime ${i}', 'anime', '1065398400000', 1440)`);
            }

            // Test first page
            const firstPage = await AnimeDB.getAnimes(0, 2);
            expect(firstPage).toHaveLength(2);

            // Test second page
            const secondPage = await AnimeDB.getAnimes(1, 2);
            expect(secondPage).toHaveLength(2);

            // Test third page (partial)
            const thirdPage = await AnimeDB.getAnimes(2, 2);
            expect(thirdPage).toHaveLength(1);
        });
    });

    describe('Children/Relationship Methods', () => {
        test('fetchEpisodes should populate episodes for anime objects', async () => {
            // Create animes
            const animeId1 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Anime 1', 'anime', '1065398400000', 1440)");
            const animeId2 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Anime 2', 'anime', '1065398400000', 1440)");

            // Create episodes for both animes
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 1', 'anime_episode', ?, 1, '1065398400000', 24)", params: [animeId1] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 2', 'anime_episode', ?, 2, '1065484800000', 24)", params: [animeId1] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('First Episode', 'anime_episode', ?, 1, '1065398400000', 24)", params: [animeId2] }
            ]);

            // Create anime objects without episodes
            const animes = [
                new Anime(animeId1, 'Anime 1', ArtifactType.ANIME, new Date(1065398400000), 1440),
                new Anime(animeId2, 'Anime 2', ArtifactType.ANIME, new Date(1065398400000), 1440)
            ];

            // Fetch episodes
            await AnimeDB.fetchEpisodes(animes);

            // Verify episodes were populated
            expect(animes[0].children).toHaveLength(2);
            expect(animes[0].children[0]).toBeInstanceOf(AnimeEpisode);
            expect(animes[0].children[0].title).toBe('Episode 1');
            expect(animes[0].children[1].title).toBe('Episode 2');

            expect(animes[1].children).toHaveLength(1);
            expect(animes[1].children[0].title).toBe('First Episode');
        });

        test('fetchEpisodes should handle animes with no episodes', async () => {
            // Create anime without episodes
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('No Episodes Anime', 'anime', '1065398400000', 1440)");

            const animes = [
                new Anime(animeId, 'No Episodes Anime', ArtifactType.ANIME, new Date(1065398400000), 1440)
            ];

            // Fetch episodes (should not fail)
            await AnimeDB.fetchEpisodes(animes);

            expect(animes[0].children).toHaveLength(0);
        });

        test('fetchEpisodes should handle empty anime array', async () => {
            const animes: Anime[] = [];
            
            // Should not throw error
            await expect(AnimeDB.fetchEpisodes(animes)).resolves.not.toThrow();
        });
    });

    describe('Genre Methods', () => {
        test('getGenreDefinitions should return anime genres', async () => {
            // Insert test genres
            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (2, 'Drama')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (3, 'Romance')" }
            ]);

            const genres = await AnimeDB.getGenreDefinitions();
            expect(genres).toHaveLength(3);
            expect(genres[0]).toBeInstanceOf(Genre);
            expect(genres.find(g => g.title === 'Action')).toBeDefined();
            expect(genres.find(g => g.title === 'Drama')).toBeDefined();
            expect(genres.find(g => g.title === 'Romance')).toBeDefined();
        });

        test('addGenreDefinition should add new anime genre', async () => {
            await AnimeDB.addGenreDefinition(10, 'Supernatural');

            const genres = await AnimeDB.getGenreDefinitions();
            expect(genres).toHaveLength(1);
            expect(genres[0].id).toBe(10);
            expect(genres[0].title).toBe('Supernatural');
        });

        test('assignGenre and getAssignedGenres should work together', async () => {
            // Insert anime and genres
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Anime', 'anime', '1065398400000', 1440)");

            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (2, 'Supernatural')" }
            ]);

            // Assign genres
            await AnimeDB.assignGenre(animeId, 1);
            await AnimeDB.assignGenre(animeId, 2);

            // Get assigned genres
            const assignedGenres = await AnimeDB.getAssignedGenres(animeId);
            expect(assignedGenres).toHaveLength(2);
            expect(assignedGenres.find(g => g.title === 'Action')).toBeDefined();
            expect(assignedGenres.find(g => g.title === 'Supernatural')).toBeDefined();
        });

        test('unassignGenre should remove genre assignment', async () => {
            // Insert anime and genre
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Anime', 'anime', '1065398400000', 1440)");
            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Comedy')" }
            ]);

            // Assign and then unassign genre
            await AnimeDB.assignGenre(animeId, 1);
            await AnimeDB.unassignGenre(animeId, 1);

            const assignedGenres = await AnimeDB.getAssignedGenres(animeId);
            expect(assignedGenres).toHaveLength(0);
        });

        test('updateAssignedGenres should update genre assignments', async () => {
            // Insert anime and genres
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Anime', 'anime', '1065398400000', 1440)");

            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (2, 'Drama')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (3, 'Romance')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (4, 'Comedy')" }
            ]);

            // Initially assign Action and Drama
            await AnimeDB.assignGenre(animeId, 1);
            await AnimeDB.assignGenre(animeId, 2);

            // Update to have Drama, Romance, and Comedy (remove Action, add Romance and Comedy, keep Drama)
            await AnimeDB.updateAssignedGenres(animeId, [2, 3, 4]);

            // Verify final state
            const finalGenres = await AnimeDB.getAssignedGenres(animeId);
            expect(finalGenres).toHaveLength(3);
            
            const genreTitles = finalGenres.map(g => g.title).sort();
            expect(genreTitles).toEqual(['Comedy', 'Drama', 'Romance']);
        });

        test('updateAssignedGenres should handle empty arrays', async () => {
            // Insert anime and genres
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Anime', 'anime', '1065398400000', 1440)");

            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (2, 'Drama')" }
            ]);

            // Initially assign genres
            await AnimeDB.assignGenre(animeId, 1);
            await AnimeDB.assignGenre(animeId, 2);

            // Update to empty array (should remove all genres)
            await AnimeDB.updateAssignedGenres(animeId, []);

            const finalGenres = await AnimeDB.getAssignedGenres(animeId);
            expect(finalGenres).toHaveLength(0);
        });
    });

    describe('User-related Methods', () => {
        test('getUserOngoingAnimes should return only ongoing animes', async () => {
            // Insert animes
            const ongoingId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Ongoing Anime', 'anime', '1065398400000', 1440)");
            const finishedId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Finished Anime', 'anime', '1065398400000', 1440)");
            const onholdId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('On Hold Anime', 'anime', '1065398400000', 1440)");

            // Insert user artifacts with different statuses
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status) VALUES (1, ?, 'ongoing')", params: [ongoingId] },
                { query: "INSERT INTO user_artifact (userId, artifactId, status) VALUES (1, ?, 'finished')", params: [finishedId] },
                { query: "INSERT INTO user_artifact (userId, artifactId, status) VALUES (1, ?, 'onhold')", params: [onholdId] }
            ]);

            // Test ongoing only
            const ongoingAnimes = await AnimeDB.getUserOngoingAnimes(1, false);
            expect(ongoingAnimes).toHaveLength(1);
            expect(ongoingAnimes[0].title).toBe('Ongoing Anime');

            // Test ongoing + on hold
            const ongoingAndOnholdAnimes = await AnimeDB.getUserOngoingAnimes(1, true);
            expect(ongoingAndOnholdAnimes).toHaveLength(2);
            expect(ongoingAndOnholdAnimes.find(a => a.title === 'Ongoing Anime')).toBeDefined();
            expect(ongoingAndOnholdAnimes.find(a => a.title === 'On Hold Anime')).toBeDefined();
        });

        test('getUserOngoingAnimes should fetch episodes for returned animes', async () => {
            // Insert anime with episodes
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Ongoing Anime', 'anime', '1065398400000', 1440)");
            
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 1', 'anime_episode', ?, 1, '1065398400000', 24)", params: [animeId] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 2', 'anime_episode', ?, 2, '1065484800000', 24)", params: [animeId] }
            ]);

            // Set as ongoing
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status) VALUES (1, ?, 'ongoing')", params: [animeId] }
            ]);

            const ongoingAnimes = await AnimeDB.getUserOngoingAnimes(1);
            expect(ongoingAnimes).toHaveLength(1);
            expect(ongoingAnimes[0].children).toHaveLength(2);
            expect(ongoingAnimes[0].children[0].title).toBe('Episode 1');
            expect(ongoingAnimes[0].children[1].title).toBe('Episode 2');
        });

        test('getBacklogItems should return anime backlog items', async () => {
            // Create a backlog
            const backlogId = await runDbInsert("INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (1, 'Anime Backlog', 'anime', 'elo')");
            
            // Create animes
            const animeId1 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Anime A', 'anime', '1609459200000', 1440)");
            const animeId2 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Anime B', 'anime', '1577836800000', 1440)");

            // Add items to backlog with different ELO scores
            await runDbQueries([
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1200, '2023-01-01', 1)", params: [backlogId, animeId1] },
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1500, '2023-01-02', 2)", params: [backlogId, animeId2] }
            ]);

            const items = await AnimeDB.getBacklogItems(backlogId, BacklogRankingType.ELO, BacklogOrder.ELO);
            
            expect(items).toHaveLength(2);
            expect(items[0].artifact).toBeInstanceOf(Anime);
            expect(items[0].artifact.title).toBe('Anime B'); // Higher ELO first
            expect(items[0].elo).toBe(1500);
            expect(items[1].artifact.title).toBe('Anime A');
            expect(items[1].elo).toBe(1200);
        });
    });

    describe('Create Operations', () => {
        test('createAnime should create new anime with all associated data', async () => {
            // Setup genres, links, and ratings
            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (2, 'Drama')" }
            ]);

            const links = [
                new Link(LinkType.MAL, 'https://myanimelist.net/anime/1/test'),
                new Link(LinkType.SENSCRITIQUE, 'https://senscritique.com/anime/test')
            ];

            const ratings = [
                new Rating(RatingType.MAL, 8.5),
                new Rating(RatingType.SENSCRITIQUE, 7.8)
            ];

            const releaseDate = new Date('2023-04-01');
            const anime = await AnimeDB.createAnime(
                'Test Anime',
                'A great test anime',
                releaseDate,
                1440,
                [1, 2],
                links,
                ratings
            );

            expect(anime).toBeInstanceOf(Anime);
            expect(anime.title).toBe('Test Anime');
            expect(anime.type).toBe(ArtifactType.ANIME);
            expect(anime.releaseDate).toEqual(releaseDate);
            expect(anime.duration).toBe(1440);

            // Verify genres were assigned
            expect(anime.genres).toHaveLength(2);
            expect(anime.genres.find(g => g.title === 'Action')).toBeDefined();
            expect(anime.genres.find(g => g.title === 'Drama')).toBeDefined();

            // Verify links were added
            expect(anime.links).toHaveLength(2);
            expect(anime.links.find(l => l.type === LinkType.MAL)).toBeDefined();
            expect(anime.links.find(l => l.type === LinkType.SENSCRITIQUE)).toBeDefined();

            // Verify ratings were added
            expect(anime.ratings).toHaveLength(2);
            expect(anime.ratings.find(r => r.type === RatingType.MAL)).toBeDefined();
            expect(anime.ratings.find(r => r.type === RatingType.SENSCRITIQUE)).toBeDefined();
        });

        test('createAnime should work with minimal parameters', async () => {
            const anime = await AnimeDB.createAnime('Minimal Anime', '', new Date(), 0, [], [], []);

            expect(anime).toBeInstanceOf(Anime);
            expect(anime.title).toBe('Minimal Anime');
            expect(anime.type).toBe(ArtifactType.ANIME);
            expect(anime.duration).toBe(0);
            expect(anime.genres).toHaveLength(0);
            expect(anime.links).toHaveLength(0);
            expect(anime.ratings).toHaveLength(0);
        });

        test('createAnimeEpisode should create new episode', async () => {
            // Create parent anime
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Anime', 'anime', '1065398400000', 1440)");

            const episodeDate = new Date('2023-04-08');
            const episode = await AnimeDB.createAnimeEpisode(animeId, 1, 'First Episode', episodeDate, 24);

            expect(episode).toBeInstanceOf(AnimeEpisode);
            expect(episode.title).toBe('First Episode');
            expect(episode.type).toBe(ArtifactType.ANIME_EPISODE);
            expect(episode.childIndex).toBe(1);
            expect(episode.releaseDate).toEqual(episodeDate);
            expect(episode.duration).toBe(24);
        });

        test('createAnimeEpisode should work with default parameters', async () => {
            // Create parent anime
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Anime', 'anime', '1065398400000', 1440)");

            const episode = await AnimeDB.createAnimeEpisode(animeId, 2, 'Second Episode');

            expect(episode).toBeInstanceOf(AnimeEpisode);
            expect(episode.title).toBe('Second Episode');
            expect(episode.childIndex).toBe(2);
            expect(episode.duration).toBe(0);
            expect(episode.releaseDate).toEqual(new Date(7258118400000)); // Default date
        });
    });

    describe('Update Operations', () => {
        test('updateAnime should update anime properties', async () => {
            // Create anime
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Original Title', 'anime', '1065398400000', 1440)");

            // Update anime
            const newReleaseDate = new Date('2024-01-01');
            await AnimeDB.updateAnime(animeId, 'Updated Title', newReleaseDate, 2400);

            // Verify update
            const anime = await AnimeDB.getById(animeId);
            expect(anime!.title).toBe('Updated Title');
            expect(anime!.duration).toBe(2400);
            expect(anime!.releaseDate).toEqual(newReleaseDate);
        });

        test('updateAnime should work with default parameters', async () => {
            // Create anime
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Original Title', 'anime', '1065398400000', 1440)");

            // Update only title
            await AnimeDB.updateAnime(animeId, 'New Title');

            // Verify update
            const anime = await AnimeDB.getById(animeId);
            expect(anime!.title).toBe('New Title');
            expect(anime!.duration).toBe(0); // Default
            expect(anime!.releaseDate).toEqual(new Date(7258118400000)); // Default date
        });

        test('updateAnimeEpisode should update episode properties', async () => {
            // Create parent anime and episode
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Anime', 'anime', '1065398400000', 1440)");
            const episodeId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Original Episode', 'anime_episode', ?, 1, '1065398400000', 24)", [animeId]);

            const newReleaseDate = new Date('2024-02-01');
            
            // Update episode
            await AnimeDB.updateAnimeEpisode(episodeId, 3, 'Updated Episode', newReleaseDate, 25);

            // Verify update
            const updatedArtifact = await ArtifactDB.getArtifactById(episodeId);
            expect(updatedArtifact).not.toBeNull();
            expect(updatedArtifact!.title).toBe('Updated Episode');
            expect(updatedArtifact!.child_index).toBe(3);
            expect(updatedArtifact!.releaseDate).toBe(newReleaseDate.getTime().toString());
            expect(updatedArtifact!.duration).toBe(25);
        });

        test('updateAnimeEpisode should work with default parameters', async () => {
            // Create parent anime and episode
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Anime', 'anime', '1065398400000', 1440)");
            const episodeId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Original Episode', 'anime_episode', ?, 1, '1065398400000', 24)", [animeId]);

            // Update with minimal parameters
            await AnimeDB.updateAnimeEpisode(episodeId, 5, 'New Episode Title');

            // Verify update
            const updatedArtifact = await ArtifactDB.getArtifactById(episodeId);
            expect(updatedArtifact!.title).toBe('New Episode Title');
            expect(updatedArtifact!.child_index).toBe(5);
            expect(updatedArtifact!.releaseDate).toBe(new Date(7258118400000).getTime().toString()); // Default date
            expect(updatedArtifact!.duration).toBe(0); // Default duration
        });
    });

    describe('Delete Operations', () => {
        test('deleteAnime should delete anime and all related data', async () => {
            // Create anime with episodes
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Anime to Delete', 'anime', '1065398400000', 1440)");
            const episodeId1 = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 1', 'anime_episode', ?, 1, '1065398400000', 24)", [animeId]);
            const episodeId2 = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 2', 'anime_episode', ?, 2, '1065484800000', 24)", [animeId]);

            // Add genres
            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Action')" }
            ]);
            await AnimeDB.assignGenre(animeId, 1);

            // Add user data
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status, score) VALUES (1, ?, 'finished', 9)", params: [animeId] },
                { query: "INSERT INTO user_artifact (userId, artifactId, status, score) VALUES (1, ?, 'finished', 8)", params: [episodeId1] }
            ]);

            // Add ratings and links
            await runDbQueries([
                { query: "INSERT INTO rating (artifactId, type, rating) VALUES (?, 'mal', 85)", params: [animeId] },
                { query: "INSERT INTO link (artifactId, type, url) VALUES (?, 'mal', 'https://example.com/mal')", params: [animeId] }
            ]);

            // Verify data exists before deletion
            expect(await AnimeDB.getById(animeId, true)).not.toBeNull();
            expect(await ArtifactDB.getUserInfo(1, animeId)).not.toBeNull();
            expect(await AnimeDB.getAssignedGenres(animeId)).toHaveLength(1);

            // Delete anime
            await AnimeDB.deleteAnime(animeId);

            // Verify deletion
            expect(await AnimeDB.getById(animeId)).toBeNull();
            expect(await ArtifactDB.getArtifactById(episodeId1)).toBeNull();
            expect(await ArtifactDB.getArtifactById(episodeId2)).toBeNull();
            expect(await ArtifactDB.getUserInfo(1, animeId)).toBeNull();
            expect(await AnimeDB.getAssignedGenres(animeId)).toHaveLength(0);
        });

        test('deleteAnime should handle non-existent anime gracefully', async () => {
            // Should not throw error for non-existent anime
            await expect(AnimeDB.deleteAnime(99999)).resolves.not.toThrow();
        });

        test('deleteAnimeEpisode should delete episode', async () => {
            // Create parent anime and episode
            const animeId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Anime', 'anime', '1065398400000', 1440)");
            const episodeId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode to Delete', 'anime_episode', ?, 1, '1065398400000', 24)", [animeId]);

            // Add user data for episode
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status, score) VALUES (1, ?, 'finished', 8)", params: [episodeId] }
            ]);

            // Delete episode
            await AnimeDB.deleteAnimeEpisode(episodeId);

            // Verify deletion
            expect(await ArtifactDB.getArtifactById(episodeId)).toBeNull();
            expect(await ArtifactDB.getUserInfo(1, episodeId)).toBeNull();

            // Parent should still exist
            expect(await AnimeDB.getById(animeId)).not.toBeNull();
        });

        test('deleteAnimeEpisode should handle non-existent episode gracefully', async () => {
            // Should not throw error for non-existent episode
            await expect(AnimeDB.deleteAnimeEpisode(99999)).resolves.not.toThrow();
        });
    });

    describe('Table Creation Methods', () => {
        test('createAnimeGenreTable should be callable', () => {
            // These methods are already called in beforeAll, so just verify they don't throw
            expect(() => AnimeDB.createAnimeGenreTable()).not.toThrow();
        });

        test('createAnimeAnimeGenreTable should be callable', () => {
            expect(() => AnimeDB.createAnimeAnimeGenreTable()).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('getById should handle invalid IDs', async () => {
            const result1 = await AnimeDB.getById(-1);
            expect(result1).toBeNull();

            const result2 = await AnimeDB.getById(0);
            expect(result2).toBeNull();
        });

        test('getAnimes should handle edge cases', async () => {
            // Test with large page number
            const result = await AnimeDB.getAnimes(999, 10);
            expect(result).toHaveLength(0);

            // Test with zero page size
            const result2 = await AnimeDB.getAnimes(0, 0);
            expect(result2).toHaveLength(0);
        });

        test('assignGenre should handle non-existent anime or genre', async () => {
            // These operations may fail silently or throw - behavior depends on implementation
            // Testing that they don't cause crashes
            await expect(AnimeDB.assignGenre(99999, 1)).resolves.not.toThrow();
        });

        test('updateAnime should handle non-existent anime', async () => {
            // Should complete without error (similar to ArtifactDB behavior)
            await expect(AnimeDB.updateAnime(99999, 'Non-existent Anime'))
                .resolves.not.toThrow();
        });

        test('getUserOngoingAnimes should handle non-existent user', async () => {
            const result = await AnimeDB.getUserOngoingAnimes(99999);
            expect(result).toHaveLength(0);
        });

        test('getBacklogItems should handle non-existent backlog', async () => {
            const result = await AnimeDB.getBacklogItems(99999, BacklogRankingType.ELO, BacklogOrder.ELO);
            expect(result).toHaveLength(0);
        });

        test('createAnimeEpisode should handle invalid parent ID', async () => {
            // This might fail or succeed depending on database constraints
            // Test that it doesn't crash the system
            await expect(AnimeDB.createAnimeEpisode(99999, 1, 'Test Episode'))
                .resolves.not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('complete anime workflow - create, update, fetch, delete', async () => {
            // Create genres
            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Shounen')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (2, 'Adventure')" }
            ]);

            // Create anime
            const links = [new Link(LinkType.MAL, 'https://myanimelist.net/anime/test')];
            const ratings = [new Rating(RatingType.MAL, 9.0)];
            
            const anime = await AnimeDB.createAnime(
                'Integration Test Anime',
                'Test description',
                new Date('2023-01-01'),
                2400,
                [1, 2],
                links,
                ratings
            );

            // Create episodes
            const episode1 = await AnimeDB.createAnimeEpisode(anime.id, 1, 'Episode 1', new Date('2023-01-08'), 24);
            const episode2 = await AnimeDB.createAnimeEpisode(anime.id, 2, 'Episode 2', new Date('2023-01-15'), 24);

            // Update anime
            await AnimeDB.updateAnime(anime.id, 'Updated Integration Test Anime', new Date('2023-02-01'), 2500);

            // Update episode
            await AnimeDB.updateAnimeEpisode(episode1.id, 1, 'Updated Episode 1', new Date('2023-02-08'), 25);

            // Fetch with episodes
            const fetchedAnime = await AnimeDB.getById(anime.id, true);
            expect(fetchedAnime).not.toBeNull();
            expect(fetchedAnime!.title).toBe('Updated Integration Test Anime');
            expect(fetchedAnime!.duration).toBe(2500);
            expect(fetchedAnime!.children).toHaveLength(2);
            expect(fetchedAnime!.children[0].title).toBe('Updated Episode 1');
            expect(fetchedAnime!.children[0].duration).toBe(25);
            expect(fetchedAnime!.children[1].title).toBe('Episode 2');

            // Verify genres
            expect(fetchedAnime!.genres).toHaveLength(2);
            expect(fetchedAnime!.genres.find(g => g.title === 'Shounen')).toBeDefined();
            expect(fetchedAnime!.genres.find(g => g.title === 'Adventure')).toBeDefined();

            // Delete specific episode
            await AnimeDB.deleteAnimeEpisode(episode2.id);
            
            const animeAfterEpisodeDelete = await AnimeDB.getById(anime.id, true);
            expect(animeAfterEpisodeDelete!.children).toHaveLength(1);
            expect(animeAfterEpisodeDelete!.children[0].title).toBe('Updated Episode 1');

            // Delete entire anime
            await AnimeDB.deleteAnime(anime.id);
            
            const deletedAnime = await AnimeDB.getById(anime.id);
            expect(deletedAnime).toBeNull();
            
            // Verify episode was also deleted
            expect(await ArtifactDB.getArtifactById(episode1.id)).toBeNull();
        });

        test('anime with user interactions workflow', async () => {
            // Create anime
            const anime = await AnimeDB.createAnime('User Test Anime', '', new Date(), 0, [], [], []);
            
            // Create episodes
            const episode1 = await AnimeDB.createAnimeEpisode(anime.id, 1, 'Episode 1');
            await AnimeDB.createAnimeEpisode(anime.id, 2, 'Episode 2');

            // Set user status and interactions
            await ArtifactDB.setUserStatus(1, [anime.id], UserArtifactStatus.ON_GOING);
            await ArtifactDB.setUserScore(1, anime.id, 8);
            await ArtifactDB.setUserStatus(1, [episode1.id], UserArtifactStatus.FINISHED);
            await ArtifactDB.setUserScore(1, episode1.id, 9);

            // Get ongoing animes - should include this anime with episodes
            const ongoingAnimes = await AnimeDB.getUserOngoingAnimes(1);
            expect(ongoingAnimes).toHaveLength(1);
            expect(ongoingAnimes[0].title).toBe('User Test Anime');
            expect(ongoingAnimes[0].children).toHaveLength(2);

            // Create backlog and add anime
            const backlogId = await runDbInsert("INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (1, 'My Anime Backlog', 'anime', 'rank')");
            await runDbQueries([
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1300, '2023-01-01', 1)", params: [backlogId, anime.id] }
            ]);

            // Get backlog items
            const backlogItems = await AnimeDB.getBacklogItems(backlogId, BacklogRankingType.RANK, BacklogOrder.RANK);
            expect(backlogItems).toHaveLength(1);
            expect(backlogItems[0].artifact.title).toBe('User Test Anime');
            expect(backlogItems[0].artifact.genres).toBeDefined(); // Should have loaded genres
            expect(backlogItems[0].artifact.ratings).toBeDefined(); // Should have loaded ratings

            // Update genres
            await runDbQueries([
                { query: "INSERT INTO anime_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO anime_genre (id, title) VALUES (2, 'Slice of Life')" }
            ]);
            await AnimeDB.updateAssignedGenres(anime.id, [1, 2]);

            // Verify genres updated
            const updatedAnime = await AnimeDB.getById(anime.id);
            expect(updatedAnime!.genres).toHaveLength(2);
            expect(updatedAnime!.genres.find(g => g.title === 'Drama')).toBeDefined();
            expect(updatedAnime!.genres.find(g => g.title === 'Slice of Life')).toBeDefined();

            // Clean up
            await AnimeDB.deleteAnime(anime.id);
        });
    });
});