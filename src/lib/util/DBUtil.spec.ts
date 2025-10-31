import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DBUtil } from './DBUtil';
import { createDatabase } from '$lib/server/database';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';
import { BacklogDB } from '$lib/server/model/BacklogDB';
import { LinkDB } from '$lib/server/model/LinkDB';
import { RatingDB } from '$lib/server/model/RatingDB';
import { TagDB } from '$lib/server/model/TagDB';
import { UserDB } from '$lib/server/model/UserDB';
import { UserRatingDB } from '$lib/server/model/UserRatingDB';
import { AnimeDB } from '$lib/server/model/anime/AnimeDB';
import { GameDB } from '$lib/server/model/game/GameDB';
import { PlatformDB } from '$lib/server/model/game/PlatformDB';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';
import { IGDB } from '$lib/igdb/IGDB';
import { MAL } from '$lib/mal/MAL';
import { TMDB } from '$lib/tmdb/TMDB';

// Mock all dependencies
vi.mock('$lib/server/database');
vi.mock('$lib/server/model/ArtifactDB');
vi.mock('$lib/server/model/BacklogDB');
vi.mock('$lib/server/model/LinkDB');
vi.mock('$lib/server/model/RatingDB');
vi.mock('$lib/server/model/TagDB');
vi.mock('$lib/server/model/UserDB');
vi.mock('$lib/server/model/UserRatingDB');
vi.mock('$lib/server/model/anime/AnimeDB');
vi.mock('$lib/server/model/game/GameDB');
vi.mock('$lib/server/model/game/PlatformDB');
vi.mock('$lib/server/model/movie/MovieDB');
vi.mock('$lib/server/model/tvshow/TvshowDB');
vi.mock('$lib/igdb/IGDB');
vi.mock('$lib/mal/MAL');
vi.mock('$lib/tmdb/TMDB');

describe('DBUtil', () => {
    describe('initDb', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should create database and initialize all tables', async () => {
            await DBUtil.initDb();

            // Verify database creation
            expect(createDatabase).toHaveBeenCalled();

            // Verify table creation calls
            expect(ArtifactDB.createArtifactTable).toHaveBeenCalled();
            expect(ArtifactDB.createUserArtifactTable).toHaveBeenCalled();
            expect(AnimeDB.createAnimeGenreTable).toHaveBeenCalled();
            expect(AnimeDB.createAnimeAnimeGenreTable).toHaveBeenCalled();
            expect(BacklogDB.createBacklogTable).toHaveBeenCalled();
            expect(BacklogDB.createBacklogItemsTable).toHaveBeenCalled();
            expect(BacklogDB.createBacklogItemTagTable).toHaveBeenCalled();
            expect(GameDB.createGamePlatformTable).toHaveBeenCalled();
            expect(GameDB.createGameGenreTable).toHaveBeenCalled();
            expect(GameDB.createGameGameGenreTable).toHaveBeenCalled();
            expect(LinkDB.createLinkTable).toHaveBeenCalled();
            expect(MovieDB.createMovieGenreTable).toHaveBeenCalled();
            expect(MovieDB.createMovieMovieGenreTable).toHaveBeenCalled();
            expect(PlatformDB.createPlatformTable).toHaveBeenCalled();
            expect(RatingDB.createRatingTable).toHaveBeenCalled();
            expect(TagDB.createTagTable).toHaveBeenCalled();
            expect(TvshowDB.createTvshowGenreTable).toHaveBeenCalled();
            expect(TvshowDB.createTvshowTvshowGenreTable).toHaveBeenCalled();
            expect(UserDB.createUserTable).toHaveBeenCalled();
            expect(UserRatingDB.createUserRatingTable).toHaveBeenCalled();

            // Verify external API initializations
            expect(IGDB.initGenres).toHaveBeenCalled();
            expect(IGDB.initPlatforms).toHaveBeenCalled();
            expect(MAL.initGenres).toHaveBeenCalled();
            expect(TMDB.initMovieGenres).toHaveBeenCalled();
            expect(TMDB.initTvshowGenres).toHaveBeenCalled();
        });

        it('should handle errors during initialization', async () => {
            const error = new Error('Database creation failed');
            vi.mocked(createDatabase).mockImplementation(() => {
                throw error;
            });

            await expect(DBUtil.initDb()).rejects.toThrow('Database creation failed');
        });
    });
});