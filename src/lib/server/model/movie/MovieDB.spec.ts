import { runDbInsert, runDbQueries, runDbQueriesParallel } from '../../database';
import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactStatus } from '$lib/model/UserArtifact';
import { Genre } from '$lib/model/Genre';
import { BacklogRankingType, BacklogOrder } from '$lib/model/Backlog';
import { Link, LinkType } from '$lib/model/Link';
import { Rating, RatingType } from '$lib/model/Rating';
import { Movie } from '$lib/model/movie/Movie';
import { MovieDB } from './MovieDB';
import { ArtifactDB } from '../ArtifactDB';
import { BacklogDB } from '../BacklogDB';
import { RatingDB } from '../RatingDB';
import { LinkDB } from '../LinkDB';
import { TagDB } from '../TagDB';

describe('MovieDB', () => {
    // Shared cleanup function to eliminate duplication
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM movie_movie_genre' },
            { query: 'DELETE FROM user_artifact' },
            { query: 'DELETE FROM backlog_items' },
            { query: 'DELETE FROM backlog_item_tag' },
            { query: 'DELETE FROM backlog' },
            { query: 'DELETE FROM rating' },
            { query: 'DELETE FROM link' },
            { query: 'DELETE FROM tag' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM movie_genre' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("artifact", "movie_genre", "backlog", "rating", "link")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema using existing creation methods
        await ArtifactDB.createArtifactTable();
        await ArtifactDB.createUserArtifactTable();
        
        // Create movie-specific tables
        await MovieDB.createMovieGenreTable();
        await MovieDB.createMovieMovieGenreTable();
        
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
        test('getById should return movie by ID', async () => {
            // Insert test movie
            const movieId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Shawshank Redemption', 'movie', '779673600000', 142)");

            const movie = await MovieDB.getById(movieId);
            expect(movie).not.toBeNull();
            expect(movie!.title).toBe('The Shawshank Redemption');
            expect(movie!.type).toBe(ArtifactType.MOVIE);
            expect(movie!.duration).toBe(142);
        });

        test('getById should return null for non-existent ID', async () => {
            const movie = await MovieDB.getById(99999);
            expect(movie).toBeNull();
        });

        test('getMovies should return paginated movies', async () => {
            // Insert test movies
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Godfather', 'movie', '69120000000', 175)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Pulp Fiction', 'movie', '777600000000', 154)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Dark Knight', 'movie', '1216080000000', 152)" }
            ]);

            const movies = await MovieDB.getMovies(0, 10);
            expect(movies).toHaveLength(3);
            expect(movies[0]).toBeInstanceOf(Movie);
            expect(movies.some(m => m.title === 'The Godfather')).toBe(true);
            expect(movies.some(m => m.title === 'Pulp Fiction')).toBe(true);
            expect(movies.some(m => m.title === 'The Dark Knight')).toBe(true);
        });

        test('getMovies should support search functionality', async () => {
            // Insert test movies
            await runDbQueries([
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Star Wars: A New Hope', 'movie', '232992000000', 121)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Star Wars: The Empire Strikes Back', 'movie', '327024000000', 124)" },
                { query: "INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('The Matrix', 'movie', '922838400000', 136)" }
            ]);

            const searchResults = await MovieDB.getMovies(0, 10, 'star wars');
            expect(searchResults).toHaveLength(2);
            expect(searchResults.every(m => m.title.toLowerCase().includes('star wars'))).toBe(true);
        });

        test('getMovies should handle pagination correctly', async () => {
            // Insert multiple movies
            for (let i = 1; i <= 5; i++) {
                await runDbInsert(`INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Movie ${i}', 'movie', '922838400000', 120)`);
            }

            // Test first page
            const firstPage = await MovieDB.getMovies(0, 2);
            expect(firstPage).toHaveLength(2);

            // Test second page
            const secondPage = await MovieDB.getMovies(1, 2);
            expect(secondPage).toHaveLength(2);

            // Test third page (partial)
            const thirdPage = await MovieDB.getMovies(2, 2);
            expect(thirdPage).toHaveLength(1);
        });
    });

    describe('Genre Methods', () => {
        test('getGenreDefinitions should return movie genres', async () => {
            // Insert test genres
            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (2, 'Action')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (3, 'Comedy')" }
            ]);

            const genres = await MovieDB.getGenreDefinitions();
            expect(genres).toHaveLength(3);
            expect(genres[0]).toBeInstanceOf(Genre);
            expect(genres.find(g => g.title === 'Drama')).toBeDefined();
            expect(genres.find(g => g.title === 'Action')).toBeDefined();
            expect(genres.find(g => g.title === 'Comedy')).toBeDefined();
        });

        test('addGenreDefinition should add new movie genre', async () => {
            await MovieDB.addGenreDefinition(10, 'Thriller');

            const genres = await MovieDB.getGenreDefinitions();
            expect(genres).toHaveLength(1);
            expect(genres[0].id).toBe(10);
            expect(genres[0].title).toBe('Thriller');
        });

        test('assignGenre and getAssignedGenres should work together', async () => {
            // Insert movie and genres
            const movieId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Movie', 'movie', '922838400000', 120)");

            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (2, 'Crime')" }
            ]);

            // Assign genres
            await MovieDB.assignGenre(movieId, 1);
            await MovieDB.assignGenre(movieId, 2);

            // Get assigned genres
            const assignedGenres = await MovieDB.getAssignedGenres(movieId);
            expect(assignedGenres).toHaveLength(2);
            expect(assignedGenres.find(g => g.title === 'Drama')).toBeDefined();
            expect(assignedGenres.find(g => g.title === 'Crime')).toBeDefined();
        });

        test('unassignGenre should remove genre assignment', async () => {
            // Insert movie and genre
            const movieId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Movie', 'movie', '922838400000', 120)");
            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Horror')" }
            ]);

            // Assign and then unassign genre
            await MovieDB.assignGenre(movieId, 1);
            await MovieDB.unassignGenre(movieId, 1);

            const assignedGenres = await MovieDB.getAssignedGenres(movieId);
            expect(assignedGenres).toHaveLength(0);
        });

        test('updateAssignedGenres should update genre assignments', async () => {
            // Insert movie and genres
            const movieId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Movie', 'movie', '922838400000', 120)");

            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (2, 'Drama')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (3, 'Thriller')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (4, 'Comedy')" }
            ]);

            // Initially assign Action and Drama
            await MovieDB.assignGenre(movieId, 1);
            await MovieDB.assignGenre(movieId, 2);

            // Update to have Drama, Thriller, and Comedy (remove Action, add Thriller and Comedy, keep Drama)
            await MovieDB.updateAssignedGenres(movieId, [2, 3, 4]);

            // Verify final state
            const finalGenres = await MovieDB.getAssignedGenres(movieId);
            expect(finalGenres).toHaveLength(3);
            
            const genreTitles = finalGenres.map(g => g.title).sort();
            expect(genreTitles).toEqual(['Comedy', 'Drama', 'Thriller']);
        });

        test('updateAssignedGenres should handle empty arrays', async () => {
            // Insert movie and genres
            const movieId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Test Movie', 'movie', '922838400000', 120)");

            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Action')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (2, 'Drama')" }
            ]);

            // Initially assign genres
            await MovieDB.assignGenre(movieId, 1);
            await MovieDB.assignGenre(movieId, 2);

            // Update to empty array (should remove all genres)
            await MovieDB.updateAssignedGenres(movieId, []);

            const finalGenres = await MovieDB.getAssignedGenres(movieId);
            expect(finalGenres).toHaveLength(0);
        });
    });

    describe('User-related Methods', () => {
        test('getBacklogItems should return movie backlog items', async () => {
            // Create a backlog
            const backlogId = await runDbInsert("INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (1, 'Movie Backlog', 'movie', 'elo')");
            
            // Create movies
            const movieId1 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Movie A', 'movie', '1609459200000', 120)");
            const movieId2 = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Movie B', 'movie', '1577836800000', 135)");

            // Add items to backlog with different ELO scores
            await runDbQueries([
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1200, '2023-01-01', 1)", params: [backlogId, movieId1] },
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1500, '2023-01-02', 2)", params: [backlogId, movieId2] }
            ]);

            const items = await MovieDB.getBacklogItems(backlogId, BacklogRankingType.ELO, BacklogOrder.ELO);
            
            expect(items).toHaveLength(2);
            expect(items[0].artifact).toBeInstanceOf(Movie);
            expect(items[0].artifact.title).toBe('Movie B'); // Higher ELO first
            expect(items[0].elo).toBe(1500);
            expect(items[1].artifact.title).toBe('Movie A');
            expect(items[1].elo).toBe(1200);
        });
    });

    describe('Create Operations', () => {
        test('createMovie should create new movie with all associated data', async () => {
            // Setup genres, links, and ratings
            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (2, 'Crime')" }
            ]);

            const links = [
                new Link(LinkType.TMDB, 'https://themoviedb.org/movie/1234'),
                new Link(LinkType.ROTTEN_TOMATOES, 'https://rottentomatoes.com/m/test')
            ];

            const ratings = [
                new Rating(RatingType.METACRITIC, 85),
                new Rating(RatingType.ROTTEN_TOMATOES_CRITICS, 92)
            ];

            const releaseDate = new Date('1994-10-14');
            const movie = await MovieDB.createMovie(
                'The Shawshank Redemption',
                releaseDate,
                142,
                [1, 2],
                links,
                ratings
            );

            expect(movie).toBeInstanceOf(Movie);
            expect(movie.title).toBe('The Shawshank Redemption');
            expect(movie.type).toBe(ArtifactType.MOVIE);
            expect(movie.releaseDate).toEqual(releaseDate);
            expect(movie.duration).toBe(142);

            // Verify genres were assigned
            expect(movie.genres).toHaveLength(2);
            expect(movie.genres.find(g => g.title === 'Drama')).toBeDefined();
            expect(movie.genres.find(g => g.title === 'Crime')).toBeDefined();

            // Verify links were added
            expect(movie.links).toHaveLength(2);
            expect(movie.links.find(l => l.type === LinkType.TMDB)).toBeDefined();
            expect(movie.links.find(l => l.type === LinkType.ROTTEN_TOMATOES)).toBeDefined();

            // Verify ratings were added
            expect(movie.ratings).toHaveLength(2);
            expect(movie.ratings.find(r => r.type === RatingType.METACRITIC)).toBeDefined();
            expect(movie.ratings.find(r => r.type === RatingType.ROTTEN_TOMATOES_CRITICS)).toBeDefined();
        });

        test('createMovie should work with minimal parameters', async () => {
            const movie = await MovieDB.createMovie('Minimal Movie', new Date(), 0, [], [], []);

            expect(movie).toBeInstanceOf(Movie);
            expect(movie.title).toBe('Minimal Movie');
            expect(movie.type).toBe(ArtifactType.MOVIE);
            expect(movie.duration).toBe(0);
            expect(movie.genres).toHaveLength(0);
            expect(movie.links).toHaveLength(0);
            expect(movie.ratings).toHaveLength(0);
        });
    });

    describe('Update Operations', () => {
        test('updateMovie should update movie properties', async () => {
            // Create movie
            const movieId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Original Title', 'movie', '922838400000', 120)");

            // Update movie
            const newReleaseDate = new Date('2024-01-01');
            await MovieDB.updateMovie(movieId, 'Updated Title', newReleaseDate, 150);

            // Verify update
            const movie = await MovieDB.getById(movieId);
            expect(movie!.title).toBe('Updated Title');
            expect(movie!.duration).toBe(150);
            expect(movie!.releaseDate).toEqual(newReleaseDate);
        });

        test('updateMovie should work with default parameters', async () => {
            // Create movie
            const movieId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Original Title', 'movie', '922838400000', 120)");

            // Update only title
            await MovieDB.updateMovie(movieId, 'New Title');

            // Verify update
            const movie = await MovieDB.getById(movieId);
            expect(movie!.title).toBe('New Title');
            expect(movie!.duration).toBe(0); // Default
            expect(movie!.releaseDate).toEqual(new Date(7258118400000)); // Default date
        });
    });

    describe('Delete Operations', () => {
        test('deleteMovie should delete movie and all related data', async () => {
            // Create movie
            const movieId = await runDbInsert("INSERT INTO artifact (title, type, releaseDate, duration) VALUES ('Movie to Delete', 'movie', '922838400000', 120)");

            // Add genres
            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Action')" }
            ]);
            await MovieDB.assignGenre(movieId, 1);

            // Add user data
            await runDbQueries([
                { query: "INSERT INTO user_artifact (userId, artifactId, status, score) VALUES (1, ?, 'finished', 9)", params: [movieId] }
            ]);

            // Add ratings and links
            await runDbQueries([
                { query: "INSERT INTO rating (artifactId, type, rating) VALUES (?, 'tmdb', 85)", params: [movieId] },
                { query: "INSERT INTO link (artifactId, type, url) VALUES (?, 'tmdb', 'https://example.com/tmdb')", params: [movieId] }
            ]);

            // Verify data exists before deletion
            expect(await MovieDB.getById(movieId)).not.toBeNull();
            expect(await ArtifactDB.getUserInfo(1, movieId)).not.toBeNull();
            expect(await MovieDB.getAssignedGenres(movieId)).toHaveLength(1);

            // Delete movie
            await MovieDB.deleteMovie(movieId);

            // Verify deletion
            expect(await MovieDB.getById(movieId)).toBeNull();
            expect(await ArtifactDB.getUserInfo(1, movieId)).toBeNull();
            expect(await MovieDB.getAssignedGenres(movieId)).toHaveLength(0);
        });

        test('deleteMovie should handle non-existent movie gracefully', async () => {
            // Should not throw error for non-existent movie
            await expect(MovieDB.deleteMovie(99999)).resolves.not.toThrow();
        });
    });

    describe('Table Creation Methods', () => {
        test('createMovieGenreTable should be callable', () => {
            // These methods are already called in beforeAll, so just verify they don't throw
            expect(() => MovieDB.createMovieGenreTable()).not.toThrow();
        });

        test('createMovieMovieGenreTable should be callable', () => {
            expect(() => MovieDB.createMovieMovieGenreTable()).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        test('getById should handle invalid IDs', async () => {
            const result1 = await MovieDB.getById(-1);
            expect(result1).toBeNull();

            const result2 = await MovieDB.getById(0);
            expect(result2).toBeNull();
        });

        test('getMovies should handle edge cases', async () => {
            // Test with large page number
            const result = await MovieDB.getMovies(999, 10);
            expect(result).toHaveLength(0);

            // Test with zero page size
            const result2 = await MovieDB.getMovies(0, 0);
            expect(result2).toHaveLength(0);
        });

        test('assignGenre should handle non-existent movie or genre', async () => {
            // These operations may fail silently or throw - behavior depends on implementation
            // Testing that they don't cause crashes
            await expect(MovieDB.assignGenre(99999, 1)).resolves.not.toThrow();
        });

        test('updateMovie should handle non-existent movie', async () => {
            // Should complete without error (similar to ArtifactDB behavior)
            await expect(MovieDB.updateMovie(99999, 'Non-existent Movie'))
                .resolves.not.toThrow();
        });

        test('getBacklogItems should handle non-existent backlog', async () => {
            const result = await MovieDB.getBacklogItems(99999, BacklogRankingType.ELO, BacklogOrder.ELO);
            expect(result).toHaveLength(0);
        });
    });

    describe('Integration Tests', () => {
        test('complete movie workflow - create, update, fetch, delete', async () => {
            // Create genres
            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Sci-Fi')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (2, 'Action')" }
            ]);

            // Create movie
            const links = [new Link(LinkType.TMDB, 'https://themoviedb.org/movie/test')];
            const ratings = [new Rating(RatingType.METACRITIC, 87)];
            
            const movie = await MovieDB.createMovie(
                'Integration Test Movie',
                new Date('2023-01-01'),
                150,
                [1, 2],
                links,
                ratings
            );

            // Update movie
            await MovieDB.updateMovie(movie.id, 'Updated Integration Test Movie', new Date('2023-02-01'), 165);

            // Update genres
            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (3, 'Thriller')" }
            ]);
            await MovieDB.updateAssignedGenres(movie.id, [2, 3]); // Keep Action, add Thriller, remove Sci-Fi

            // Fetch updated movie
            const fetchedMovie = await MovieDB.getById(movie.id);
            expect(fetchedMovie).not.toBeNull();
            expect(fetchedMovie!.title).toBe('Updated Integration Test Movie');
            expect(fetchedMovie!.duration).toBe(165);

            // Verify genres
            expect(fetchedMovie!.genres).toHaveLength(2);
            const genreTitles = fetchedMovie!.genres.map(g => g.title).sort();
            expect(genreTitles).toEqual(['Action', 'Thriller']);

            // Delete movie
            await MovieDB.deleteMovie(movie.id);
            
            const deletedMovie = await MovieDB.getById(movie.id);
            expect(deletedMovie).toBeNull();
        });

        test('movie with user interactions workflow', async () => {
            // Create movie
            const movie = await MovieDB.createMovie('User Test Movie', new Date(), 0, [], [], []);
            
            // Set user status and interactions
            await ArtifactDB.setUserStatus(1, [movie.id], UserArtifactStatus.FINISHED);
            await ArtifactDB.setUserScore(1, movie.id, 8);

            // Create backlog and add movie
            const backlogId = await runDbInsert("INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (1, 'My Movie Backlog', 'movie', 'rank')");
            await runDbQueries([
                { query: "INSERT INTO backlog_items (backlogId, artifactId, elo, dateAdded, rank) VALUES (?, ?, 1300, '2023-01-01', 1)", params: [backlogId, movie.id] }
            ]);

            // Get backlog items
            const backlogItems = await MovieDB.getBacklogItems(backlogId, BacklogRankingType.RANK, BacklogOrder.RANK);
            expect(backlogItems).toHaveLength(1);
            expect(backlogItems[0].artifact.title).toBe('User Test Movie');
            expect(backlogItems[0].artifact.genres).toBeDefined(); // Should have loaded genres
            expect(backlogItems[0].artifact.ratings).toBeDefined(); // Should have loaded ratings

            // Update genres
            await runDbQueries([
                { query: "INSERT INTO movie_genre (id, title) VALUES (1, 'Drama')" },
                { query: "INSERT INTO movie_genre (id, title) VALUES (2, 'Romance')" }
            ]);
            await MovieDB.updateAssignedGenres(movie.id, [1, 2]);

            // Verify updates
            const updatedMovie = await MovieDB.getById(movie.id);
            expect(updatedMovie!.genres).toHaveLength(2);
            expect(updatedMovie!.genres.find(g => g.title === 'Drama')).toBeDefined();
            expect(updatedMovie!.genres.find(g => g.title === 'Romance')).toBeDefined();

            // Clean up
            await MovieDB.deleteMovie(movie.id);
        });
    });
});