import { runDbInsert, runDbQueries, runDbQueriesParallel } from '../../database';
import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactStatus } from '$lib/model/UserArtifact';
import { Genre } from '$lib/model/Genre';
import { BacklogRankingType, BacklogOrder } from '$lib/model/Backlog';
import { Link, LinkType } from '$lib/model/Link';
import { Rating, RatingType } from '$lib/model/Rating';
import { Tvshow } from '$lib/model/tvshow/Tvshow';
import { TvshowSeason } from '$lib/model/tvshow/TvshowSeason';
import { TvshowEpisode } from '$lib/model/tvshow/TvshowEpisode';
import { TvshowDB } from './TvshowDB';
import { ArtifactDB } from '../ArtifactDB';
import { BacklogDB } from '../BacklogDB';
import { RatingDB } from '../RatingDB';
import { LinkDB } from '../LinkDB';
import { TagDB } from '../TagDB';

describe('TvshowDB', () => {
    // Shared cleanup function to eliminate duplication
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM tvshow_tvshow_genre' },
            { query: 'DELETE FROM user_artifact' },
            { query: 'DELETE FROM backlog_items' },
            { query: 'DELETE FROM backlog_item_tag' },
            { query: 'DELETE FROM backlog' },
            { query: 'DELETE FROM rating' },
            { query: 'DELETE FROM link' },
            { query: 'DELETE FROM tag' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM tvshow_genre' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("artifact", "tvshow_genre", "backlog", "rating", "link")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema using existing creation methods
        await ArtifactDB.createArtifactTable();
        await ArtifactDB.createUserArtifactTable();
        
        // Create tvshow-specific tables
        await TvshowDB.createTvshowGenreTable();
        await TvshowDB.createTvshowTvshowGenreTable();
        
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
        test('getById should return tvshow by ID without seasons', async () => {
            // Insert test tvshow
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Breaking Bad', 'tvshow', '1232841600000', 2940)");

            const tvshow = await TvshowDB.getById(tvshowId, false);
            expect(tvshow).not.toBeNull();
            expect(tvshow!.title).toBe('Breaking Bad');
            expect(tvshow!.type).toBe(ArtifactType.TVSHOW);
            expect(tvshow!.duration).toBe(2940);
            expect(tvshow!.children).toHaveLength(0);
        });

        test('getById should return tvshow by ID with seasons when requested', async () => {
            // Insert test tvshow
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Game of Thrones', 'tvshow', '1302566400000', 4200)");
            
            // Insert seasons
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1302566400000', 600)", params: [tvshowId] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 2', 'tvshow_season', ?, 2, '1333324800000', 580)", params: [tvshowId] }
            ]);

            const tvshow = await TvshowDB.getById(tvshowId, true);
            expect(tvshow).not.toBeNull();
            expect(tvshow!.title).toBe('Game of Thrones');
            expect(tvshow!.children).toHaveLength(2);
            expect(tvshow!.children[0]).toBeInstanceOf(TvshowSeason);
            expect(tvshow!.children[0].title).toBe('Season 1');
            expect(tvshow!.children[0].childIndex).toBe(1);
            expect(tvshow!.children[1].title).toBe('Season 2');
            expect(tvshow!.children[1].childIndex).toBe(2);
        });

        test('getById should return tvshow with seasons and episodes when requested', async () => {
            // Insert test tvshow and season
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Office', 'tvshow', '1143849600000', 5000)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1143849600000', 400)", [tvshowId]);
            
            // Insert episodes
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Pilot', 'tvshow_episode', ?, 1, '1143849600000', 22)", params: [seasonId] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Diversity Day', 'tvshow_episode', ?, 2, '1144454400000', 22)", params: [seasonId] }
            ]);

            const tvshow = await TvshowDB.getById(tvshowId, true, true);
            expect(tvshow).not.toBeNull();
            expect(tvshow!.title).toBe('The Office');
            expect(tvshow!.children).toHaveLength(1);
            expect(tvshow!.children[0].children).toHaveLength(2);
            expect(tvshow!.children[0].children[0]).toBeInstanceOf(TvshowEpisode);
            expect(tvshow!.children[0].children[0].title).toBe('Pilot');
            expect(tvshow!.children[0].children[1].title).toBe('Diversity Day');
        });

        test('getById should return null for non-existent ID', async () => {
            const tvshow = await TvshowDB.getById(99999);
            expect(tvshow).toBeNull();
        });

        test('getTvshows should return paginated tvshows', async () => {
            // Insert test tvshows
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Stranger Things', 'tvshow', '1468800000000', 2520)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Crown', 'tvshow', '1478448000000', 3600)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('House of Cards', 'tvshow', '1359676800000', 4680)" }
            ]);

            const tvshows = await TvshowDB.getTvshows(0, 10);
            expect(tvshows).toHaveLength(3);
            expect(tvshows[0]).toBeInstanceOf(Tvshow);
            expect(tvshows.some(t => t.title === 'Stranger Things')).toBe(true);
            expect(tvshows.some(t => t.title === 'The Crown')).toBe(true);
            expect(tvshows.some(t => t.title === 'House of Cards')).toBe(true);
        });

        test('getTvshows should support search functionality', async () => {
            // Insert test tvshows
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Walking Dead', 'tvshow', '1287619200000', 6000)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Walking Dead: Fear the Walking Dead', 'tvshow', '1439424000000', 2400)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Breaking Bad', 'tvshow', '1232841600000', 2940)" }
            ]);

            const searchResults = await TvshowDB.getTvshows(0, 10, 'walking dead');
            expect(searchResults).toHaveLength(2);
            expect(searchResults.every(t => t.title.toLowerCase().includes('walking dead'))).toBe(true);
        });

        test('getTvshows should handle pagination correctly', async () => {
            // Insert multiple tvshows
            for (let i = 1; i <= 5; i++) {
                await runDbInsert(`INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Tvshow ${i}', 'tvshow', '1232841600000', 1800)`);
            }

            // Test first page
            const firstPage = await TvshowDB.getTvshows(0, 2);
            expect(firstPage).toHaveLength(2);

            // Test second page
            const secondPage = await TvshowDB.getTvshows(1, 2);
            expect(secondPage).toHaveLength(2);

            // Test third page (partial)
            const thirdPage = await TvshowDB.getTvshows(2, 2);
            expect(thirdPage).toHaveLength(1);
        });
    });

    describe('Children/Relationship Methods', () => {
        test('fetchSeasons should populate seasons for tvshow objects', async () => {
            // Create tvshows
            const tvshowId1 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Tvshow 1', 'tvshow', '1232841600000', 1800)");
            const tvshowId2 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Tvshow 2', 'tvshow', '1232841600000', 1800)");

            // Create seasons for both tvshows
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", params: [tvshowId1] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 2', 'tvshow_season', ?, 2, '1264377600000', 600)", params: [tvshowId1] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('First Season', 'tvshow_season', ?, 1, '1232841600000', 600)", params: [tvshowId2] }
            ]);

            // Create tvshow objects without seasons
            const tvshows = [
                new Tvshow(tvshowId1, 'Tvshow 1', ArtifactType.TVSHOW, new Date(1232841600000), 1800),
                new Tvshow(tvshowId2, 'Tvshow 2', ArtifactType.TVSHOW, new Date(1232841600000), 1800)
            ];

            // Fetch seasons
            await TvshowDB.fetchSeasons(tvshows);

            // Verify seasons were populated
            expect(tvshows[0].children).toHaveLength(2);
            expect(tvshows[0].children[0]).toBeInstanceOf(TvshowSeason);
            expect(tvshows[0].children[0].title).toBe('Season 1');
            expect(tvshows[0].children[1].title).toBe('Season 2');

            expect(tvshows[1].children).toHaveLength(1);
            expect(tvshows[1].children[0].title).toBe('First Season');
        });

        test('fetchSeasons should handle tvshows with no seasons', async () => {
            // Create tvshow without seasons
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('No Seasons Tvshow', 'tvshow', '1232841600000', 1800)");

            const tvshows = [
                new Tvshow(tvshowId, 'No Seasons Tvshow', ArtifactType.TVSHOW, new Date(1232841600000), 1800)
            ];

            // Fetch seasons (should not fail)
            await TvshowDB.fetchSeasons(tvshows);

            expect(tvshows[0].children).toHaveLength(0);
        });

        test('fetchSeasons should populate episodes when requested', async () => {
            // Create tvshow and season
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Show', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);

            // Create episodes
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 1', 'tvshow_episode', ?, 1, '1232841600000', 45)", params: [seasonId] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 2', 'tvshow_episode', ?, 2, '1233446400000', 45)", params: [seasonId] }
            ]);

            const tvshows = [
                new Tvshow(tvshowId, 'Test Show', ArtifactType.TVSHOW, new Date(1232841600000), 1800)
            ];

            // Fetch seasons with episodes
            await TvshowDB.fetchSeasons(tvshows, true);

            expect(tvshows[0].children).toHaveLength(1);
            expect(tvshows[0].children[0].children).toHaveLength(2);
            expect(tvshows[0].children[0].children[0]).toBeInstanceOf(TvshowEpisode);
            expect(tvshows[0].children[0].children[0].title).toBe('Episode 1');
            expect(tvshows[0].children[0].children[1].title).toBe('Episode 2');
        });

        test('fetchEpisodes should populate episodes for season objects', async () => {
            // Create season
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Show', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);

            // Create episodes
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Pilot', 'tvshow_episode', ?, 1, '1232841600000', 45)", params: [seasonId] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 2', 'tvshow_episode', ?, 2, '1233446400000', 45)", params: [seasonId] }
            ]);

            // Create season object without episodes
            const seasons = [
                new TvshowSeason(seasonId, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, new Date(1232841600000), 600)
            ];

            // Fetch episodes
            await TvshowDB.fetchEpisodes(seasons);

            // Verify episodes were populated
            expect(seasons[0].children).toHaveLength(2);
            expect(seasons[0].children[0]).toBeInstanceOf(TvshowEpisode);
            expect(seasons[0].children[0].title).toBe('Pilot');
            expect(seasons[0].children[0].childIndex).toBe(1);
            expect(seasons[0].children[1].title).toBe('Episode 2');
            expect(seasons[0].children[1].childIndex).toBe(2);
        });

        test('fetchEpisodes should handle empty season array', async () => {
            const seasons: TvshowSeason[] = [];
            
            // Should not throw error
            await expect(TvshowDB.fetchEpisodes(seasons)).resolves.not.toThrow();
        });
    });

    describe('Genre Methods', () => {
        test('getGenreDefinitions should return tvshow genres', async () => {
            // Insert test genres
            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (2, 'Comedy')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (3, 'Crime')" }
            ]);

            const genres = await TvshowDB.getGenreDefinitions();
            expect(genres).toHaveLength(3);
            expect(genres[0]).toBeInstanceOf(Genre);
            expect(genres.find(g => g.title === 'Drama')).toBeDefined();
            expect(genres.find(g => g.title === 'Comedy')).toBeDefined();
            expect(genres.find(g => g.title === 'Crime')).toBeDefined();
        });

        test('addGenreDefinition should add new tvshow genre', async () => {
            await TvshowDB.addGenreDefinition(10, 'Sci-Fi');

            const genres = await TvshowDB.getGenreDefinitions();
            expect(genres).toHaveLength(1);
            expect(genres[0].id).toBe(10);
            expect(genres[0].title).toBe('Sci-Fi');
        });

        test('assignGenre and getAssignedGenres should work together', async () => {
            // Insert tvshow and genres
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Tvshow', 'tvshow', '1232841600000', 1800)");

            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (2, 'Thriller')" }
            ]);

            // Assign genres
            await TvshowDB.assignGenre(tvshowId, 1);
            await TvshowDB.assignGenre(tvshowId, 2);

            // Get assigned genres
            const assignedGenres = await TvshowDB.getAssignedGenres(tvshowId);
            expect(assignedGenres).toHaveLength(2);
            expect(assignedGenres.find(g => g.title === 'Drama')).toBeDefined();
            expect(assignedGenres.find(g => g.title === 'Thriller')).toBeDefined();
        });

        test('unassignGenre should remove genre assignment', async () => {
            // Insert tvshow and genre
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Tvshow', 'tvshow', '1232841600000', 1800)");
            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Horror')" }
            ]);

            // Assign and then unassign genre
            await TvshowDB.assignGenre(tvshowId, 1);
            await TvshowDB.unassignGenre(tvshowId, 1);

            const assignedGenres = await TvshowDB.getAssignedGenres(tvshowId);
            expect(assignedGenres).toHaveLength(0);
        });

        test('updateAssignedGenres should update genre assignments', async () => {
            // Insert tvshow and genres
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Tvshow', 'tvshow', '1232841600000', 1800)");

            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (2, 'Comedy')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (3, 'Crime')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (4, 'Sci-Fi')" }
            ]);

            // Initially assign Drama and Comedy
            await TvshowDB.assignGenre(tvshowId, 1);
            await TvshowDB.assignGenre(tvshowId, 2);

            // Update to have Comedy, Crime, and Sci-Fi (remove Drama, add Crime and Sci-Fi, keep Comedy)
            await TvshowDB.updateAssignedGenres(tvshowId, [2, 3, 4]);

            // Verify final state
            const finalGenres = await TvshowDB.getAssignedGenres(tvshowId);
            expect(finalGenres).toHaveLength(3);
            
            const genreTitles = finalGenres.map(g => g.title).sort();
            expect(genreTitles).toEqual(['Comedy', 'Crime', 'Sci-Fi']);
        });

        test('updateAssignedGenres should handle empty arrays', async () => {
            // Insert tvshow and genres
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Tvshow', 'tvshow', '1232841600000', 1800)");

            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (2, 'Comedy')" }
            ]);

            // Initially assign genres
            await TvshowDB.assignGenre(tvshowId, 1);
            await TvshowDB.assignGenre(tvshowId, 2);

            // Update to empty array (should remove all genres)
            await TvshowDB.updateAssignedGenres(tvshowId, []);

            const finalGenres = await TvshowDB.getAssignedGenres(tvshowId);
            expect(finalGenres).toHaveLength(0);
        });
    });

    describe('User-related Methods', () => {
        test('getUserOngoingTvShows should return only ongoing tvshows', async () => {
            // Insert tvshows
            const ongoingId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Ongoing Show', 'tvshow', '1232841600000', 1800)");
            const finishedId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Finished Show', 'tvshow', '1232841600000', 1800)");
            const onholdId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('On Hold Show', 'tvshow', '1232841600000', 1800)");

            // Insert user artifacts with different statuses
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status) VALUES (1, ?, 'ongoing')", params: [ongoingId] },
                { query: "INSERT INTO user_artifact (userId, artifactId, status) VALUES (1, ?, 'finished')", params: [finishedId] },
                { query: "INSERT INTO user_artifact (userId, artifactId, status) VALUES (1, ?, 'onhold')", params: [onholdId] }
            ]);

            // Test ongoing only
            const ongoingTvShows = await TvshowDB.getUserOngoingTvShows(1, false);
            expect(ongoingTvShows).toHaveLength(1);
            expect(ongoingTvShows[0].title).toBe('Ongoing Show');

            // Test ongoing + on hold
            const ongoingAndOnholdTvShows = await TvshowDB.getUserOngoingTvShows(1, true);
            expect(ongoingAndOnholdTvShows).toHaveLength(2);
            expect(ongoingAndOnholdTvShows.find(t => t.title === 'Ongoing Show')).toBeDefined();
            expect(ongoingAndOnholdTvShows.find(t => t.title === 'On Hold Show')).toBeDefined();
        });

        test('getUserOngoingTvShows should fetch seasons and episodes for returned tvshows', async () => {
            // Insert tvshow with seasons and episodes
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Ongoing Show', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);
            
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 1', 'tvshow_episode', ?, 1, '1232841600000', 45)", params: [seasonId] },
                { query: "INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 2', 'tvshow_episode', ?, 2, '1233446400000', 45)", params: [seasonId] }
            ]);

            // Set as ongoing
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status) VALUES (1, ?, 'ongoing')", params: [tvshowId] }
            ]);

            const ongoingTvShows = await TvshowDB.getUserOngoingTvShows(1);
            expect(ongoingTvShows).toHaveLength(1);
            expect(ongoingTvShows[0].children).toHaveLength(1);
            expect(ongoingTvShows[0].children[0].children).toHaveLength(2);
            expect(ongoingTvShows[0].children[0].children[0].title).toBe('Episode 1');
            expect(ongoingTvShows[0].children[0].children[1].title).toBe('Episode 2');
        });

        test('getBacklogItems should return tvshow backlog items', async () => {
            // Create a backlog
            const backlogId = await runDbInsert("INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (1, 'Tvshow Backlog', 'tvshow', 'elo')");
            
            // Create tvshows
            const tvshowId1 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Tvshow A', 'tvshow', '1609459200000', 1800)");
            const tvshowId2 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Tvshow B', 'tvshow', '1577836800000', 2400)");

            // Add items to backlog with different ELO scores
            await runDbQueries([
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1200, '2023-01-01', 1)", params: [backlogId, tvshowId1] },
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1500, '2023-01-02', 2)", params: [backlogId, tvshowId2] }
            ]);

            const items = await TvshowDB.getBacklogItems(backlogId, BacklogRankingType.ELO, BacklogOrder.ELO);
            
            expect(items).toHaveLength(2);
            expect(items[0].artifact).toBeInstanceOf(Tvshow);
            expect(items[0].artifact.title).toBe('Tvshow B'); // Higher ELO first
            expect(items[0].elo).toBe(1500);
            expect(items[1].artifact.title).toBe('Tvshow A');
            expect(items[1].elo).toBe(1200);
        });
    });

    describe('Create Operations', () => {
        test('createTvshow should create new tvshow with all associated data', async () => {
            // Setup genres, links, and ratings
            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (2, 'Crime')" }
            ]);

            const links = [
                new Link(LinkType.TMDB, 'https://themoviedb.org/tv/1234'),
                new Link(LinkType.ROTTEN_TOMATOES, 'https://rottentomatoes.com/tv/test')
            ];

            const ratings = [
                new Rating(RatingType.METACRITIC, 85),
                new Rating(RatingType.ROTTEN_TOMATOES_CRITICS, 92)
            ];

            const releaseDate = new Date('2008-01-20');
            const tvshow = await TvshowDB.createTvshow(
                'Breaking Bad',
                releaseDate,
                2940,
                [1, 2],
                links,
                ratings
            );

            expect(tvshow).toBeInstanceOf(Tvshow);
            expect(tvshow.title).toBe('Breaking Bad');
            expect(tvshow.type).toBe(ArtifactType.TVSHOW);
            expect(tvshow.releaseDate).toEqual(releaseDate);
            expect(tvshow.duration).toBe(2940);

            // Verify genres were assigned
            expect(tvshow.genres).toHaveLength(2);
            expect(tvshow.genres.find(g => g.title === 'Drama')).toBeDefined();
            expect(tvshow.genres.find(g => g.title === 'Crime')).toBeDefined();

            // Verify links were added
            expect(tvshow.links).toHaveLength(2);
            expect(tvshow.links.find(l => l.type === LinkType.TMDB)).toBeDefined();
            expect(tvshow.links.find(l => l.type === LinkType.ROTTEN_TOMATOES)).toBeDefined();

            // Verify ratings were added
            expect(tvshow.ratings).toHaveLength(2);
            expect(tvshow.ratings.find(r => r.type === RatingType.METACRITIC)).toBeDefined();
            expect(tvshow.ratings.find(r => r.type === RatingType.ROTTEN_TOMATOES_CRITICS)).toBeDefined();
        });

        test('createTvshow should work with minimal parameters', async () => {
            const tvshow = await TvshowDB.createTvshow('Minimal Tvshow', new Date(), 0, [], [], []);

            expect(tvshow).toBeInstanceOf(Tvshow);
            expect(tvshow.title).toBe('Minimal Tvshow');
            expect(tvshow.type).toBe(ArtifactType.TVSHOW);
            expect(tvshow.duration).toBe(0);
            expect(tvshow.genres).toHaveLength(0);
            expect(tvshow.links).toHaveLength(0);
            expect(tvshow.ratings).toHaveLength(0);
        });

        test('createTvshowSeason should create new season', async () => {
            // Create parent tvshow
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Show', 'tvshow', '1232841600000', 1800)");

            const seasonDate = new Date('2008-04-08');
            const season = await TvshowDB.createTvshowSeason(tvshowId, 1, 'Season 1', seasonDate, 600);

            expect(season).toBeInstanceOf(TvshowSeason);
            expect(season.title).toBe('Season 1');
            expect(season.type).toBe(ArtifactType.TVSHOW_SEASON);
            expect(season.childIndex).toBe(1);
            expect(season.releaseDate).toEqual(seasonDate);
            expect(season.duration).toBe(600);
        });

        test('createTvshowSeason should work with default parameters', async () => {
            // Create parent tvshow
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Show', 'tvshow', '1232841600000', 1800)");

            const season = await TvshowDB.createTvshowSeason(tvshowId, 2, 'Season 2');

            expect(season).toBeInstanceOf(TvshowSeason);
            expect(season.title).toBe('Season 2');
            expect(season.childIndex).toBe(2);
            expect(season.duration).toBe(0);
            expect(season.releaseDate).toEqual(new Date(7258118400000)); // Default date
        });

        test('createTvshowEpisode should create new episode', async () => {
            // Create parent tvshow and season
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Show', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);

            const episodeDate = new Date('2008-04-15');
            const episode = await TvshowDB.createTvshowEpisode(seasonId, 1, 'Pilot', episodeDate, 45);

            expect(episode).toBeInstanceOf(TvshowEpisode);
            expect(episode.title).toBe('Pilot');
            expect(episode.type).toBe(ArtifactType.TVSHOW_EPISODE);
            expect(episode.childIndex).toBe(1);
            expect(episode.releaseDate).toEqual(episodeDate);
            expect(episode.duration).toBe(45);
        });

        test('createTvshowEpisode should work with default parameters', async () => {
            // Create parent tvshow and season
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Show', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);

            const episode = await TvshowDB.createTvshowEpisode(seasonId, 2, 'Episode 2');

            expect(episode).toBeInstanceOf(TvshowEpisode);
            expect(episode.title).toBe('Episode 2');
            expect(episode.childIndex).toBe(2);
            expect(episode.duration).toBe(0);
            expect(episode.releaseDate).toEqual(new Date(7258118400000)); // Default date
        });
    });

    describe('Update Operations', () => {
        test('updateTvshow should update tvshow properties', async () => {
            // Create tvshow
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Original Title', 'tvshow', '1232841600000', 1800)");

            // Update tvshow
            const newReleaseDate = new Date('2024-01-01');
            await TvshowDB.updateTvshow(tvshowId, 'Updated Title', newReleaseDate, 2400);

            // Verify update
            const tvshow = await TvshowDB.getById(tvshowId);
            expect(tvshow!.title).toBe('Updated Title');
            expect(tvshow!.duration).toBe(2400);
            expect(tvshow!.releaseDate).toEqual(newReleaseDate);
        });

        test('updateTvshow should work with default parameters', async () => {
            // Create tvshow
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Original Title', 'tvshow', '1232841600000', 1800)");

            // Update only title
            await TvshowDB.updateTvshow(tvshowId, 'New Title');

            // Verify update
            const tvshow = await TvshowDB.getById(tvshowId);
            expect(tvshow!.title).toBe('New Title');
            expect(tvshow!.duration).toBe(0); // Default
            expect(tvshow!.releaseDate).toEqual(new Date(7258118400000)); // Default date
        });

        test('updateTvshowSeason should update season properties', async () => {
            // Create parent tvshow and season
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Show', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Original Season', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);

            const newReleaseDate = new Date('2024-02-01');
            
            // Update season
            await TvshowDB.updateTvshowSeason(seasonId, 3, 'Updated Season', newReleaseDate, 700);

            // Verify update
            const updatedArtifact = await ArtifactDB.getArtifactById(seasonId);
            expect(updatedArtifact).not.toBeNull();
            expect(updatedArtifact!.title).toBe('Updated Season');
            expect(updatedArtifact!.child_index).toBe(3);
            expect(updatedArtifact!.releaseDate).toBe(newReleaseDate.getTime().toString());
            expect(updatedArtifact!.duration).toBe(700);
        });

        test('updateTvshowEpisode should update episode properties', async () => {
            // Create parent tvshow, season, and episode
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Show', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);
            const episodeId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Original Episode', 'tvshow_episode', ?, 1, '1232841600000', 45)", [seasonId]);

            const newReleaseDate = new Date('2024-02-01');
            
            // Update episode
            await TvshowDB.updateTvshowEpisode(episodeId, 5, 'Updated Episode', newReleaseDate, 48);

            // Verify update
            const updatedArtifact = await ArtifactDB.getArtifactById(episodeId);
            expect(updatedArtifact).not.toBeNull();
            expect(updatedArtifact!.title).toBe('Updated Episode');
            expect(updatedArtifact!.child_index).toBe(5);
            expect(updatedArtifact!.releaseDate).toBe(newReleaseDate.getTime().toString());
            expect(updatedArtifact!.duration).toBe(48);
        });
    });

    describe('Delete Operations', () => {
        test('deleteTvshow should delete tvshow and all related data', async () => {
            // Create tvshow with seasons and episodes
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Show to Delete', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);
            const episodeId1 = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 1', 'tvshow_episode', ?, 1, '1232841600000', 45)", [seasonId]);
            const episodeId2 = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode 2', 'tvshow_episode', ?, 2, '1233446400000', 45)", [seasonId]);

            // Add genres
            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Drama')" }
            ]);
            await TvshowDB.assignGenre(tvshowId, 1);

            // Add user data
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status, score) VALUES (1, ?, 'finished', 9)", params: [tvshowId] },
                { query: "INSERT INTO user_artifact (userId, artifactId, status, score) VALUES (1, ?, 'finished', 8)", params: [episodeId1] }
            ]);

            // Add ratings and links
            await runDbQueries([
                { query: "INSERT INTO rating (artifactId, type, rating) VALUES (?, 'metacritic', 85)", params: [tvshowId] },
                { query: "INSERT INTO link (artifactId, type, url) VALUES (?, 'tmdb', 'https://example.com/tmdb')", params: [tvshowId] }
            ]);

            // Verify data exists before deletion
            expect(await TvshowDB.getById(tvshowId, true, true)).not.toBeNull();
            expect(await ArtifactDB.getUserInfo(1, tvshowId)).not.toBeNull();
            expect(await TvshowDB.getAssignedGenres(tvshowId)).toHaveLength(1);

            // Delete tvshow
            await TvshowDB.deleteTvshow(tvshowId);

            // Verify deletion
            expect(await TvshowDB.getById(tvshowId)).toBeNull();
            expect(await ArtifactDB.getArtifactById(seasonId)).toBeNull();
            expect(await ArtifactDB.getArtifactById(episodeId1)).toBeNull();
            expect(await ArtifactDB.getArtifactById(episodeId2)).toBeNull();
            expect(await ArtifactDB.getUserInfo(1, tvshowId)).toBeNull();
            expect(await TvshowDB.getAssignedGenres(tvshowId)).toHaveLength(0);
        });

        test('deleteTvshow should handle non-existent tvshow gracefully', async () => {
            // Should not throw error for non-existent tvshow
            await expect(TvshowDB.deleteTvshow(99999)).resolves.not.toThrow();
        });

        test('deleteTvshowEpisode should delete episode', async () => {
            // Create parent tvshow, season, and episode
            const tvshowId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Parent Show', 'tvshow', '1232841600000', 1800)");
            const seasonId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Season 1', 'tvshow_season', ?, 1, '1232841600000', 600)", [tvshowId]);
            const episodeId = await runDbInsert("INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES ('Episode to Delete', 'tvshow_episode', ?, 1, '1232841600000', 45)", [seasonId]);

            // Add user data for episode
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status, score) VALUES (1, ?, 'finished', 8)", params: [episodeId] }
            ]);

            // Delete episode
            await TvshowDB.deleteTvshowEpisode(episodeId);

            // Verify deletion
            expect(await ArtifactDB.getArtifactById(episodeId)).toBeNull();
            expect(await ArtifactDB.getUserInfo(1, episodeId)).toBeNull();

            // Parent tvshow and season should still exist
            expect(await TvshowDB.getById(tvshowId)).not.toBeNull();
            expect(await ArtifactDB.getArtifactById(seasonId)).not.toBeNull();
        });

        test('deleteTvshowEpisode should handle non-existent episode gracefully', async () => {
            // Should not throw error for non-existent episode
            await expect(TvshowDB.deleteTvshowEpisode(99999)).resolves.not.toThrow();
        });
    });

    describe('Table Creation Methods', () => {
        test('createTvshowGenreTable should be callable', () => {
            // These methods are already called in beforeAll, so just verify they don't throw
            expect(() => TvshowDB.createTvshowGenreTable()).not.toThrow();
        });

        test('createTvshowTvshowGenreTable should be callable', () => {
            expect(() => TvshowDB.createTvshowTvshowGenreTable()).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('getById should handle invalid IDs', async () => {
            const result1 = await TvshowDB.getById(-1);
            expect(result1).toBeNull();

            const result2 = await TvshowDB.getById(0);
            expect(result2).toBeNull();
        });

        test('getTvshows should handle edge cases', async () => {
            // Test with large page number
            const result = await TvshowDB.getTvshows(999, 10);
            expect(result).toHaveLength(0);

            // Test with zero page size
            const result2 = await TvshowDB.getTvshows(0, 0);
            expect(result2).toHaveLength(0);
        });

        test('assignGenre should handle non-existent tvshow or genre', async () => {
            // These operations may fail silently or throw - behavior depends on implementation
            // Testing that they don't cause crashes
            await expect(TvshowDB.assignGenre(99999, 1)).resolves.not.toThrow();
        });

        test('updateTvshow should handle non-existent tvshow', async () => {
            // Should complete without error (similar to ArtifactDB behavior)
            await expect(TvshowDB.updateTvshow(99999, 'Non-existent Tvshow'))
                .resolves.not.toThrow();
        });

        test('getUserOngoingTvShows should handle non-existent user', async () => {
            const result = await TvshowDB.getUserOngoingTvShows(99999);
            expect(result).toHaveLength(0);
        });

        test('getBacklogItems should handle non-existent backlog', async () => {
            const result = await TvshowDB.getBacklogItems(99999, BacklogRankingType.ELO, BacklogOrder.ELO);
            expect(result).toHaveLength(0);
        });

        test('createTvshowSeason should handle invalid parent ID', async () => {
            // This might fail or succeed depending on database constraints
            // Test that it doesn't crash the system
            await expect(TvshowDB.createTvshowSeason(99999, 1, 'Test Season'))
                .resolves.not.toThrow();
        });

        test('createTvshowEpisode should handle invalid parent ID', async () => {
            // This might fail or succeed depending on database constraints
            // Test that it doesn't crash the system
            await expect(TvshowDB.createTvshowEpisode(99999, 1, 'Test Episode'))
                .resolves.not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('complete tvshow workflow - create, update, fetch, delete', async () => {
            // Create genres
            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (2, 'Crime')" }
            ]);

            // Create tvshow
            const links = [new Link(LinkType.TMDB, 'https://themoviedb.org/tv/test')];
            const ratings = [new Rating(RatingType.METACRITIC, 90)];
            
            const tvshow = await TvshowDB.createTvshow(
                'Integration Test Show',
                new Date('2008-01-01'),
                2940,
                [1, 2],
                links,
                ratings
            );

            // Create seasons and episodes
            const season1 = await TvshowDB.createTvshowSeason(tvshow.id, 1, 'Season 1', new Date('2008-01-08'), 600);
            const episode1 = await TvshowDB.createTvshowEpisode(season1.id, 1, 'Pilot', new Date('2008-01-15'), 45);
            const episode2 = await TvshowDB.createTvshowEpisode(season1.id, 2, 'Episode 2', new Date('2008-01-22'), 45);

            // Update tvshow
            await TvshowDB.updateTvshow(tvshow.id, 'Updated Integration Test Show', new Date('2008-02-01'), 3000);

            // Update season and episode
            await TvshowDB.updateTvshowSeason(season1.id, 1, 'Updated Season 1', new Date('2008-02-08'), 650);
            await TvshowDB.updateTvshowEpisode(episode1.id, 1, 'Updated Pilot', new Date('2008-02-15'), 48);

            // Fetch with all children
            const fetchedTvshow = await TvshowDB.getById(tvshow.id, true, true);
            expect(fetchedTvshow).not.toBeNull();
            expect(fetchedTvshow!.title).toBe('Updated Integration Test Show');
            expect(fetchedTvshow!.duration).toBe(3000);
            expect(fetchedTvshow!.children).toHaveLength(1);
            expect(fetchedTvshow!.children[0].title).toBe('Updated Season 1');
            expect(fetchedTvshow!.children[0].duration).toBe(650);
            expect(fetchedTvshow!.children[0].children).toHaveLength(2);
            expect(fetchedTvshow!.children[0].children[0].title).toBe('Updated Pilot');
            expect(fetchedTvshow!.children[0].children[0].duration).toBe(48);
            expect(fetchedTvshow!.children[0].children[1].title).toBe('Episode 2');

            // Verify genres
            expect(fetchedTvshow!.genres).toHaveLength(2);
            expect(fetchedTvshow!.genres.find(g => g.title === 'Drama')).toBeDefined();
            expect(fetchedTvshow!.genres.find(g => g.title === 'Crime')).toBeDefined();

            // Delete specific episode
            await TvshowDB.deleteTvshowEpisode(episode2.id);
            
            const tvshowAfterEpisodeDelete = await TvshowDB.getById(tvshow.id, true, true);
            expect(tvshowAfterEpisodeDelete!.children[0].children).toHaveLength(1);
            expect(tvshowAfterEpisodeDelete!.children[0].children[0].title).toBe('Updated Pilot');

            // Delete entire tvshow
            await TvshowDB.deleteTvshow(tvshow.id);
            
            const deletedTvshow = await TvshowDB.getById(tvshow.id);
            expect(deletedTvshow).toBeNull();
            
            // Verify season and episode were also deleted
            expect(await ArtifactDB.getArtifactById(season1.id)).toBeNull();
            expect(await ArtifactDB.getArtifactById(episode1.id)).toBeNull();
        });

        test('tvshow with user interactions workflow', async () => {
            // Create tvshow
            const tvshow = await TvshowDB.createTvshow('User Test Show', new Date(), 0, [], [], []);
            
            // Create seasons and episodes
            const season1 = await TvshowDB.createTvshowSeason(tvshow.id, 1, 'Season 1');
            const episode1 = await TvshowDB.createTvshowEpisode(season1.id, 1, 'Episode 1');
            await TvshowDB.createTvshowEpisode(season1.id, 2, 'Episode 2');

            // Set user status and interactions
            await ArtifactDB.setUserStatus(1, [tvshow.id], UserArtifactStatus.ON_GOING);
            await ArtifactDB.setUserScore(1, tvshow.id, 8);
            await ArtifactDB.setUserStatus(1, [episode1.id], UserArtifactStatus.FINISHED);
            await ArtifactDB.setUserScore(1, episode1.id, 9);

            // Get ongoing tvshows - should include this tvshow with seasons and episodes
            const ongoingTvshows = await TvshowDB.getUserOngoingTvShows(1);
            expect(ongoingTvshows).toHaveLength(1);
            expect(ongoingTvshows[0].title).toBe('User Test Show');
            expect(ongoingTvshows[0].children).toHaveLength(1);
            expect(ongoingTvshows[0].children[0].children).toHaveLength(2);

            // Create backlog and add tvshow
            const backlogId = await runDbInsert("INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (1, 'My Tvshow Backlog', 'tvshow', 'rank')");
            await runDbQueries([
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1300, '2023-01-01', 1)", params: [backlogId, tvshow.id] }
            ]);

            // Get backlog items
            const backlogItems = await TvshowDB.getBacklogItems(backlogId, BacklogRankingType.RANK, BacklogOrder.RANK);
            expect(backlogItems).toHaveLength(1);
            expect(backlogItems[0].artifact.title).toBe('User Test Show');
            expect(backlogItems[0].artifact.genres).toBeDefined(); // Should have loaded genres
            expect(backlogItems[0].artifact.ratings).toBeDefined(); // Should have loaded ratings

            // Update genres
            await runDbQueries([
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (1, 'Comedy')" },
                { query: "INSERT INTO tvshow_genre (id, title) VALUES (2, 'Mockumentary')" }
            ]);
            await TvshowDB.updateAssignedGenres(tvshow.id, [1, 2]);

            // Verify genres updated
            const updatedTvshow = await TvshowDB.getById(tvshow.id);
            expect(updatedTvshow!.genres).toHaveLength(2);
            expect(updatedTvshow!.genres.find(g => g.title === 'Comedy')).toBeDefined();
            expect(updatedTvshow!.genres.find(g => g.title === 'Mockumentary')).toBeDefined();

            // Clean up
            await TvshowDB.deleteTvshow(tvshow.id);
        });
    });
});