import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract: POST /api/tierlist
 *
 * Flow A — standalone tier list: { artifactType, title }
 * - Creates a standalone tier list for root artifact types
 * - Returns { id } of the created tier list
 * - Rejects child artifact types (ANIME_EPISODE, TVSHOW_EPISODE, TVSHOW_SEASON) with 400
 * - Rejects requests missing artifactType or title with 400
 *
 * Flow B — linked tier list: { backlogId }
 * - Delegates to createTierListFromBacklog and returns { id }
 * - Returns 403 when the user cannot edit the backlog
 */

vi.mock('#lib/server/model/TierListUtil', () => ({
    TierListUtil: {
        createTierListFromBacklog: vi.fn(),
        createStandaloneTierList: vi.fn()
    },
    TIER_LIST_ARTIFACT_TYPES: ['game', 'movie', 'tvshow', 'anime', 'comics']
}));

vi.mock('#lib/server/model/BacklogDB', () => ({
    BacklogDB: {
        canEditBacklog: vi.fn()
    }
}));

vi.mock('#lib/model/User', () => ({
    User: {
        deserialize: vi.fn().mockReturnValue({
            id: 1,
            hasRight: vi.fn().mockReturnValue(true)
        })
    },
    UserRights: {
        CREATE_BACKLOG: 'create_backlog'
    }
}));

import { POST } from './+server';
import { TierListUtil } from '#lib/server/model/TierListUtil';
import { BacklogDB } from '#lib/server/model/BacklogDB';
import { User } from '#lib/model/User';

const OK = { status: 200, message: 'OK' };
const AUTH_FAIL = { status: 403, message: 'Not authorized' };

function makeEvent(body: Record<string, unknown>) {
    return {
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

describe('POST /api/tierlist — standalone tier list flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(User.deserialize).mockReturnValue({ id: 1, hasRight: vi.fn().mockReturnValue(true) } as never);
    });

    it('creates a standalone tier list for a valid root artifactType and returns its id', async () => {
        vi.mocked(TierListUtil.createStandaloneTierList).mockResolvedValue(42 as never);
        const res = await POST(makeEvent({ artifactType: 'game', title: 'My List' }));
        const body = await (res as Response).json();
        expect(body.id).toBe(42);
    });

    it('calls createStandaloneTierList with the user id, artifactType, and title', async () => {
        vi.mocked(TierListUtil.createStandaloneTierList).mockResolvedValue(42 as never);
        await POST(makeEvent({ artifactType: 'game', title: 'My List' }));
        expect(TierListUtil.createStandaloneTierList).toHaveBeenCalledWith(1, 'game', 'My List');
    });

    it('returns 403 when the user does not have CREATE_BACKLOG right', async () => {
        vi.mocked(User.deserialize).mockReturnValueOnce({ id: 1, hasRight: vi.fn().mockReturnValue(false) } as never);
        const status = await errorStatusOf(POST(makeEvent({ artifactType: 'game', title: 'My List' })));
        expect(status).toBe(403);
        expect(TierListUtil.createStandaloneTierList).not.toHaveBeenCalled();
    });

    it('rejects ANIME_EPISODE (child type) with 400', async () => {
        const status = await errorStatusOf(POST(makeEvent({ artifactType: 'anime_episode', title: 'Bad' })));
        expect(status).toBe(400);
        expect(TierListUtil.createStandaloneTierList).not.toHaveBeenCalled();
    });

    it('rejects TVSHOW_EPISODE (child type) with 400', async () => {
        const status = await errorStatusOf(POST(makeEvent({ artifactType: 'tvshow_episode', title: 'Bad' })));
        expect(status).toBe(400);
    });

    it('rejects TVSHOW_SEASON (child type) with 400', async () => {
        const status = await errorStatusOf(POST(makeEvent({ artifactType: 'tvshow_season', title: 'Bad' })));
        expect(status).toBe(400);
    });

    it('rejects a request missing artifactType with 400', async () => {
        const status = await errorStatusOf(POST(makeEvent({ title: 'My List' })));
        expect(status).toBe(400);
    });

    it('rejects a request missing title with 400', async () => {
        const status = await errorStatusOf(POST(makeEvent({ artifactType: 'game' })));
        expect(status).toBe(400);
    });

    it('rejects a completely empty body with 400', async () => {
        const status = await errorStatusOf(POST(makeEvent({})));
        expect(status).toBe(400);
    });
});

describe('POST /api/tierlist — linked tier list flow (backlogId provided)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(User.deserialize).mockReturnValue({ id: 1, hasRight: vi.fn().mockReturnValue(true) } as never);
        vi.mocked(BacklogDB.canEditBacklog).mockResolvedValue(OK as never);
    });

    it('delegates to createTierListFromBacklog and returns its id', async () => {
        vi.mocked(TierListUtil.createTierListFromBacklog).mockResolvedValue(55 as never);
        const res = await POST(makeEvent({ backlogId: 10 }));
        const body = await (res as Response).json();
        expect(body.id).toBe(55);
    });

    it('does not call createStandaloneTierList when backlogId is provided', async () => {
        vi.mocked(TierListUtil.createTierListFromBacklog).mockResolvedValue(55 as never);
        await POST(makeEvent({ backlogId: 10 }));
        expect(TierListUtil.createStandaloneTierList).not.toHaveBeenCalled();
    });

    it('returns 403 when the user cannot edit the backlog', async () => {
        vi.mocked(BacklogDB.canEditBacklog).mockResolvedValue(AUTH_FAIL as never);
        const status = await errorStatusOf(POST(makeEvent({ backlogId: 10 })));
        expect(status).toBe(403);
        expect(TierListUtil.createTierListFromBacklog).not.toHaveBeenCalled();
    });

    it('returns 404 when the backlog is not found', async () => {
        vi.mocked(BacklogDB.canEditBacklog).mockResolvedValue({ status: 404, message: 'Not found' } as never);
        const status = await errorStatusOf(POST(makeEvent({ backlogId: 999 })));
        expect(status).toBe(404);
    });
});
