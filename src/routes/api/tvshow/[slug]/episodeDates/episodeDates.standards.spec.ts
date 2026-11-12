import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Standards / implementation-specific tests for POST /api/tvshow/[slug]/episodeDates.
 *
 * These complement the contract spec (episodeDates.endpoint.spec.ts). They exercise
 * code paths only visible from the implementation in +server.ts:
 *  - season-bound bracketing with uneven season sizes (chronological, non-overlapping)
 *  - reliance on the SQL `ORDER BY season, episode` ordering (first/last occurrence)
 *  - parseInt(params.slug) producing NaN for a non-numeric slug
 *  - degenerate start === end collapsing every ms
 *  - exact setUserDate call count = N episodes + 2 * (distinct seasons)
 */

vi.mock('#lib/model/User', () => ({
    User: {
        deserialize: vi.fn().mockReturnValue({ id: 1 })
    }
}));

vi.mock('#lib/server/database', () => ({
    getDbRows: vi.fn()
}));

vi.mock('#lib/server/model/tvshow/TvshowDB', () => ({
    TvshowDB: {
        getById: vi.fn()
    }
}));

vi.mock('#lib/server/model/ArtifactDB', () => ({
    ArtifactDB: {
        setUserDate: vi.fn()
    }
}));

import { POST } from './+server';
import { User } from '#lib/model/User';
import { getDbRows } from '#lib/server/database';
import { TvshowDB } from '#lib/server/model/tvshow/TvshowDB';
import { ArtifactDB } from '#lib/server/model/ArtifactDB';

const START = '2024-01-01T00:00:00.000Z';
const END = '2024-01-11T00:00:00.000Z';
const START_MS = new Date(START).getTime();
const END_MS = new Date(END).getTime();
const DELTA = END_MS - START_MS;

function makeEvent(slug: string, body: Record<string, unknown>) {
    return {
        params: { slug },
        request: { json: vi.fn().mockResolvedValue(body) },
        locals: { user: { id: 1 } }
    } as never;
}

async function errorStatusOf(promise: Promise<unknown>): Promise<number> {
    try {
        await promise;
        throw new Error('expected handler to throw an HttpError');
    } catch (e) {
        return (e as { status: number }).status;
    }
}

function callsForArtifact(artifactId: number) {
    return vi.mocked(ArtifactDB.setUserDate).mock.calls.filter((c) => c[1] === artifactId);
}

/** Episode ms for index i in a run of `count` episodes (matches the implementation formula). */
function epMs(i: number, count: number) {
    return count === 1 ? END_MS : START_MS + (i / (count - 1)) * DELTA;
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.deserialize).mockReturnValue({ id: 1 } as never);
    vi.mocked(TvshowDB.getById).mockResolvedValue({ id: 100 } as never);
    vi.mocked(getDbRows).mockResolvedValue([] as never);
    vi.mocked(ArtifactDB.setUserDate).mockResolvedValue(undefined as never);
});

describe('season bracketing with uneven season sizes', () => {
    // Season A: 3 eps (i=0,1,2), Season B: 1 ep (i=3), Season C: 2 eps (i=4,5). count = 6.
    const rows = [
        { episodeId: 101, episodeIndex: 1, seasonId: 10, seasonIndex: 1 },
        { episodeId: 102, episodeIndex: 2, seasonId: 10, seasonIndex: 1 },
        { episodeId: 103, episodeIndex: 3, seasonId: 10, seasonIndex: 1 },
        { episodeId: 201, episodeIndex: 1, seasonId: 20, seasonIndex: 2 },
        { episodeId: 301, episodeIndex: 1, seasonId: 30, seasonIndex: 3 },
        { episodeId: 302, episodeIndex: 2, seasonId: 30, seasonIndex: 3 }
    ];

    it('sets each season start = its first episode ms and end = its last episode ms', async () => {
        vi.mocked(getDbRows).mockResolvedValue(rows as never);
        await POST(makeEvent('100', { startDate: START, endDate: END }));

        // Season 10 spans episodes i=0..2
        expect(callsForArtifact(10)).toEqual([
            [1, 10, epMs(0, 6), 'start'],
            [1, 10, epMs(2, 6), 'end']
        ]);
        // Season 20 single episode i=3 -> start === end
        expect(callsForArtifact(20)).toEqual([
            [1, 20, epMs(3, 6), 'start'],
            [1, 20, epMs(3, 6), 'end']
        ]);
        // Season 30 spans episodes i=4..5
        expect(callsForArtifact(30)).toEqual([
            [1, 30, epMs(4, 6), 'start'],
            [1, 30, epMs(5, 6), 'end']
        ]);
    });

    it('keeps seasons strictly chronological and non-overlapping (season N end < season N+1 start)', async () => {
        vi.mocked(getDbRows).mockResolvedValue(rows as never);
        await POST(makeEvent('100', { startDate: START, endDate: END }));

        const boundOf = (id: number, which: 'start' | 'end') =>
            callsForArtifact(id).find((c) => c[3] === which)![2] as number;

        const a = { start: boundOf(10, 'start'), end: boundOf(10, 'end') };
        const b = { start: boundOf(20, 'start'), end: boundOf(20, 'end') };
        const c = { start: boundOf(30, 'start'), end: boundOf(30, 'end') };

        expect(a.start).toBeLessThan(a.end);
        expect(c.start).toBeLessThan(c.end);
        // single-ep season collapses
        expect(b.start).toBe(b.end);

        // non-overlapping and chronological across the boundary
        expect(a.end).toBeLessThan(b.start);
        expect(b.end).toBeLessThan(c.start);
    });

    it('writes exactly N episode dates + 2 per distinct season (6 + 2*3 = 12 calls)', async () => {
        vi.mocked(getDbRows).mockResolvedValue(rows as never);
        await POST(makeEvent('100', { startDate: START, endDate: END }));

        expect(ArtifactDB.setUserDate).toHaveBeenCalledTimes(12);
        // Each episode written exactly once with 'end'
        for (const r of rows) {
            expect(callsForArtifact(r.episodeId)).toHaveLength(1);
            expect(callsForArtifact(r.episodeId)[0][3]).toBe('end');
        }
    });
});

describe('ordering reliance (first/last occurrence)', () => {
    it('takes season bounds from first and last occurrence in the ordered rows', async () => {
        // ORDER BY guarantees contiguous seasons. Within season 10: eps at i=0,1,2.
        vi.mocked(getDbRows).mockResolvedValue([
            { episodeId: 1, episodeIndex: 1, seasonId: 10, seasonIndex: 1 },
            { episodeId: 2, episodeIndex: 2, seasonId: 10, seasonIndex: 1 },
            { episodeId: 3, episodeIndex: 3, seasonId: 10, seasonIndex: 1 }
        ] as never);
        await POST(makeEvent('100', { startDate: START, endDate: END }));

        // first occurrence -> start, last occurrence -> end
        expect(callsForArtifact(10)).toEqual([
            [1, 10, epMs(0, 3), 'start'],
            [1, 10, epMs(2, 3), 'end']
        ]);
    });

    it('documents the ordering assumption: interleaved rows break bounds (first stays, last follows last row)', async () => {
        // This is NOT how the SQL returns rows (it ORDERs BY season, episode), but it
        // demonstrates that the handler relies on contiguous grouping. If season 10 rows
        // are split by a season 20 row, season 10's end is taken from its LAST appearance,
        // not from a true chronological max — proving the reliance on SQL ordering.
        vi.mocked(getDbRows).mockResolvedValue([
            { episodeId: 1, episodeIndex: 1, seasonId: 10, seasonIndex: 1 }, // i=0
            { episodeId: 2, episodeIndex: 1, seasonId: 20, seasonIndex: 2 }, // i=1
            { episodeId: 3, episodeIndex: 2, seasonId: 10, seasonIndex: 1 } // i=2
        ] as never);
        await POST(makeEvent('100', { startDate: START, endDate: END }));

        // Season 10 first occurrence is i=0, last occurrence is i=2 -> bounds span the whole range,
        // which would overlap season 20 (i=1). This confirms correctness depends on ORDER BY.
        expect(callsForArtifact(10)).toEqual([
            [1, 10, epMs(0, 3), 'start'],
            [1, 10, epMs(2, 3), 'end']
        ]);
        expect(callsForArtifact(20)).toEqual([
            [1, 20, epMs(1, 3), 'start'],
            [1, 20, epMs(1, 3), 'end']
        ]);
        // Overlap demonstration: season 20 sits inside season 10's bounds here.
        const s10 = callsForArtifact(10);
        const s20Start = callsForArtifact(20)[0][2] as number;
        expect(s20Start).toBeGreaterThan(s10[0][2] as number);
        expect(s20Start).toBeLessThan(s10[1][2] as number);
    });
});

describe('non-numeric slug -> parseInt NaN', () => {
    it('passes NaN to TvshowDB.getById and returns 404 when the lookup is falsy', async () => {
        vi.mocked(TvshowDB.getById).mockResolvedValue(null as never);
        const status = await errorStatusOf(POST(makeEvent('not-a-number', { startDate: START, endDate: END })));
        expect(status).toBe(404);

        const [[idArg]] = vi.mocked(TvshowDB.getById).mock.calls;
        expect(Number.isNaN(idArg)).toBe(true);
        expect(ArtifactDB.setUserDate).not.toHaveBeenCalled();
    });
});

describe('degenerate start === end', () => {
    it('collapses every episode and season bound to the same ms', async () => {
        vi.mocked(getDbRows).mockResolvedValue([
            { episodeId: 1, episodeIndex: 1, seasonId: 10, seasonIndex: 1 },
            { episodeId: 2, episodeIndex: 2, seasonId: 10, seasonIndex: 1 },
            { episodeId: 3, episodeIndex: 1, seasonId: 20, seasonIndex: 2 }
        ] as never);

        const res = await POST(makeEvent('100', { startDate: START, endDate: START }));
        const body = await (res as Response).json();
        expect(body).toEqual({ success: true });

        const all = vi.mocked(ArtifactDB.setUserDate).mock.calls;
        for (const c of all) {
            expect(c[2]).toBe(START_MS);
        }
        // N(3) + 2*distinctSeasons(2) = 7 calls
        expect(all).toHaveLength(7);
    });
});
