# CLAUDE.md — backlog-fiuo

Personal entertainment backlog manager for Games, Movies, TV Shows, and Anime.
Built with SvelteKit 2 + Svelte 5, SQLite, TypeScript, Tailwind CSS, and Flowbite.

---

## Commands

```bash
npm run dev          # Dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # Svelte type checking (svelte-check + tsc)
npm run lint         # ESLint
npm run test         # Vitest (watch mode)
npm run coverage     # Vitest with v8 coverage
```

**Run a single test file:**
```bash
npx vitest run src/lib/server/model/BacklogDB.spec.ts
```

---

## Environment

Copy `.env.example` to `.env` and fill in:

```
DB_PATH=            # Path to SQLite file (e.g. ./db.db)
JWT_ACCESS_SECRET=  # Secret for JWT signing

IGDB_CLIENT_ID=     # Twitch/IGDB OAuth
IGDB_CLIENT_SECRET=

TMDB_API_KEY=
TMDB_READ_ACCESS_TOKEN=

ITA_APP_ID=                   # IsThereAnyDeal
OPEN_CRITIC_RAPID_API_KEY=    # OpenCritic via RapidAPI
```

**Tests use a separate database**: `./test-artifacts.db` (auto-created, in-memory equivalent for SQLite).
Tests run sequentially (`fileParallelism: false`) to avoid SQLite concurrency issues.

---

## Project Structure

```
src/
├── routes/
│   ├── api/                  # All REST endpoints (+server.ts files)
│   │   ├── artifact/         # Cross-type user interactions (status, score, date, ownership)
│   │   ├── game/             # Game CRUD + search + links
│   │   ├── movie/            # Movie CRUD + search + links
│   │   ├── tvshow/           # Tvshow CRUD + search + links
│   │   ├── anime/            # Anime CRUD + search + links + episode dates
│   │   ├── backlog/          # Backlog CRUD + item management + ELO
│   │   ├── tag/              # Tag create + search
│   │   ├── subscription/     # Subscription services list
│   │   ├── link/             # Link URL resolution
│   │   ├── mal/              # MyAnimeList reconciliation
│   │   └── senscritique/     # SensCritique export + reconciliation
│   ├── game/, movie/, tvshow/, anime/   # Browse + detail + create pages
│   ├── backlog/              # Backlog list + detail pages
│   ├── mylist/               # User list by artifact type
│   ├── ongoing/              # Ongoing TV/Anime episode tracking
│   ├── stats/                # Statistics dashboard
│   ├── signin/, signup/, signout/, profile/
│   ├── mal/, senscritique/   # Import pages
│   ├── dataanomalies/, useranomalies/
│   └── bootstrap/            # DB init (admin only)
│
└── lib/
    ├── model/                # Domain models (pure TypeScript, no DB)
    │   ├── Artifact.ts       # Abstract base class
    │   ├── game/Game.ts
    │   ├── movie/Movie.ts
    │   ├── tvshow/Tvshow.ts, TvshowSeason.ts, TvshowEpisode.ts
    │   ├── anime/Anime.ts, AnimeEpisode.ts
    │   ├── Backlog.ts, BacklogItem.ts
    │   ├── User.ts, UserArtifact.ts, UserArtifactOwnership.ts
    │   ├── Link.ts, Rating.ts, Genre.ts, Tag.ts
    │   └── SubscriptionService.ts
    ├── server/
    │   ├── database.ts       # SQLite connection + query helpers
    │   └── model/            # DAOs (DB access objects)
    │       ├── ArtifactDB.ts
    │       ├── BacklogDB.ts, BacklogItemDB.ts
    │       ├── UserDB.ts, UserArtifactOwnershipDB.ts
    │       ├── LinkDB.ts, RatingDB.ts, TagDB.ts
    │       ├── SubscriptionServiceDB.ts
    │       ├── game/GameDB.ts, PlatformDB.ts
    │       ├── movie/MovieDB.ts
    │       ├── tvshow/TvshowDB.ts
    │       └── anime/AnimeDB.ts
    ├── services/             # Business logic layer
    │   ├── ArtifactService.ts
    │   ├── BacklogService.ts
    │   ├── LinkService.ts
    │   ├── TagService.ts
    │   ├── UserListService.ts
    │   └── PricesService.ts
    ├── components/           # Svelte components
    │   ├── ArtifactItem.svelte   # Main artifact card (~960 lines, handles all interactions)
    │   └── ArtifactList.svelte
    ├── igdb/                 # IGDB API client (games)
    ├── tmdb/                 # TMDB API client (movies + TV)
    ├── mal/                  # Jikan/MAL API client (anime)
    ├── metacritic/           # Metacritic scraper
    ├── opencritic/           # OpenCritic API client
    ├── rottentomatoes/       # Rotten Tomatoes scraper
    ├── senscritique/         # SensCritique scraper (Puppeteer)
    ├── steam/                # Steam store scraper
    ├── hltb/                 # HowLongToBeat scraper
    ├── itad/                 # IsThereAnyDeal API client
    ├── stores/               # Svelte reactive stores
    ├── types/                # TypeScript type definitions
    ├── ui/                   # Generic UI components (DoubleRange, BarChart)
    └── util/                 # Utility functions
        ├── RateLimitUtil.ts
        ├── TextUtil.ts, TimeUtil.ts, PeriodUtil.ts
        ├── OrderUtil.ts, DBUtil.ts, ErrorUtil.ts
        └── OngoingUtil.ts
```

---

## Architecture

### Layers (top to bottom)
1. **Routes** (`src/routes/`) — SvelteKit pages and `+server.ts` API handlers. Keep thin.
2. **Services** (`src/lib/services/`) — Business logic. Coordinate DAOs and external clients.
3. **DAOs** (`src/lib/server/model/`) — All SQL queries. No business logic.
4. **Models** (`src/lib/model/`) — Pure TypeScript classes. No DB, no HTTP.
5. **External clients** (`src/lib/igdb/`, `src/lib/tmdb/`, etc.) — One directory per service.

### Key patterns

**Models implement `Serializable<T>`** — every model has `toJSON()` and `static fromJSON(data)`.
The `__type` field is the discriminator used in `ArtifactService.artifactFromJSON()`.

**Database helpers** — never use `sqlite3` directly in DAOs; always use the wrappers from `database.ts`:
- `runDbQuery(query, params)` — INSERT/UPDATE/DELETE with no return
- `runDbInsert(query, params)` — INSERT returning `lastID`
- `getDbRow<T>(query, params)` — SELECT single row
- `getDbRows<T>(query, params)` — SELECT multiple rows
- `runDbQueries([...])` — sequential batch
- `runDbQueriesParallel([...])` — parallel batch

**Auth** — JWT token in cookie `AuthorizationToken` as `"Bearer {token}"`.
`event.locals.user` is populated by `src/hooks.server.ts` and available in all server routes.

**Authorization** — check `user.hasRight(UserRights.XXX)` before mutating data.
Role hierarchy: `admin > contributor > user > guest`.

**Artifact hierarchy** — `Tvshow` → `TvshowSeason[]` → `TvshowEpisode[]` and `Anime` → `AnimeEpisode[]`.
Parent-child stored via `parent_artifact_id` and `child_index` in the `artifact` table.

**Status propagation** — setting status `FINISHED` on a parent cascades to all children via `updateUserStatus()`. Other statuses do not cascade.

---

## Data Model Quick Reference

### ArtifactType
`game` | `movie` | `tvshow` | `tvshow_season` | `tvshow_episode` | `anime` | `anime_episode` | `comics`

### UserArtifactStatus
`wishlist` | `ongoing` | `onhold` | `dropped` | `finished`

### BacklogType
`current` | `standard` | `future`

### BacklogRankingType
`rank` | `elo` | `wishlist`

### LinkType (per artifact type)
- Game: `IGDB`, `HLTB`, `ITAD`, `METACRITIC`, `OPENCRITIC`, `STEAM`, `SENSCRITIQUE`
- Movie: `TMDB`, `METACRITIC`, `ROTTEN_TOMATOES`, `SENSCRITIQUE`
- Tvshow: `TMDB`, `METACRITIC`, `ROTTEN_TOMATOES`, `SENSCRITIQUE`
- Anime: `MAL`, `SENSCRITIQUE`

### RatingType
`MAL` | `METACRITIC` | `OPENCRITIC` | `ROTTEN_TOMATOES_AUDIENCE` | `ROTTEN_TOMATOES_CRITICS` | `SENSCRITIQUE` | `STEAM`

### UserRights
`CREATE_ARTIFACT` | `EDIT_ARTIFACT` | `DELETE_ARTIFACT` | `CREATE_BACKLOG` | `EDIT_BACKLOG` | `DELETE_BACKLOG` | `EDIT_ALL_BACKLOGS` | `DELETE_ALL_BACKLOGS` | `BOOTSTRAP` | `SENSCRITIQUE_EXPORT`

---

## Important Constraints

- **One `current` and one `future` backlog per user per artifact type** — enforced in `BacklogDB`.
- **Backlog items share the same `artifactType`** — cannot mix types in one backlog.
- **ELO starts at 1200**, K-factor 32. Formula: `expected = 1 / (1 + 10^((opponent - yours) / 400))`.
- **Genre tables are allowlisted** — `ALLOWED_GENRE_TABLES` in `ArtifactDB.ts` must be updated when adding new artifact types.
- **Duplicate prevention** — artifact creation checks `LinkDB.exists()` with the external ID before inserting.
- **Tests are sequential** — `fileParallelism: false` in `vitest.config.ts`; do not remove this.
- **Test DB** — `./test-artifacts.db` is auto-created in test env. Do not commit it.
- **Puppeteer** is used for SensCritique, Metacritic, and Rotten Tomatoes scraping — requires a compatible Chromium.

---

## Adding a New Artifact Type

1. Create model in `src/lib/model/{type}/{Type}.ts` extending `Artifact` — implement `computeMeanRating()`, `computeLastAndNextOngoing()`, `toJSON()`, `static fromJSON()`.
2. Create DAO in `src/lib/server/model/{type}/{Type}DB.ts`.
3. Add genre tables in the DB schema and register them in `ALLOWED_GENRE_TABLES` in `ArtifactDB.ts`.
4. Register the new type in `ArtifactService.artifactFromJSON()`.
5. Add routes under `src/routes/api/{type}/` and `src/routes/{type}/`.
6. Wire up an external data source client in `src/lib/{source}/`.

---

## Adding a New API Endpoint

- File: `src/routes/api/{resource}/{action}/+server.ts`
- Export named functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Check auth: `if (!event.locals.user?.hasRight(UserRights.XXX)) return error(403)`
- Delegate logic to a service, not inline in the handler
- Return `json(result)` or `error(code, message)`

---

## Full Specification

See [SPEC.md](./SPEC.md) for the complete data model, API endpoint list, and business rules reference.
