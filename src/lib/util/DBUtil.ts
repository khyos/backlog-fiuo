import { IGDB } from "$lib/igdb/IGDB";
import { MAL } from "$lib/mal/MAL";
import { createDatabase } from "$lib/server/database";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { TagDB } from "$lib/server/model/TagDB";
import { UserDB } from "$lib/server/model/UserDB";
import { UserRatingDB } from "$lib/server/model/UserRatingDB";
import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import { GameDB } from "$lib/server/model/game/GameDB";
import { PlatformDB } from "$lib/server/model/game/PlatformDB";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import { TMDB } from "$lib/tmdb/TMDB";

export class DBUtil {
    static async initDb(): Promise<void> {
        createDatabase();
        await Promise.all([
            ArtifactDB.createArtifactTable(),
            ArtifactDB.createUserArtifactTable(),
            AnimeDB.createAnimeGenreTable(),
            AnimeDB.createAnimeAnimeGenreTable(),
            BacklogDB.createBacklogTable(),
            BacklogDB.createBacklogItemsTable(),
            BacklogDB.createBacklogItemTagTable(),
            BacklogDB.createWishlistEloTable(),
            BacklogDB.createUserWishlistPreferencesTable(),
            BacklogDB.createWishlistRankTable(),
            GameDB.createGamePlatformTable(),
            GameDB.createGameGenreTable(),
            GameDB.createGameGameGenreTable(),
            LinkDB.createLinkTable(),
            MovieDB.createMovieGenreTable(),
            MovieDB.createMovieMovieGenreTable(),
            PlatformDB.createPlatformTable(),
            RatingDB.createRatingTable(),
            TagDB.createTagTable(),
            TvshowDB.createTvshowGenreTable(),
            TvshowDB.createTvshowTvshowGenreTable(),
            UserDB.createUserTable(),
            UserRatingDB.createUserRatingTable()
        ]);

        await IGDB.initGenres();
        await IGDB.initPlatforms();
        await MAL.initGenres();
        await TMDB.initMovieGenres();
        await TMDB.initTvshowGenres();
    }
}