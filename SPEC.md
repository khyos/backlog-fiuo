# Backlog-FIUO — Application Specification

## 1. Overview

**Backlog-FIUO** is a personal entertainment backlog manager. It lets users create and manage prioritized lists of Games, Movies, TV Shows, and Anime, track consumption status, aggregate community ratings, and synchronize with external services (MyAnimeList, SensCritique).

---

## 2. Data Models

### 2.1 Artifact (abstract base)

| Field | Type | Notes |
|---|---|---|
| `id` | number | PK, auto-increment |
| `title` | string | required |
| `type` | ArtifactType | discriminator |
| `releaseDate` | Date | |
| `duration` | number | seconds |
| `description` | string? | |
| `parentId` | number? | FK → artifact |
| `childIndex` | number? | order among siblings |
| `links` | Link[] | |
| `genres` | Genre[] | |
| `ratings` | Rating[] | |
| `tags` | Tag[] | |
| `userInfo` | UserArtifact? | current user's data |
| `meanRating` | number? | computed, strategy differs by type |
| `lastAndNextOngoing` | {last, next}? | computed, TV/Anime only |

**ArtifactType enum**: `game`, `movie`, `tvshow`, `tvshow_season`, `tvshow_episode`, `anime`, `anime_episode`, `comics`

**Status propagation rule**: setting a parent to `FINISHED` cascades to all children. Other statuses do not propagate.

---

### 2.2 Game (extends Artifact)

Additional fields: `platforms: Platform[]`

**Mean rating formula**:
1. Critics score = average(Metacritic, OpenCritic) if both present, else whichever exists
2. User score = SensCritique + 20% weight from Steam, if both present
3. Final = average(critics score, user score) using available inputs

---

### 2.3 Movie (extends Artifact)

No additional fields. Mean rating = simple average of all ratings.

---

### 2.4 Tvshow (extends Artifact)

Children: `TvshowSeason[]`. Mean rating = simple average.

**`computeLastAndNextOngoing`**: traverses seasons → episodes, returns last watched and first unwatched episode.

---

### 2.5 TvshowSeason (extends Artifact)

`childIndex` = season number. Computed `numbering` getter returns `"S01"` format.

---

### 2.6 TvshowEpisode (extends Artifact)

`childIndex` = episode number. Computed `numbering` getter returns `"S01E03"` format.

---

### 2.7 Anime (extends Artifact)

Additional fields: `studio?`, `source?`, `status?`. Children: `AnimeEpisode[]`. Mean rating = simple average.

---

### 2.8 AnimeEpisode (extends Artifact)

`childIndex` = episode number. Computed `numbering` = `"E03"` format.

---

### 2.9 Link

| Field | Type | Notes |
|---|---|---|
| `artifactId` | number | FK → artifact |
| `type` | LinkType | |
| `url` | string | |
| PK | (artifactId, type) | |

**LinkType enum**: `IGDB`, `HLTB`, `ITAD`, `MAL`, `METACRITIC`, `OPENCRITIC`, `ROTTEN_TOMATOES`, `SENSCRITIQUE`, `STEAM`, `TMDB`

**Valid link types by artifact type**:
- Game: IGDB, HLTB, SENSCRITIQUE, METACRITIC, OPENCRITIC, STEAM, ITAD
- Movie: TMDB, SENSCRITIQUE, METACRITIC, ROTTEN_TOMATOES
- Tvshow: TMDB, SENSCRITIQUE, METACRITIC, ROTTEN_TOMATOES
- Anime: MAL, SENSCRITIQUE

---

### 2.10 Rating

| Field | Type | Notes |
|---|---|---|
| `artifactId` | number | FK → artifact |
| `type` | RatingType | |
| `rating` | number | 0–100 |
| PK | (artifactId, type) | |

**RatingType enum**: `MAL`, `METACRITIC`, `OPENCRITIC`, `ROTTEN_TOMATOES_AUDIENCE`, `ROTTEN_TOMATOES_CRITICS`, `SENSCRITIQUE`, `STEAM`

**Color thresholds** (green / indigo / yellow / red):
- MAL: ≥85 / ≥75 / ≥65 / else
- SENSCRITIQUE: ≥75 / ≥70 / ≥60 / else
- STEAM: ≥95 / ≥90 / ≥85 / else
- Others: ≥90 / ≥80 / ≥70 / else

---

### 2.11 Genre

Per-type definition tables (`game_genre`, `movie_genre`, `tvshow_genre`, `anime_genre`) with mapping tables (`game_game_genre`, `movie_movie_genre`, `tvshow_tvshow_genre`, `anime_anime_genre`).

---

### 2.12 Platform (Game only)

Table `game_platform` maps (artifactId, platformId).

---

### 2.13 Tag

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `artifactType` | ArtifactType | |
| `type` | TagType | |
| PK | (id, artifactType) | |

**TagType enum**: `DEFAULT`, `TRIGGER_WARNING`

Tags can be attached to backlog items via table `backlog_item_tag`.

---

### 2.14 UserArtifact

Represents a user's relationship with a specific artifact.

| Field | Type | Notes |
|---|---|---|
| `userId` | number | |
| `artifactId` | number | |
| `status` | UserArtifactStatus? | |
| `score` | number? | 0–100 |
| `startDate` | Date? | |
| `endDate` | Date? | |
| `ownerships` | UserArtifactOwnership[] | |
| `availableSubscriptions` | SubscriptionService[] | |
| PK | (userId, artifactId) | |

**UserArtifactStatus enum**: `wishlist`, `ongoing`, `onhold`, `dropped`, `finished`

---

### 2.15 UserArtifactOwnership

| Field | Type | Notes |
|---|---|---|
| `id` | number | PK |
| `userId` | number | FK → user |
| `artifactId` | number | FK → artifact |
| `platform` | string | required |
| `note` | string? | |

---

### 2.16 SubscriptionService

| Field | Type | Notes |
|---|---|---|
| `id` | number | PK |
| `name` | string | |
| `artifactType` | ArtifactType? | null = all types |

**Predefined services**:
- All types: Netflix, Disney+, Amazon Prime Video, Apple TV+, Max, Hulu
- Anime only: Crunchyroll
- Game only: Game Pass, PlayStation Plus Extra, EA Play, Apple Arcade, Nintendo Switch Online

Relationships:
- `artifact_subscription` (artifactId, serviceId): which services offer an artifact
- `user_subscription` (userId, serviceId): which services a user subscribes to

---

## 3. Backlog System

### 3.1 Backlog

| Field | Type | Notes |
|---|---|---|
| `id` | number | PK |
| `userId` | number | FK → user |
| `type` | BacklogType | |
| `rankingType` | BacklogRankingType | |
| `artifactType` | ArtifactType | |
| `title` | string | |

**BacklogType enum**: `current`, `standard`, `future`

**BacklogRankingType enum**: `rank`, `elo`, `wishlist`

**BacklogOrder enum** (display sorting): `rank`, `elo`, `dateAdded`, `dateRelease`, `rating`

**Constraints**:
- Exactly one `current` and one `future` backlog per user per artifact type
- Multiple `standard` backlogs allowed
- All items in a backlog share the same `artifactType`

---

### 3.2 BacklogItem

| Field | Type | Notes |
|---|---|---|
| `backlogId` | number | FK → backlog |
| `artifactId` | number | FK → artifact |
| `rank` | number | 1-based position |
| `elo` | number | default 1200 |
| `dateAdded` | timestamp | default now |
| `tags` | Tag[] | |
| PK | (backlogId, artifactId) | |

**ELO system**:
- Initial value: 1200
- K-factor: 32
- Formula: `expected = 1 / (1 + 10^((opponent_elo - your_elo) / 400))`
- New ELO: `current + 32 * (actual - expected)`

---

## 4. User System

### 4.1 User

| Field | Type | Notes |
|---|---|---|
| `id` | number | PK |
| `username` | string | unique |
| `password` | string | bcrypt, salt 10 |
| `role` | UserRole | |

**UserRole enum**: `admin`, `contributor`, `user`, `guest`

**Rights by role**:

| Right | admin | contributor | user | guest |
|---|---|---|---|---|
| CREATE_ARTIFACT | ✓ | ✓ | | |
| EDIT_ARTIFACT | ✓ | ✓ | | |
| DELETE_ARTIFACT | ✓ | | | |
| CREATE_BACKLOG | ✓ | ✓ | ✓ | |
| EDIT_BACKLOG | ✓ | ✓ | ✓ | |
| DELETE_BACKLOG | ✓ | ✓ | ✓ | |
| EDIT_ALL_BACKLOGS | ✓ | | | |
| DELETE_ALL_BACKLOGS | ✓ | | | |
| BOOTSTRAP | ✓ | | | |
| SENSCRITIQUE_EXPORT | ✓ | | | |

---

### 4.2 Authentication

- JWT tokens signed with `JWT_ACCESS_SECRET`
- Stored in cookie `AuthorizationToken` as `"Bearer {token}"`
- Token payload: `{ id: username }`
- Rate limiting on `/signin` and `/signup` (IP-based, returns 429)

---

## 5. API Endpoints

### 5.1 Artifact CRUD

| Method | Path | Description | Required right |
|---|---|---|---|
| GET | `/api/{type}/[slug]` | Get artifact by ID | — |
| POST | `/api/{type}/search` | Search artifacts | — |
| POST | `/api/{type}/create` | Create artifact | CREATE_ARTIFACT |
| GET | `/api/{type}/find{Type}Info` | Fetch info from external source | — |
| POST | `/api/{type}/[slug]/link` | Add/update link | EDIT_ARTIFACT |

Where `{type}` ∈ `game`, `movie`, `tvshow`, `anime`.

### 5.2 User-Artifact Interaction

| Method | Path | Body |
|---|---|---|
| POST | `/api/artifact/userStatus` | `{artifactIds, status}` |
| POST | `/api/artifact/[slug]/userScore` | `{score}` |
| POST | `/api/artifact/[slug]/userDate` | `{date, startEnd: 'start'\|'end'\|'both'}` |
| POST/PATCH/DELETE | `/api/artifact/[slug]/ownership` | `{platform, note?, id?}` |
| POST | `/api/artifact/[slug]/subscription` | `{serviceId}` |

### 5.3 Backlog

| Method | Path | Description |
|---|---|---|
| GET | `/api/backlog/list` | All user backlogs |
| POST | `/api/backlog/create` | Create backlog |
| GET | `/api/backlog/[slug]` | Get backlog with items |
| POST | `/api/backlog/[slug]/add` | Add item |
| POST | `/api/backlog/[slug]/delete` | Remove item |
| POST | `/api/backlog/[slug]/move` | Reorder item within backlog |
| POST | `/api/backlog/move` | Move item to another backlog |
| POST | `/api/backlog/[slug]/elo` | ELO fight: `{winnerArtifactId, loserArtifactId}` |
| POST | `/api/backlog/[slug]/tag` | Add/remove tag on item |

### 5.4 Other

| Method | Path | Description |
|---|---|---|
| POST | `/api/tag/create` | Create tag |
| POST | `/api/tag/search` | Search tags |
| GET | `/api/subscription` | List services |
| POST | `/api/mal/reconcile` | MAL import |
| POST | `/api/senscritique/export` | SensCritique export |
| POST | `/api/senscritique/reconcile` | SensCritique import |
| GET | `/api/dataanomalies/filter-anime` | Detect/fix anime anomalies |

---

## 6. Pages

| Route | Description | Required right |
|---|---|---|
| `/signin`, `/signup`, `/signout` | Auth | — |
| `/profile` | User profile | — |
| `/game`, `/movie`, `/tvshow`, `/anime` | Browse media | — |
| `/game/[slug]` etc. | Detail page | — |
| `/game/create` etc. | Create form | CREATE_ARTIFACT |
| `/backlog` | List all user backlogs | — |
| `/backlog/create` | New backlog | CREATE_BACKLOG |
| `/backlog/[slug]` | Backlog view with filters | — |
| `/mylist/[slug]` | User list by type | — |
| `/ongoing/[slug]` | Ongoing TV/Anime | — |
| `/stats` | Statistics dashboard | — |
| `/mal/import` | MAL import | — |
| `/senscritique/import` | SensCritique import | — |
| `/dataanomalies` | Data integrity tools | — |
| `/bootstrap` | DB initialization | BOOTSTRAP |

---

## 7. External Integrations

| Service | Protocol | Purpose |
|---|---|---|
| **IGDB** | REST API (Twitch OAuth) | Game search, metadata, genres, cover images |
| **TMDB** | REST API (Bearer token) | Movie/TV search, seasons, episodes, posters |
| **MyAnimeList** | Jikan REST API | Anime search, metadata, episode dates, scores |
| **Metacritic** | Web scraping | Game critic scores |
| **OpenCritic** | REST API | Game critic scores |
| **Rotten Tomatoes** | Web scraping | Movie/TV critic + audience scores |
| **SensCritique** | Web scraping (Puppeteer) | Ratings + import/export |
| **Steam** | Store API/scraping | Game user review scores |
| **HowLongToBeat** | Web scraping | Game completion duration |
| **IsThereAnyDeal** | REST API | Game price tracking |

---

## 8. Environment Variables

| Variable | Purpose |
|---|---|
| `DB_PATH` | SQLite database file path |
| `JWT_ACCESS_SECRET` | JWT signing secret |
| `TMDB_READ_ACCESS_TOKEN` | TMDB API bearer token |
| `IGDB_CLIENT_ID` | IGDB/Twitch client ID |
| `IGDB_CLIENT_SECRET` | IGDB/Twitch client secret |
