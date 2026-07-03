import { IGDB } from "$lib/igdb/IGDB";
import { MAL } from "$lib/mal/MAL";
import { createDatabase } from "$lib/server/database";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { SubscriptionServiceDB } from "$lib/server/model/SubscriptionServiceDB";
import { TagDB } from "$lib/server/model/TagDB";
import { UserArtifactOwnershipDB } from "$lib/server/model/UserArtifactOwnershipDB";
import { UserDB } from "$lib/server/model/UserDB";
import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import { GameDB } from "$lib/server/model/game/GameDB";
import { PlatformDB } from "$lib/server/model/game/PlatformDB";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import { TMDB } from "$lib/tmdb/TMDB";

export class DBUtil {
    static async initDb(): Promise<void> {
        await createDatabase();
        await Promise.all([
            ArtifactDB.createArtifactTable(),
            ArtifactDB.createUserArtifactTable(),
            AnimeDB.createAnimeGenreTable(),
            AnimeDB.createAnimeAnimeGenreTable(),
            BacklogDB.createBacklogTable(),
            BacklogDB.createBacklogItemsTable(),
            BacklogDB.createBacklogItemTagTable(),
            BacklogDB.createBacklogUniqueTypeIndex(),
            GameDB.createGamePlatformTable(),
            GameDB.createGameGenreTable(),
            GameDB.createGameGameGenreTable(),
            GameDB.createGameReleaseDateTable(),
            LinkDB.createLinkTable(),
            MovieDB.createMovieGenreTable(),
            MovieDB.createMovieMovieGenreTable(),
            MovieDB.createMovieReleaseDateTable(),
            PlatformDB.createPlatformTable(),
            RatingDB.createRatingTable(),
            SubscriptionServiceDB.createSubscriptionServiceTable(),
            SubscriptionServiceDB.createSubscriptionServiceTypeTable(),
            SubscriptionServiceDB.createArtifactSubscriptionTable(),
            SubscriptionServiceDB.createUserSubscriptionTable(),
            TagDB.createTagTable(),
            TvshowDB.createTvshowGenreTable(),
            TvshowDB.createTvshowTvshowGenreTable(),
            UserArtifactOwnershipDB.createUserArtifactOwnershipTable(),
            UserDB.createUserTable()
        ]);

        await IGDB.initGenres();
        await IGDB.initPlatforms();
        await MAL.initGenres();
        await TMDB.initMovieGenres();
        await TMDB.initTvshowGenres();
        await SubscriptionServiceDB.seedPredefinedServices();
        // migrateAddUniqueConstraint must run before migrateToMultiType:
        // dedup rows first so that the subsequent column removal doesn't leave orphan duplicates.
        await SubscriptionServiceDB.migrateAddUniqueConstraint();
        await SubscriptionServiceDB.migrateToMultiType();
    }
}