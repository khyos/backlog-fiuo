import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract: POST /api/tvshow/[slug]/episodeDates
 *
 * Request: params.slug = tvshow artifact id, body { startDate, endDate },
 * locals.user (serialized User; user.id < 0 means not signed in).
 *
 * Guards:
 * - 401 when not signed in (no DB writes)
 * - 400 when startDate/endDate missing
 * - 400 when either date is unparseable
 * - 400 when startDate > endDate (equal is allowed)
 * - 404 when the tvshow is not found
 *
 * Behaviour:
 * - No episodes -> { success: true }, no setUserDate calls
 * - N>1 episodes get dates distributed evenly (first=startMs, last=endMs,
 *   intermediate = startMs + i/(N-1)*(endMs-startMs)), each written with 'end'
 * - Single episode gets the END date's ms, written with 'end'
 * - Each distinct season is written twice: 'start' = its first episode ms,
 *   'end' = its last episode ms (single-episode season => start === end)
 * - Success response is json({ success: true })
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

/** setUserDate calls that targeted a given artifactId. Call shape: (userId, artifactId, dateMs, which). */
function callsForArtifact(artifactId: number) {
    return vi.mocked(ArtifactDB.setUserDate).mock.calls.filter((c) => c[1] === artifactId);
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.deserialize).mockReturnValue({ id: 1 } as never);
    vi.mocked(TvshowDB.getById).mockResolvedValue({ id: 100 } as never);
    vi.mocked(getDbRows).mockResolvedValue([] as never);
    vi.mocked(ArtifactDB.setUserDate).mockResolvedValue(undefined as never);
});

describe('POST /api/tvshow/[slug]/episodeDates — guards', () => {
    it('returns 401 and writes nothing when the user is not signed in (id < 0)', async () => {
        vi.mocked(User.deserialize).mockReturnValue({ id: -1 } as never);
        const status = await errorStatusOf(POST(makeEvent('100', { startDate: START, endDate: END })));
        expect(status).toBe(401);
        expect(ArtifactDB.setUserDate).not.toHaveBeenCalled();
    });

    it('returns 400 when startDate is missing', async () => {
        const status = await errorStatusOf(POST(makeEvent('100', { endDate: END })));
        expect(status).toBe(400);
        expect(ArtifactDB.setUserDate).not.toHaveBeenCalled();
    });

    it('returns 400 when endDate is missing', async () => {
        const status = await errorStatusOf(POST(makeEvent('100', { startDate: START })));
        expect(status).toBe(400);
    });

    it('returns 400 when startDate is unparseable', async () => {
        const status = await errorStatusOf(POST(makeEvent('100', { startDate: 'not-a-date', endDate: END })));
        expect(status).toBe(400);
    });

    it('returns 400 when endDate is unparseable', async () => {
        const status = await errorStatusOf(POST(makeEvent('100', { startDate: START, endDate: 'nope' })));
        expect(status).toBe(400);
    });

    it('returns 400 when startDate is after endDate', async () => {
        const status = await errorStatusOf(POST(makeEvent('100', { startDate: END, endDate: START })));
        expect(status).toBe(400);
    });

    it('allows equal startDate and endDate (not 400)', async () => {
        vi.mocked(getDbRows).mockResolvedValue([] as never);
        const res = await POST(makeEvent('100', { startDate: START, endDate: START }));
        const body = await (res as Response).json();
        expect(body).toEqual({ success: true });
    });

    it('returns 404 when the tvshow is not found', async () => {
        vi.mocked(TvshowDB.getById).mockResolvedValue(null as never);
        const status = await errorStatusOf(POST(makeEvent('100', { startDate: START, endDate: END })));
        expect(status).toBe(404);
        expect(ArtifactDB.setUserDate).not.toHaveBeenCalled();
    });
});

describe('POST /api/tvshow/[slug]/episodeDates — distribution behaviour', () => {
    it('no-op when there are no episodes: returns { success: true } and writes nothing', async () => {
        vi.mocked(getDbRows).mockResolvedValue([] as never);
        const res = await POST(makeEvent('100', { startDate: START, endDate: END }));
        const body = await (res as Response).json();
        expect(body).toEqual({ success: true });
        expect(ArtifactDB.setUserDate).not.toHaveBeenCalled();
    });

    it('distributes dates evenly across N>1 episodes, each written with "end"', async () => {
        // 3 episodes in one season -> first=startMs, middle=midpoint, last=endMs
        vi.mocked(getDbRows).mockResolvedValue([
            { episodeId: 1, episodeIndex: 1, seasonId: 10, seasonIndex: 1 },
            { episodeId: 2, episodeIndex: 2, seasonId: 10, seasonIndex: 1 },
            { episodeId: 3, episodeIndex: 3, seasonId: 10, seasonIndex: 1 }
        ] as never);

        await POST(makeEvent('100', { startDate: START, endDate: END }));

        const delta = END_MS - START_MS;
        expect(callsForArtifact(1)).toEqual([[1, 1, START_MS, 'end']]);
        expect(callsForArtifact(2)).toEqual([[1, 2, START_MS + (1 / 2) * delta, 'end']]);
        expect(callsForArtifact(3)).toEqual([[1, 3, END_MS, 'end']]);
    });

    it('single episode gets the END date ms, written with "end"', async () => {
        vi.mocked(getDbRows).mockResolvedValue([
            { episodeId: 7, episodeIndex: 1, seasonId: 10, seasonIndex: 1 }
        ] as never);

        await POST(makeEvent('100', { startDate: START, endDate: END }));

        expect(callsForArtifact(7)).toEqual([[1, 7, END_MS, 'end']]);
    });

    it('brackets each season with start=first-episode ms and end=last-episode ms', async () => {
        // Season 10: 1 episode (start === end). Season 20: 2 episodes.
        // count = 3 -> dateMs = startMs + i/2*delta
        vi.mocked(getDbRows).mockResolvedValue([
            { episodeId: 1, episodeIndex: 1, seasonId: 10, seasonIndex: 1 },
            { episodeId: 2, episodeIndex: 1, seasonId: 20, seasonIndex: 2 },
            { episodeId: 3, episodeIndex: 2, seasonId: 20, seasonIndex: 2 }
        ] as never);

        await POST(makeEvent('100', { startDate: START, endDate: END }));

        const delta = END_MS - START_MS;
        const ep0 = START_MS;
        const ep1 = START_MS + (1 / 2) * delta;
        const ep2 = END_MS;

        // Season 10: single episode -> start === end === ep0
        expect(callsForArtifact(10)).toEqual([
            [1, 10, ep0, 'start'],
            [1, 10, ep0, 'end']
        ]);

        // Season 20: start = its first episode (ep1), end = its last episode (ep2)
        expect(callsForArtifact(20)).toEqual([
            [1, 20, ep1, 'start'],
            [1, 20, ep2, 'end']
        ]);
    });

    it('returns json({ success: true }) on success', async () => {
        vi.mocked(getDbRows).mockResolvedValue([
            { episodeId: 1, episodeIndex: 1, seasonId: 10, seasonIndex: 1 }
        ] as never);
        const res = await POST(makeEvent('100', { startDate: START, endDate: END }));
        const body = await (res as Response).json();
        expect(body).toEqual({ success: true });
    });
});
