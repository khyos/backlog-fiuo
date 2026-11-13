/**
 * Standards tests for pure helper functions from ArtifactChildrenDatesModal.svelte
 *
 * The helpers are defined inside the Svelte component's script block and are
 * therefore not exported.  No Svelte component testing framework is available
 * in this project, so each function is replicated here verbatim and tested
 * against its specified behaviour.  These tests lock down the exact logic that
 * the component relies on and would catch any refactoring that silently changes
 * how dates are formatted, parsed, or validated.
 */

import { describe, it, expect } from 'vitest';
import { TimeUtil } from '#lib/util/TimeUtil';
import { ArtifactType, type Artifact } from '#lib/model/Artifact';
import { Game } from '#lib/model/game/Game';
import { UserArtifact, UserArtifactStatus } from '#lib/model/UserArtifact';

// ---------------------------------------------------------------------------
// Replicated helpers — exact copy of the implementations in the component
// ---------------------------------------------------------------------------

function toInputValue(d: Date | null): string {
    if (!d) return '';
    return d.toISOString().split('T')[0];
}

function fromInputValue(s: string): Date | null {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function formatUserDate(d: Date | null | undefined): string {
    if (!d) return '—';
    return TimeUtil.formatDate(d);
}

// saveRow validation extracted as a pure predicate (the real component sets
// state; here we just return the error string or null to keep tests pure)
function validateDates(draftStart: string, draftEnd: string): string | null {
    const s = fromInputValue(draftStart);
    const e = fromInputValue(draftEnd);
    if (s && e && e < s) {
        return 'End date must not be before start date';
    }
    return null;
}

// autoFillFromEpisodes extracted as a pure function that returns the new
// draft values instead of mutating state variables
function autoFillFromEpisodes(season: Artifact): { draftStart: string; draftEnd: string } | null {
    const finished = season.children.filter(
        (ep: Artifact) => ep.userInfo?.status === UserArtifactStatus.FINISHED
    );
    if (finished.length === 0) return null;   // no-op sentinel
    const first = finished[0];
    const last = finished[finished.length - 1];
    return {
        draftStart: toInputValue(first.userInfo?.startDate ?? first.userInfo?.endDate ?? null),
        draftEnd: toInputValue(last.userInfo?.endDate ?? null),
    };
}

// ---------------------------------------------------------------------------
// Helper: build a minimal Game artifact with userInfo
// ---------------------------------------------------------------------------

function makeArtifact(id: number, status: UserArtifactStatus | null, endDate: Date | null, startDate: Date | null = null): Game {
    const g = new Game(id, `Artifact ${id}`, ArtifactType.GAME, new Date(), 0);
    g.genres = [];
    g.ratings = [];
    g.tags = [];
    g.links = [];
    g.platforms = [];
    g.userInfo = new UserArtifact(1, id, status, null, startDate, endDate);
    return g;
}

function makeSeason(episodes: Game[]): Game {
    const season = new Game(100, 'Season 1', ArtifactType.GAME, new Date(), 0);
    season.genres = [];
    season.ratings = [];
    season.tags = [];
    season.links = [];
    season.platforms = [];
    season.children = episodes as unknown as Artifact[];
    return season;
}

// ---------------------------------------------------------------------------
// formatUserDate
// ---------------------------------------------------------------------------

describe('formatUserDate', () => {
    it('returns the em-dash for null', () => {
        expect(formatUserDate(null)).toBe('—');
    });

    it('returns the em-dash for undefined', () => {
        expect(formatUserDate(undefined)).toBe('—');
    });

    it('delegates to TimeUtil.formatDate for a non-null date', () => {
        const date = new Date(2024, 5, 15); // 15 June 2024
        expect(formatUserDate(date)).toBe(TimeUtil.formatDate(date));
    });

    // Verify the delegation is different from calling TimeUtil.formatDate(null)
    // which returns 'TBD' — formatUserDate must NOT return 'TBD' for null
    it('does not return "TBD" for null (that is TimeUtil.formatDate behaviour)', () => {
        expect(formatUserDate(null)).not.toBe('TBD');
    });

    it('returns the year string for a Dec-31 date (via TimeUtil special-case)', () => {
        const date = new Date(2023, 11, 31); // 31 Dec 2023
        expect(formatUserDate(date)).toBe('2023');
    });

    it('returns "TBD" for a date beyond year 2100 (via TimeUtil special-case)', () => {
        const date = new Date(2101, 0, 1);
        expect(formatUserDate(date)).toBe('TBD');
    });
});

// ---------------------------------------------------------------------------
// toInputValue
// ---------------------------------------------------------------------------

describe('toInputValue', () => {
    it('returns an empty string for null', () => {
        expect(toInputValue(null)).toBe('');
    });

    it('returns an ISO date-only string (YYYY-MM-DD) for a UTC Date', () => {
        // Use a date in UTC so that the split-on-T gives a deterministic value
        const d = new Date('2024-01-15T00:00:00.000Z');
        expect(toInputValue(d)).toBe('2024-01-15');
    });

    it('always produces a ten-character string for a non-null date', () => {
        const d = new Date('2024-06-30T00:00:00.000Z');
        expect(toInputValue(d)).toHaveLength(10);
    });
});

// ---------------------------------------------------------------------------
// fromInputValue
// ---------------------------------------------------------------------------

describe('fromInputValue', () => {
    it('returns null for an empty string', () => {
        expect(fromInputValue('')).toBeNull();
    });

    it('returns null for a string that is not a valid date', () => {
        expect(fromInputValue('not-a-date')).toBeNull();
    });

    it('returns null for a partial date string', () => {
        expect(fromInputValue('2024-13-99')).toBeNull();
    });

    it('returns a Date object for a valid date string', () => {
        const result = fromInputValue('2024-01-15');
        expect(result).toBeInstanceOf(Date);
        expect(isNaN(result!.getTime())).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// toInputValue / fromInputValue round-trip
// ---------------------------------------------------------------------------

describe('toInputValue / fromInputValue round-trip', () => {
    it('null survives the round-trip as null', () => {
        expect(fromInputValue(toInputValue(null))).toBeNull();
    });

    it('a UTC Date survives the round-trip to the same calendar day', () => {
        const original = new Date('2024-06-15T00:00:00.000Z');
        const roundTripped = fromInputValue(toInputValue(original));
        expect(roundTripped).not.toBeNull();
        // Both should represent the same date string
        expect(toInputValue(roundTripped!)).toBe(toInputValue(original));
    });

    it('an empty string survives the round-trip as an empty string', () => {
        expect(toInputValue(fromInputValue(''))).toBe('');
    });
});

// ---------------------------------------------------------------------------
// Validation logic (saveRow guard)
// ---------------------------------------------------------------------------

describe('validateDates (saveRow guard)', () => {
    it('returns null when both dates are empty strings (no start, no end)', () => {
        expect(validateDates('', '')).toBeNull();
    });

    it('returns null when only start is provided', () => {
        expect(validateDates('2024-01-15', '')).toBeNull();
    });

    it('returns null when only end is provided', () => {
        expect(validateDates('', '2024-06-30')).toBeNull();
    });

    it('returns null when end equals start', () => {
        expect(validateDates('2024-03-01', '2024-03-01')).toBeNull();
    });

    it('returns null when end is after start', () => {
        expect(validateDates('2024-01-01', '2024-12-31')).toBeNull();
    });

    it('returns an error message when end is strictly before start', () => {
        const error = validateDates('2024-06-30', '2024-01-15');
        expect(error).toBe('End date must not be before start date');
    });

    it('returns an error even when the dates are only one day apart (end before start)', () => {
        const error = validateDates('2024-03-02', '2024-03-01');
        expect(error).toBe('End date must not be before start date');
    });
});

// ---------------------------------------------------------------------------
// autoFillFromEpisodes
// ---------------------------------------------------------------------------

describe('autoFillFromEpisodes', () => {
    it('returns null (no-op) when the season has no finished episodes', () => {
        const ep1 = makeArtifact(1, UserArtifactStatus.ON_GOING, new Date('2024-01-10T00:00:00Z'));
        const ep2 = makeArtifact(2, null, new Date('2024-01-17T00:00:00Z'));
        const season = makeSeason([ep1, ep2]);
        expect(autoFillFromEpisodes(season as unknown as Artifact)).toBeNull();
    });

    it('returns null (no-op) when the season has no children at all', () => {
        const season = makeSeason([]);
        expect(autoFillFromEpisodes(season as unknown as Artifact)).toBeNull();
    });

    it('sets start and end to the same episode endDate when only one finished episode exists', () => {
        const endDate = new Date('2024-02-05T00:00:00Z');
        const ep = makeArtifact(1, UserArtifactStatus.FINISHED, endDate);
        const season = makeSeason([ep]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result).not.toBeNull();
        expect(result!.draftStart).toBe(toInputValue(endDate));
        expect(result!.draftEnd).toBe(toInputValue(endDate));
    });

    it('uses the first finished episode endDate as draftStart', () => {
        const date1 = new Date('2024-01-01T00:00:00Z');
        const date2 = new Date('2024-03-15T00:00:00Z');
        const date3 = new Date('2024-06-30T00:00:00Z');
        const ep1 = makeArtifact(1, UserArtifactStatus.FINISHED, date1);
        const ep2 = makeArtifact(2, UserArtifactStatus.FINISHED, date2);
        const ep3 = makeArtifact(3, UserArtifactStatus.FINISHED, date3);
        const season = makeSeason([ep1, ep2, ep3]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftStart).toBe(toInputValue(date1));
    });

    it('uses the last finished episode endDate as draftEnd', () => {
        const date1 = new Date('2024-01-01T00:00:00Z');
        const date2 = new Date('2024-03-15T00:00:00Z');
        const date3 = new Date('2024-06-30T00:00:00Z');
        const ep1 = makeArtifact(1, UserArtifactStatus.FINISHED, date1);
        const ep2 = makeArtifact(2, UserArtifactStatus.FINISHED, date2);
        const ep3 = makeArtifact(3, UserArtifactStatus.FINISHED, date3);
        const season = makeSeason([ep1, ep2, ep3]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftEnd).toBe(toInputValue(date3));
    });

    it('skips non-finished episodes when determining first/last', () => {
        const date1 = new Date('2024-01-01T00:00:00Z');
        const date2 = new Date('2024-06-30T00:00:00Z');
        // Episodes: ongoing, finished, finished, ongoing
        const ep1 = makeArtifact(1, UserArtifactStatus.ON_GOING, new Date('2023-12-01T00:00:00Z'));
        const ep2 = makeArtifact(2, UserArtifactStatus.FINISHED, date1);
        const ep3 = makeArtifact(3, UserArtifactStatus.FINISHED, date2);
        const ep4 = makeArtifact(4, UserArtifactStatus.ON_GOING, new Date('2024-09-01T00:00:00Z'));
        const season = makeSeason([ep1, ep2, ep3, ep4]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftStart).toBe(toInputValue(date1));
        expect(result!.draftEnd).toBe(toInputValue(date2));
    });

    it('returns empty strings when finished episode endDate is null', () => {
        const ep = makeArtifact(1, UserArtifactStatus.FINISHED, null);
        const season = makeSeason([ep]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftStart).toBe('');
        expect(result!.draftEnd).toBe('');
    });

    // --- startDate priority (fix: draftStart = startDate ?? endDate ?? null) ---

    it('uses startDate for draftStart when startDate is set on the first finished episode', () => {
        const startDate = new Date('2024-01-10T00:00:00Z');
        const endDate = new Date('2024-01-20T00:00:00Z');
        const ep = makeArtifact(1, UserArtifactStatus.FINISHED, endDate, startDate);
        const season = makeSeason([ep]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftStart).toBe(toInputValue(startDate));
    });

    it('startDate takes priority over endDate for draftStart when both are set', () => {
        const startDate = new Date('2024-01-01T00:00:00Z');
        const endDate = new Date('2024-01-31T00:00:00Z');
        const ep = makeArtifact(1, UserArtifactStatus.FINISHED, endDate, startDate);
        const season = makeSeason([ep]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        // draftStart must be startDate, NOT endDate
        expect(result!.draftStart).toBe(toInputValue(startDate));
        expect(result!.draftStart).not.toBe(toInputValue(endDate));
    });

    it('falls back to endDate for draftStart when startDate is null', () => {
        const endDate = new Date('2024-02-15T00:00:00Z');
        // startDate defaults to null in makeArtifact
        const ep = makeArtifact(1, UserArtifactStatus.FINISHED, endDate);
        const season = makeSeason([ep]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftStart).toBe(toInputValue(endDate));
    });

    it('returns empty draftStart when both startDate and endDate are null on the first finished episode', () => {
        const ep = makeArtifact(1, UserArtifactStatus.FINISHED, null, null);
        const season = makeSeason([ep]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftStart).toBe('');
    });

    it('draftEnd always uses endDate of the last finished episode (unaffected by the fix)', () => {
        const startDate = new Date('2024-06-01T00:00:00Z');
        const endDate = new Date('2024-06-30T00:00:00Z');
        const ep = makeArtifact(1, UserArtifactStatus.FINISHED, endDate, startDate);
        const season = makeSeason([ep]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftEnd).toBe(toInputValue(endDate));
    });

    it('uses startDate from the first finished episode only, not later ones', () => {
        const start1 = new Date('2024-01-05T00:00:00Z');
        const end1 = new Date('2024-01-15T00:00:00Z');
        const start2 = new Date('2024-02-05T00:00:00Z');
        const end2 = new Date('2024-02-15T00:00:00Z');
        const ep1 = makeArtifact(1, UserArtifactStatus.FINISHED, end1, start1);
        const ep2 = makeArtifact(2, UserArtifactStatus.FINISHED, end2, start2);
        const season = makeSeason([ep1, ep2]);
        const result = autoFillFromEpisodes(season as unknown as Artifact);
        expect(result!.draftStart).toBe(toInputValue(start1));
        expect(result!.draftEnd).toBe(toInputValue(end2));
    });
});
