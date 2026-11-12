import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Standards tests for the tvshow-episode-dates page loader (+page.server.ts).
 *
 * The loader guards on user.id < 0 (401) and otherwise returns the rows from
 * getDbRows under a `tvshows` key, unchanged.
 */

vi.mock('#lib/model/User', () => ({
    User: {
        deserialize: vi.fn().mockReturnValue({ id: 1 })
    }
}));

vi.mock('#lib/server/database', () => ({
    getDbRows: vi.fn()
}));

import { load } from './+page.server';
import { User } from '#lib/model/User';
import { getDbRows } from '#lib/server/database';

function makeEvent() {
    return { locals: { user: { id: 1 } } } as never;
}

async function errorStatusOf(promise: unknown): Promise<number> {
    try {
        await (promise as Promise<unknown>);
        throw new Error('expected loader to throw an HttpError');
    } catch (e) {
        return (e as { status: number }).status;
    }
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.deserialize).mockReturnValue({ id: 1 } as never);
    vi.mocked(getDbRows).mockResolvedValue([] as never);
});

describe('tvshow-episode-dates loader', () => {
    it('throws 401 when the user is not signed in (id < 0) and never queries the database', async () => {
        vi.mocked(User.deserialize).mockReturnValue({ id: -1 } as never);
        const status = await errorStatusOf(load(makeEvent()));
        expect(status).toBe(401);
        expect(getDbRows).not.toHaveBeenCalled();
    });

    it('returns the rows from getDbRows unchanged under a `tvshows` key', async () => {
        const rows = [
            { tvshowId: 1, title: 'Alpha', showStartDate: 100, showEndDate: 200, episodesMissingDates: 3 },
            { tvshowId: 2, title: 'Beta', showStartDate: null, showEndDate: null, episodesMissingDates: 1 }
        ];
        vi.mocked(getDbRows).mockResolvedValue(rows as never);

        const result = await load(makeEvent()) as { tvshows: typeof rows };
        expect(result).toEqual({ tvshows: rows });
        // same reference — the loader does not transform the rows
        expect(result.tvshows).toBe(rows);
    });

    it('returns an empty list when the user has no shows with missing episode dates', async () => {
        vi.mocked(getDbRows).mockResolvedValue([] as never);
        const result = await load(makeEvent());
        expect(result).toEqual({ tvshows: [] });
    });

    it('scopes the query to the signed-in user id (passed twice for episode and show joins)', async () => {
        vi.mocked(User.deserialize).mockReturnValue({ id: 42 } as never);
        await load(makeEvent());

        expect(getDbRows).toHaveBeenCalledTimes(1);
        const params = vi.mocked(getDbRows).mock.calls[0][1] as unknown[];
        // user.id appears twice in the parameter list (ua_ep.userId and ua_show.userId)
        expect(params.filter((p) => p === 42)).toHaveLength(2);
    });
});
