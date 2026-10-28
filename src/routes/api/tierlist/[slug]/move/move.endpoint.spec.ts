import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Standards tests for the tier-list move endpoint (POST /api/tierlist/[slug]/move).
 *
 * These exercise the branches that are only visible by reading +server.ts, with
 * TierListDB + User mocked so no database is touched:
 *   - `parseInt(params.slug)` is forwarded as the tier-list id
 *   - the `targetTierId ?? null` coalescing (undefined OR null body value => Unranked pool),
 *     while a real tier id (including 0) is forwarded unchanged
 *   - the authorization gate short-circuits (non-200 => no moveItem call)
 *   - a throwing moveItem is mapped to a 500 error
 *   - the happy path returns { success: true }
 */

vi.mock('#lib/server/model/TierListDB', () => ({
    TierListDB: {
        canEditTierList: vi.fn(),
        moveItem: vi.fn()
    }
}));

vi.mock('#lib/model/User', () => ({
    User: { deserialize: vi.fn().mockReturnValue({ id: 1 }) }
}));

import { POST } from './+server';
import { TierListDB } from '#lib/server/model/TierListDB';

const OK = { status: 200, message: 'OK' };

function makeEvent(slug: string, body: Record<string, unknown>) {
    return {
        params: { slug },
        request: { json: vi.fn().mockResolvedValue(body) },
        locals: { user: { id: 1 } }
    } as never;
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
    try {
        await promise;
        throw new Error('expected handler to throw an HttpError');
    } catch (e) {
        return (e as { status: number }).status;
    }
}

describe('move endpoint - targetTierId coalescing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue(OK as never);
        vi.mocked(TierListDB.moveItem).mockResolvedValue(undefined);
    });

    it('coalesces an undefined targetTierId to null (Unranked pool)', async () => {
        await POST(makeEvent('42', { artifactId: 7, targetPosition: 2 }));
        expect(TierListDB.moveItem).toHaveBeenCalledWith(42, 7, null, 2);
    });

    it('forwards an explicit null targetTierId as null', async () => {
        await POST(makeEvent('42', { artifactId: 7, targetTierId: null, targetPosition: 0 }));
        expect(TierListDB.moveItem).toHaveBeenCalledWith(42, 7, null, 0);
    });

    it('forwards a real tier id unchanged', async () => {
        await POST(makeEvent('99', { artifactId: 7, targetTierId: 5, targetPosition: 3 }));
        expect(TierListDB.moveItem).toHaveBeenCalledWith(99, 7, 5, 3);
    });

    it('forwards tier id 0 unchanged (not coalesced to null)', async () => {
        await POST(makeEvent('99', { artifactId: 7, targetTierId: 0, targetPosition: 1 }));
        expect(TierListDB.moveItem).toHaveBeenCalledWith(99, 7, 0, 1);
    });

    it('returns { success: true } on the happy path', async () => {
        const res = await POST(makeEvent('42', { artifactId: 7, targetTierId: 1, targetPosition: 0 }));
        expect(await (res as Response).json()).toEqual({ success: true });
    });
});

describe('move endpoint - gates and error handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(TierListDB.moveItem).mockResolvedValue(undefined);
    });

    it('short-circuits with the authorization status and never calls moveItem', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 403, message: 'Not authorized' } as never);
        expect(await statusOf(POST(makeEvent('42', { artifactId: 7, targetPosition: 0 })))).toBe(403);
        expect(TierListDB.moveItem).not.toHaveBeenCalled();
    });

    it('propagates a 404 authorization status', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 404, message: 'Not found' } as never);
        expect(await statusOf(POST(makeEvent('42', { artifactId: 7, targetPosition: 0 })))).toBe(404);
    });

    it('maps a throwing moveItem to a 500 error', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue(OK as never);
        vi.mocked(TierListDB.moveItem).mockRejectedValue(new Error('boom'));
        expect(await statusOf(POST(makeEvent('42', { artifactId: 7, targetPosition: 0 })))).toBe(500);
    });
});
