import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract: POST /api/tierlist/[slug]/unlink
 *
 * - Requires auth: returns the canEditTierList status (403/404) if not authorized
 * - Returns 400 if the tier list is already standalone
 * - On success: calls unlinkFromBacklog and returns the updated tier list as JSON
 *   with isStandalone=true
 */

vi.mock('#lib/server/model/TierListDB', () => ({
    TierListDB: {
        canEditTierList: vi.fn(),
        getTierListById: vi.fn(),
        unlinkFromBacklog: vi.fn(),
        getTierListByIdWithItems: vi.fn()
    }
}));

vi.mock('#lib/model/User', () => ({
    User: { deserialize: vi.fn().mockReturnValue({ id: 1 }) }
}));

import { POST } from './+server';
import { TierListDB } from '#lib/server/model/TierListDB';

const OK = { status: 200, message: 'OK' };

function makeEvent(slug: string) {
    return {
        params: { slug },
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

describe('POST /api/tierlist/[slug]/unlink', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue(OK as never);
        vi.mocked(TierListDB.unlinkFromBacklog).mockResolvedValue(undefined);
    });

    it('returns 403 when canEditTierList reports the user is not authorized', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 403, message: 'Not authorized' } as never);
        const status = await errorStatusOf(POST(makeEvent('42')));
        expect(status).toBe(403);
        expect(TierListDB.unlinkFromBacklog).not.toHaveBeenCalled();
    });

    it('returns 404 when canEditTierList reports the tier list does not exist', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 404, message: 'Not found' } as never);
        const status = await errorStatusOf(POST(makeEvent('42')));
        expect(status).toBe(404);
        expect(TierListDB.unlinkFromBacklog).not.toHaveBeenCalled();
    });

    it('returns 400 if the tier list is already standalone', async () => {
        vi.mocked(TierListDB.getTierListById).mockResolvedValue({ id: 42, isStandalone: true } as never);
        const status = await errorStatusOf(POST(makeEvent('42')));
        expect(status).toBe(400);
        expect(TierListDB.unlinkFromBacklog).not.toHaveBeenCalled();
    });

    it('calls unlinkFromBacklog with the tier list ID on success', async () => {
        const linkedTierList = { id: 42, isStandalone: false };
        const standaloneList = {
            id: 42,
            isStandalone: true,
            toJSON: () => ({ __type: 'TierList', id: 42, isStandalone: true, userId: 1, backlogId: null, artifactType: 'game', title: 'T', tiers: [], unranked: [] })
        };
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(linkedTierList as never);
        vi.mocked(TierListDB.getTierListByIdWithItems).mockResolvedValue(standaloneList as never);

        await POST(makeEvent('42'));

        expect(TierListDB.unlinkFromBacklog).toHaveBeenCalledWith(42);
    });

    it('returns the updated tier list JSON with isStandalone=true on success', async () => {
        const linkedTierList = { id: 42, isStandalone: false };
        const standaloneList = {
            id: 42,
            isStandalone: true,
            toJSON: () => ({
                __type: 'TierList',
                id: 42,
                isStandalone: true,
                userId: 1,
                backlogId: null,
                artifactType: 'game',
                title: 'T',
                tiers: [],
                unranked: []
            })
        };
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(linkedTierList as never);
        vi.mocked(TierListDB.getTierListByIdWithItems).mockResolvedValue(standaloneList as never);

        const res = await POST(makeEvent('42'));
        const body = await (res as Response).json();

        expect(body.isStandalone).toBe(true);
    });

    it('parses the slug as the tier list ID when calling unlinkFromBacklog', async () => {
        const linkedTierList = { id: 99, isStandalone: false };
        const standaloneList = {
            id: 99,
            isStandalone: true,
            toJSON: () => ({
                __type: 'TierList',
                id: 99,
                isStandalone: true,
                userId: 1,
                backlogId: null,
                artifactType: 'game',
                title: 'T',
                tiers: [],
                unranked: []
            })
        };
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(linkedTierList as never);
        vi.mocked(TierListDB.getTierListByIdWithItems).mockResolvedValue(standaloneList as never);

        await POST(makeEvent('99'));

        expect(TierListDB.unlinkFromBacklog).toHaveBeenCalledWith(99);
    });

    it('returns 400 when the slug is not a valid numeric ID', async () => {
        const status = await errorStatusOf(POST(makeEvent('abc')));
        expect(status).toBe(400);
        expect(TierListDB.unlinkFromBacklog).not.toHaveBeenCalled();
    });

    it('returns 404 when getTierListById returns null', async () => {
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(null as never);
        const status = await errorStatusOf(POST(makeEvent('42')));
        expect(status).toBe(404);
        expect(TierListDB.unlinkFromBacklog).not.toHaveBeenCalled();
    });

    it('returns 404 when getTierListByIdWithItems returns null after unlinking', async () => {
        const linkedTierList = { id: 42, isStandalone: false };
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(linkedTierList as never);
        vi.mocked(TierListDB.getTierListByIdWithItems).mockResolvedValue(null as never);
        const status = await errorStatusOf(POST(makeEvent('42')));
        expect(status).toBe(404);
        expect(TierListDB.unlinkFromBacklog).toHaveBeenCalledWith(42);
    });
});
