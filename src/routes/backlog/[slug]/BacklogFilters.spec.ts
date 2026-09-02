import { describe, it, expect } from 'vitest';
import { ArtifactType } from '$lib/model/Artifact';
import { BacklogItem } from '$lib/model/BacklogItem';
import { Game } from '$lib/model/game/Game';
import { Movie } from '$lib/model/movie/Movie';
import { Anime } from '$lib/model/anime/Anime';
import { Tvshow } from '$lib/model/tvshow/Tvshow';
import { Platform } from '$lib/model/game/Platform';
import { UserArtifact, UserArtifactStatus } from '$lib/model/UserArtifact';
import { BacklogOrder, BacklogRankingType } from '$lib/model/Backlog';
import type { BacklogFilters } from './BacklogFilters';
import { createBacklogFilters, filterBacklogItems } from './BacklogFilters';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a BacklogFilters where every filter except ownedOrAvailable is a no-op. */
function makeFilters(ownedOrAvailable: boolean): BacklogFilters {
    return {
        orderBy: { type: BacklogOrder.RANK, direction: 'asc' },
        duration: { max: 200, absoluteMax: 200, unit: 'hours' },
        genres: { included: [], excluded: [] },
        platforms: { included: [] },
        rating: { min: 0 },
        releaseDate: { min: 1970, max: 2030, absoluteMin: 1970, absoluteMax: 2030 },
        tags: { included: [], excluded: [] },
        ownedOrAvailable,
    };
}

/** Builds a BacklogItem backed by a Game artifact. */
function makeGameItem(id: number, userInfo: UserArtifact | null): BacklogItem {
    const game = new Game(id, `Game ${id}`, ArtifactType.GAME, new Date('2020-01-01'), 10);
    game.userInfo = userInfo;
    return new BacklogItem(id, 1000, Date.now(), game, []);
}

/** Builds a BacklogItem backed by a Movie artifact. */
function makeMovieItem(id: number, userInfo: UserArtifact | null): BacklogItem {
    const movie = new Movie(id, `Movie ${id}`, ArtifactType.MOVIE, new Date('2020-01-01'), 120);
    movie.userInfo = userInfo;
    return new BacklogItem(id, 1000, Date.now(), movie, []);
}

/** Builds a UserArtifact with the given ownerships and subscriptions arrays. */
function makeUserInfo(
    ownerships: object[],
    availableSubscriptions: object[]
): UserArtifact {
    return new UserArtifact(
        1, 1,
        UserArtifactStatus.WISHLIST,
        null, null, null,
        // Cast to the expected array types — the filter only checks .length, not shape.
        ownerships as never,
        availableSubscriptions as never
    );
}

// ---------------------------------------------------------------------------
// Contract: filterBacklogItems — ownedOrAvailable flag
// ---------------------------------------------------------------------------

describe('filterBacklogItems — ownedOrAvailable: false (default)', () => {
    // When ownedOrAvailable is false, the filter has no effect on any item
    // regardless of whether userInfo is null, empty, or populated.

    it('passes items where userInfo is null', () => {
        const items = [makeGameItem(1, null)];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(false));
        expect(result).toHaveLength(1);
    });

    it('passes items where ownerships and availableSubscriptions are both empty', () => {
        const items = [makeGameItem(1, makeUserInfo([], []))];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(false));
        expect(result).toHaveLength(1);
    });

    it('passes items where ownerships is non-empty', () => {
        const items = [makeGameItem(1, makeUserInfo([{ id: 10 }], []))];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(false));
        expect(result).toHaveLength(1);
    });

    it('passes items where availableSubscriptions is non-empty', () => {
        const items = [makeGameItem(1, makeUserInfo([], [{ id: 20 }]))];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(false));
        expect(result).toHaveLength(1);
    });

    it('passes all items in a mixed set', () => {
        const items = [
            makeGameItem(1, null),
            makeGameItem(2, makeUserInfo([], [])),
            makeGameItem(3, makeUserInfo([{ id: 10 }], [])),
        ];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(false));
        expect(result).toHaveLength(3);
    });
});

describe('filterBacklogItems — ownedOrAvailable: true, artifactType GAME', () => {
    // When ownedOrAvailable is true and the artifact type is GAME, only items
    // where userInfo is non-null AND (ownerships OR availableSubscriptions is
    // non-empty) are kept.

    it('excludes items where userInfo is null', () => {
        const items = [makeGameItem(1, null)];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(true));
        expect(result).toHaveLength(0);
    });

    it('includes items where ownerships is non-empty', () => {
        const items = [makeGameItem(1, makeUserInfo([{ id: 10 }], []))];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(true));
        expect(result).toHaveLength(1);
    });

    it('includes items where availableSubscriptions is non-empty', () => {
        const items = [makeGameItem(1, makeUserInfo([], [{ id: 20 }]))];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(true));
        expect(result).toHaveLength(1);
    });

    it('excludes items where both ownerships and availableSubscriptions are empty', () => {
        const items = [makeGameItem(1, makeUserInfo([], []))];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(true));
        expect(result).toHaveLength(0);
    });

    it('includes items where both ownerships and availableSubscriptions are non-empty', () => {
        const items = [makeGameItem(1, makeUserInfo([{ id: 10 }], [{ id: 20 }]))];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(true));
        expect(result).toHaveLength(1);
    });

    it('filters a mixed set correctly, keeping only owned or subscription items', () => {
        const items = [
            makeGameItem(1, null),                              // null userInfo  → excluded
            makeGameItem(2, makeUserInfo([], [])),              // neither        → excluded
            makeGameItem(3, makeUserInfo([{ id: 10 }], [])),   // owned          → included
            makeGameItem(4, makeUserInfo([], [{ id: 20 }])),   // available      → included
            makeGameItem(5, makeUserInfo([{ id: 10 }], [{ id: 20 }])), // both  → included
        ];
        const result = filterBacklogItems(items, ArtifactType.GAME, makeFilters(true));
        expect(result).toHaveLength(3);
        const ids = result.map((item) => item.rank);
        expect(ids).toContain(3);
        expect(ids).toContain(4);
        expect(ids).toContain(5);
    });
});

describe('filterBacklogItems — ownedOrAvailable: true, non-GAME artifact type', () => {
    // The ownership filter is a general item-level check. It still applies to
    // movies/anime/tv shows, even though platform filtering remains GAME-only.

    it('excludes a Movie item when userInfo is null', () => {
        const items = [makeMovieItem(1, null)];
        const result = filterBacklogItems(items, ArtifactType.MOVIE, makeFilters(true));
        expect(result).toHaveLength(0);
    });

    it('excludes a Movie item when ownerships and availableSubscriptions are both empty', () => {
        const items = [makeMovieItem(1, makeUserInfo([], []))];
        const result = filterBacklogItems(items, ArtifactType.MOVIE, makeFilters(true));
        expect(result).toHaveLength(0);
    });

    it('keeps only Movie items that are owned or available in a mixed set', () => {
        const items = [
            makeMovieItem(1, null),
            makeMovieItem(2, makeUserInfo([], [])),
            makeMovieItem(3, makeUserInfo([{ id: 10 }], [])),
            makeMovieItem(4, makeUserInfo([], [{ id: 20 }])),
        ];
        const result = filterBacklogItems(items, ArtifactType.MOVIE, makeFilters(true));
        expect(result).toHaveLength(2);
        const ids = result.map((item) => item.rank);
        expect(ids).toContain(3);
        expect(ids).toContain(4);
    });
});

describe('filterBacklogItems — ownedOrAvailable composes with other filters (AND)', () => {
    // The ownedOrAvailable filter must compose with other active filters as AND:
    // an item must satisfy all active filters to be included.

    it('excludes a game that is owned but does not match a required genre', () => {
        const game = new Game(1, 'Game 1', ArtifactType.GAME, new Date('2020-01-01'), 10);
        game.userInfo = makeUserInfo([{ id: 10 }], []);  // owned
        game.genres = [];  // no genres → won't match genres.included = [42]
        const item = new BacklogItem(1, 1000, Date.now(), game, []);

        const filters: BacklogFilters = {
            ...makeFilters(true),
            genres: { included: [42], excluded: [] },  // genre filter also active
        };

        const result = filterBacklogItems([item], ArtifactType.GAME, filters);
        expect(result).toHaveLength(0);
    });

    it('includes a game that is owned AND matches the required genre', () => {
        const game = new Game(1, 'Game 1', ArtifactType.GAME, new Date('2020-01-01'), 10);
        game.userInfo = makeUserInfo([{ id: 10 }], []);  // owned
        // Assign a plain genre-shaped object since we only need genre.id for the filter
        game.genres = [{ id: 42 }] as never;
        const item = new BacklogItem(1, 1000, Date.now(), game, []);

        const filters: BacklogFilters = {
            ...makeFilters(true),
            genres: { included: [42], excluded: [] },
        };

        const result = filterBacklogItems([item], ArtifactType.GAME, filters);
        expect(result).toHaveLength(1);
    });

    it('excludes a game with matching genre but no ownership when ownedOrAvailable is true', () => {
        const game = new Game(2, 'Game 2', ArtifactType.GAME, new Date('2020-01-01'), 10);
        game.userInfo = makeUserInfo([], []);  // not owned / not available
        game.genres = [{ id: 42 }] as never;
        const item = new BacklogItem(2, 1000, Date.now(), game, []);

        const filters: BacklogFilters = {
            ...makeFilters(true),
            genres: { included: [42], excluded: [] },
        };

        const result = filterBacklogItems([item], ArtifactType.GAME, filters);
        expect(result).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Standards tests: createBacklogFilters — ownedOrAvailable initialisation
// These paths are only visible by reading the implementation.
// ---------------------------------------------------------------------------

describe('createBacklogFilters — ownedOrAvailable always initialises to false', () => {
    it('is false for GAME with RANK ranking', () => {
        const filters = createBacklogFilters(ArtifactType.GAME, BacklogRankingType.RANK);
        expect(filters.ownedOrAvailable).toBe(false);
    });

    it('is false for GAME with ELO ranking', () => {
        const filters = createBacklogFilters(ArtifactType.GAME, BacklogRankingType.ELO);
        expect(filters.ownedOrAvailable).toBe(false);
    });

    it('is false for GAME with WISHLIST ranking', () => {
        const filters = createBacklogFilters(ArtifactType.GAME, BacklogRankingType.WISHLIST);
        expect(filters.ownedOrAvailable).toBe(false);
    });

    it('is false for MOVIE', () => {
        const filters = createBacklogFilters(ArtifactType.MOVIE, BacklogRankingType.RANK);
        expect(filters.ownedOrAvailable).toBe(false);
    });

    it('is false for ANIME', () => {
        const filters = createBacklogFilters(ArtifactType.ANIME, BacklogRankingType.RANK);
        expect(filters.ownedOrAvailable).toBe(false);
    });

    it('is false for TVSHOW', () => {
        const filters = createBacklogFilters(ArtifactType.TVSHOW, BacklogRankingType.RANK);
        expect(filters.ownedOrAvailable).toBe(false);
    });
});

describe('createBacklogFilters — platforms field presence', () => {
    // The implementation only adds platforms for GAME; other types leave it undefined.
    // filterBacklogItems guards with `filters.platforms &&`, so undefined is safe.

    it('GAME type includes platforms field initialised to empty array', () => {
        const filters = createBacklogFilters(ArtifactType.GAME, BacklogRankingType.RANK);
        expect(filters.platforms).toBeDefined();
        expect(filters.platforms?.included).toEqual([]);
    });

    it('MOVIE type has platforms field as undefined', () => {
        const filters = createBacklogFilters(ArtifactType.MOVIE, BacklogRankingType.RANK);
        expect(filters.platforms).toBeUndefined();
    });

    it('ANIME type has platforms field as undefined', () => {
        const filters = createBacklogFilters(ArtifactType.ANIME, BacklogRankingType.RANK);
        expect(filters.platforms).toBeUndefined();
    });

    it('TVSHOW type has platforms field as undefined', () => {
        const filters = createBacklogFilters(ArtifactType.TVSHOW, BacklogRankingType.RANK);
        expect(filters.platforms).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Standards tests: filterBacklogItems — non-GAME types bypass ownedOrAvailable
// The guard is `if (artifactType === ArtifactType.GAME && ...)` so ANIME and
// TVSHOW are not tested by the TDD suite (which only verified MOVIE).
// ---------------------------------------------------------------------------

describe('filterBacklogItems — ownedOrAvailable: true, artifactType ANIME', () => {
    function makeAnimeItem(id: number, userInfo: UserArtifact | null): BacklogItem {
        const anime = new Anime(id, `Anime ${id}`, ArtifactType.ANIME, new Date('2020-01-01'), 24);
        anime.userInfo = userInfo;
        return new BacklogItem(id, 1000, Date.now(), anime, []);
    }

    it('excludes an ANIME item where userInfo is null', () => {
        const items = [makeAnimeItem(1, null)];
        const result = filterBacklogItems(items, ArtifactType.ANIME, makeFilters(true));
        expect(result).toHaveLength(0);
    });

    it('excludes an ANIME item where ownerships and availableSubscriptions are both empty', () => {
        const items = [makeAnimeItem(1, makeUserInfo([], []))];
        const result = filterBacklogItems(items, ArtifactType.ANIME, makeFilters(true));
        expect(result).toHaveLength(0);
    });
});

describe('filterBacklogItems — ownedOrAvailable: true, artifactType TVSHOW', () => {
    function makeTvshowItem(id: number, userInfo: UserArtifact | null): BacklogItem {
        const tvshow = new Tvshow(id, `Show ${id}`, ArtifactType.TVSHOW, new Date('2020-01-01'), 60);
        tvshow.userInfo = userInfo;
        return new BacklogItem(id, 1000, Date.now(), tvshow, []);
    }

    it('excludes a TVSHOW item where userInfo is null', () => {
        const items = [makeTvshowItem(1, null)];
        const result = filterBacklogItems(items, ArtifactType.TVSHOW, makeFilters(true));
        expect(result).toHaveLength(0);
    });

    it('excludes a TVSHOW item where ownerships and availableSubscriptions are both empty', () => {
        const items = [makeTvshowItem(1, makeUserInfo([], []))];
        const result = filterBacklogItems(items, ArtifactType.TVSHOW, makeFilters(true));
        expect(result).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Standards tests: filterBacklogItems — empty items array
// ---------------------------------------------------------------------------

describe('filterBacklogItems — empty items array', () => {
    it('returns an empty array when items is empty and ownedOrAvailable is true', () => {
        const result = filterBacklogItems([], ArtifactType.GAME, makeFilters(true));
        expect(result).toEqual([]);
    });

    it('returns an empty array when items is empty and ownedOrAvailable is false', () => {
        const result = filterBacklogItems([], ArtifactType.GAME, makeFilters(false));
        expect(result).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Standards tests: filterBacklogItems — ownedOrAvailable composes with platform filter
// Both are GAME-only filters; the implementation applies platform filter before
// ownedOrAvailable. Both must be satisfied for an item to survive.
// ---------------------------------------------------------------------------

describe('filterBacklogItems — ownedOrAvailable composes with platform filter (GAME)', () => {
    const PLATFORM_ID = 5;

    function makeGameItemWithPlatform(
        id: number,
        userInfo: UserArtifact | null,
        platformIds: number[]
    ): BacklogItem {
        const game = new Game(id, `Game ${id}`, ArtifactType.GAME, new Date('2020-01-01'), 10);
        game.userInfo = userInfo;
        game.platforms = platformIds.map((pid) => new Platform(pid, `Platform ${pid}`));
        return new BacklogItem(id, 1000, Date.now(), game, []);
    }

    function makeFiltersWithPlatform(ownedOrAvailable: boolean): BacklogFilters {
        return {
            ...makeFilters(ownedOrAvailable),
            platforms: { included: [PLATFORM_ID] },
        };
    }

    it('excludes a game that is owned but does not have the required platform', () => {
        const item = makeGameItemWithPlatform(1, makeUserInfo([{ id: 99 }], []), [999]);
        const result = filterBacklogItems([item], ArtifactType.GAME, makeFiltersWithPlatform(true));
        expect(result).toHaveLength(0);
    });

    it('excludes a game that has the required platform but is neither owned nor available', () => {
        const item = makeGameItemWithPlatform(2, makeUserInfo([], []), [PLATFORM_ID]);
        const result = filterBacklogItems([item], ArtifactType.GAME, makeFiltersWithPlatform(true));
        expect(result).toHaveLength(0);
    });

    it('includes a game that has the required platform AND is owned', () => {
        const item = makeGameItemWithPlatform(3, makeUserInfo([{ id: 99 }], []), [PLATFORM_ID]);
        const result = filterBacklogItems([item], ArtifactType.GAME, makeFiltersWithPlatform(true));
        expect(result).toHaveLength(1);
    });

    it('includes a game that has the required platform AND is available on a subscription', () => {
        const item = makeGameItemWithPlatform(4, makeUserInfo([], [{ id: 77 }]), [PLATFORM_ID]);
        const result = filterBacklogItems([item], ArtifactType.GAME, makeFiltersWithPlatform(true));
        expect(result).toHaveLength(1);
    });

    it('excludes a game where userInfo is null even when the platform matches', () => {
        const item = makeGameItemWithPlatform(5, null, [PLATFORM_ID]);
        const result = filterBacklogItems([item], ArtifactType.GAME, makeFiltersWithPlatform(true));
        expect(result).toHaveLength(0);
    });
});
