import { IGDB } from "$lib/igdb/IGDB";
import { createDatabase } from "$lib/server/database";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { TagDB } from "$lib/server/model/TagDB";
import { UserDB } from "$lib/server/model/UserDB";
import { UserRatingDB } from "$lib/server/model/UserRatingDB";
import { GameDB } from "$lib/server/model/game/GameDB";
import { PlatformDB } from "$lib/server/model/game/PlatformDB";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import { TMDB } from "$lib/tmdb/TMDB";

export class DBUtil {
    static async initDb(): Promise<void> {
        createDatabase();
        ArtifactDB.createArtifactTable();
        ArtifactDB.createUserArtifactTable();
        BacklogDB.createBacklogTable();
        BacklogDB.createBacklogItemsTable();
        BacklogDB.createBacklogItemTagTable();
        GameDB.createGamePlatformTable();
        GameDB.createGameGenreTable();
        GameDB.createGameGameGenreTable();
        LinkDB.createLinkTable();
        MovieDB.createMovieGenreTable();
        MovieDB.createMovieMovieGenreTable();
        PlatformDB.createPlatformTable();
        RatingDB.createRatingTable();
        TagDB.createTagTable();
        TvshowDB.createTvshowGenreTable();
        TvshowDB.createTvshowTvshowGenreTable();
        UserDB.createUserTable();
        UserRatingDB.createUserRatingTable();

        await IGDB.initGenres();
        await IGDB.initPlatforms();
        await TMDB.initMovieGenres();
        await TMDB.initTvshowGenres();
    }
}