# Architecture Review — backlog-fiuo

> Reviewed on 2026-06-22. Two passes: high-level structure, then deep file-by-file analysis.

---

## Table of Contents

1. [Overall Assessment](#overall-assessment)
2. [What's Working Well](#whats-working-well)
3. [Architectural Issues](#architectural-issues)
4. [Second Pass — Additional Findings](#second-pass--additional-findings)
5. [Scalability Notes](#scalability-notes)
6. [Priority List](#priority-list)

---

## Overall Assessment

Well-structured personal project with clear layering and consistent conventions applied throughout. The Routes → Services → DAOs → Models stack is properly enforced, security decisions are solid, and test coverage is thoughtful. The main debts are in data integrity under failure, component granularity, and a few likely bugs in list view data population.

**Stack:** SvelteKit 2 + Svelte 5, SQLite, TypeScript, Tailwind CSS, Flowbite-Svelte.

---

## What's Working Well

### Layered architecture is properly enforced

API handlers stay thin, services coordinate logic, and DAOs contain all SQL. The separation makes the code easy to navigate and test independently at each layer.

### Database abstraction in `database.ts` is solid

The six promisified helpers (`runDbInsert`, `runDbQuery`, `getDbRow`, `getDbRows`, `runDbQueries`, `runDbQueriesParallel`) give the codebase a consistent interface without pulling in an ORM. Batch parallel fetching in `ArtifactDB.getUserInfos()` is a notably good pattern.

### Security is handled consistently

- Dynamic table names use `assertValidTableName()` with an allowlist in `ArtifactDB.ts`
- All queries are parameterized
- Auth flows through `event.locals.user` populated by the server hook
- Role-based permission checks via `hasRight()` present in API handlers
- Rate limiting scoped to auth endpoints only (not global) avoids over-engineering

### Polymorphic domain model is clean

`Artifact` as an abstract base with `computeMeanRating()` and `computeLastAndNextOngoing()` as overridable methods is the right shape. Adding a new artifact type doesn't require touching existing logic.

### Test setup is thoughtful

Sequential execution (`fileParallelism: false` in `vitest.config.ts`) avoids SQLite concurrency issues that catch most projects off guard. 49 test files alongside the codebase is respectable coverage.

### Serialization pattern works well

`Serializable<T>` + `__type` discriminator is a clean pattern for transferring polymorphic objects across the API boundary. `artifactFromJSON()` as a factory method handles deserialization in one place.

### `ArtifactList.svelte` handles middle-click navigation

Correctly handles both `click` and `auxclick` for browser tab navigation — a small but good UX detail.

### `SubscriptionSyncJob` phase-based scheduling

Movies-then-TV ordering with midnight reset shows thoughtful design for a background task, even if it has restart recovery gaps (see issues below).

---

## Architectural Issues

### 1. No database transactions

`deleteArtifactAndChildren()` in `ArtifactDB.ts` runs 8 separate delete queries sequentially with no transaction wrapper. If any query fails mid-way, the database is left in a partially deleted state with orphaned rows.

Same risk applies to any multi-step write: status propagation cascades, ELO fights, backlog item moves.

**Fix:** Add a `runDbTransaction(fn)` helper to `database.ts` wrapping `BEGIN`/`COMMIT`/`ROLLBACK`, and use it for all multi-step writes.

---

### 2. Likely bug: ownerships and subscriptions always empty in list views

`ArtifactDB.getUserList()` and `getUserOngoingList()` manually construct `UserArtifact` objects with hardcoded `ownerships: []` and `availableSubscriptions: []`. These are never populated from the DB in those code paths.

The detail view uses the batch-fetching path (`getUserInfos()`) which does populate them correctly. So any list page — mylist, ongoing — silently shows incorrect ownership and subscription state for every item.

**Fix:** Either reuse `getUserInfos()` in the list paths, or extract the ownership/subscription batch fetch and call it from both paths.

---

### 3. `ArtifactItem.svelte` is a god component (960 lines)

The component handles link management, ownership, subscriptions, modal state, form submission, async loading, date handling, and child artifact rendering all in one file. This is the biggest maintainability liability in the codebase.

**Suggested split:**
- `LinkManager.svelte` — add/edit/delete/refresh links
- `OwnershipPanel.svelte` — add/edit/delete ownerships
- `SubscriptionBadge.svelte` — subscription toggle and sync
- `ArtifactStatusBar.svelte` — status/score/date controls

---

### 4. No schema migration system

All tables use `CREATE TABLE IF NOT EXISTS` scattered across DAO files. Adding a column or changing a constraint requires manually writing `ALTER TABLE` statements with no record of what has been applied. This works while the schema is stable but becomes a liability with any structural evolution.

**Fix:** Adopt a lightweight migration approach — even a simple numbered SQL file list checked against a `schema_version` table would be sufficient for a personal project.

---

### 5. External API integrations have no common contract

The 8 integration modules (IGDB, TMDB, MAL, Steam, etc.) each implement their own error handling, retry logic, and response shapes. `ArtifactService.getAsyncInfo()` has a hardcoded `switch` on artifact type to fan out to the right client.

Adding a new integration means touching `getAsyncInfo()` and several other callsites. There's no shared interface, so each integration drifts independently.

**Fix:** Define an `ExternalDataSource` interface with `fetchMetadata(id): Promise<AsyncInfo>`. Each client implements it. `getAsyncInfo()` becomes a generic fan-out over registered sources.

---

### 6. Inconsistent API response shapes

Some endpoints return `{ success: true }`, others return `{ id, ... }`, others return the full resource. There's no unified envelope or consistent HTTP status usage. Client-side error handling ends up ad-hoc as a result.

**Fix:** Agree on a consistent shape — even just `{ data }` on success and `{ error }` on failure — and apply it across all `+server.ts` files.

---

### 7. Missing error handling in client-side services

`ArtifactService` fetch calls to external APIs lack `try/catch`. A failed IGDB or TMDB request silently fails or surfaces as an unhandled rejection. `LinkService.openLink()` opens a browser window without checking if the API returned an error URL.

---

### 8. IGDB re-authenticates on every request

`IGDB.getGame()` calls `authenticateIGDB()` on each invocation without caching the OAuth token. The token has a lifetime — re-authenticating per request is wasteful and could trigger rate limits on the Twitch auth endpoint.

**Fix:** Cache the token in module scope with its expiry timestamp and refresh only when expired.

---

### 9. TOCTOU race on duplicate artifact detection

`LinkDB.exists()` checks for duplicates before inserting, but there's no `UNIQUE` constraint at the DB level on the external ID column. Two concurrent creation requests can both pass the check and insert duplicates.

**Fix:** Add a `UNIQUE` constraint on the external ID column. The application-level check becomes a fast-path guard rather than the sole safety net.

---

### 10. `alert()` used for errors in `ArtifactItem.svelte`

User-facing errors trigger `alert()` calls. These are blocking, break UI flow, and look out of place. Flowbite-Svelte has toast/notification components already in the stack.

---

### 11. No request body validation at API boundaries

Route handlers destructure POST bodies directly without schema validation (no Zod, no manual checks). Missing or malformed fields silently become `undefined` and may cause confusing DB errors downstream rather than a clear `400 Bad Request`.

---

### 12. Magic date sentinel — year 2199

`GameDB` and `AnimeDB` use `new Date(7258118400000)` (~year 2199) as a default release date fallback in multiple places. This leaks into any query that sorts or filters by release date and is easy to miss.

**Fix:** Use `null` with nullable typing and handle it explicitly in queries and UI.

---

### 13. Commented-out dead code in `ArtifactDB.setUserStatus()`

A significant block of wishlist rank management logic is commented out with no explanation. The intent is unclear — was it intentional removal, a work-in-progress, or an abandoned refactor?

**Fix:** Either complete it or delete it with a commit message explaining the decision.

---

### 14. `SubscriptionSyncJob` has no restart recovery

Mid-sync server restarts reset `phaseIndex = 0`. The job has no way to resume from where it left off, so a restart near end-of-day triggers a full re-sync from the beginning.

---

### 15. Unindexed filter on `user_artifact.status`

`getUserOngoingList()` filters on `status = 'ongoing'` with no index. For a personal-scale dataset this doesn't matter today, but it's worth noting if the table grows.

---

## Second Pass — Additional Findings

These emerged from the deeper file-by-file read.

### `Artifact.ts` — leaky abstraction on `computeLastAndNextOngoing()`

`Game.ts` throws `"Not Compatible"` from `computeLastAndNextOngoing()` at runtime, but the method is declared as abstract on `Artifact`. TypeScript doesn't catch this because `Game` does implement the method — it just throws. A caller iterating mixed artifact types would get a runtime error rather than a compile-time one.

### Date type mismatch between `IArtifactDB` and `Artifact`

`IArtifactDB.releaseDate` is a `number` (milliseconds), but `Artifact.releaseDate` is a `Date` object. Conversion happens inconsistently across `ArtifactDB.createArtifact()`, `GameDB.deserialize()`, and other places. A centralized conversion function (or a single canonical type) would eliminate the scattered conversions.

### `BacklogDB.getBacklogItems()` double-computes ranking

The method builds dynamic rank windows in SQL, then delegates to type-specific DBs that call `ArtifactDB.getBacklogItems()` again, re-doing the ranking computation. This is a latent performance issue that will matter more if backlogs grow large.

### No logging infrastructure

Beyond `console.log()` calls, there's no structured logging. For a personal project this is acceptable, but background jobs like `SubscriptionSyncJob` silently continue past errors with only a console log. A simple logger abstraction would make it easier to surface errors.

### Store update pattern in `ArtifactItemStore.ts` is imperative

Functions like `updateScore()` mutate `store.artifact` directly then call `artifactItemStore.update()`. No debouncing or optimistic locking means rapid user interactions (e.g. score slider) could fire multiple in-flight requests that overwrite each other in arbitrary order.

---

## Scalability Notes

These are not current problems but worth tracking as the app grows:

- **`getArtifacts()` loads all rows into memory** — pagination would be the first step if the artifact count becomes large.
- **ELO calculation is done in application code** then written back — fine now, but for bulk re-ranking, a SQL expression would avoid round-trips.
- **`SubscriptionSyncJob` batch size and tick interval are hardcoded** — `BATCH_SIZE = 10`, `TICK_INTERVAL_MS = 10s`. Making these configurable via env vars would cost little and add flexibility.
- **Puppeteer for scraping** (SensCritique, Metacritic, Rotten Tomatoes) is heavy. No concern now, but a headless-optional path would reduce cold-start cost.

---

## Priority List

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | Add transaction support for multi-step writes | Data integrity | Critical |
| 2 | `getUserList()` always returns empty ownerships/subscriptions | Likely bug | High |
| 3 | Schema migration system | Operability | High |
| 4 | Split `ArtifactItem.svelte` into sub-components | Maintainability | High |
| 5 | IGDB token caching | Performance / correctness | Medium |
| 6 | Request body validation in API routes (Zod or manual) | Robustness | Medium |
| 7 | DB `UNIQUE` constraint on external IDs (TOCTOU fix) | Correctness | Medium |
| 8 | Replace `alert()` with toast notifications | UX | Medium |
| 9 | Magic year-2199 date sentinel → `null` | Subtle correctness | Medium |
| 10 | `ExternalDataSource` interface for API integrations | Maintainability | Medium |
| 11 | Consistent API response shape | Developer experience | Low |
| 12 | `SubscriptionSyncJob` restart recovery | Reliability | Low |
| 13 | Error handling in client-side service calls | Robustness | Low |
| 14 | Delete or complete commented-out code in `setUserStatus()` | Hygiene | Low |
| 15 | Index `user_artifact.status` | Performance | Low |
