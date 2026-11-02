import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract: GET /api/tierlist/[slug]/artifacts
 *
 * - Requires auth: returns the canEditTierList status (403/404) if not authorized
 * - Returns 400 if the tier list is not standalone
 * - Returns a paginated list of artifacts with an alreadyPresent boolean field
 * - alreadyPresent: true for artifacts already on the tier list, false otherwise
 * - Returns { artifacts, total } in the response body
 */

vi.mock('#lib/server/model/TierListDB', () => ({
    TierListDB: {
        canEditTierList: vi.fn(),
        getTierListById: vi.fn(),
        getItemArtifactIds: vi.fn()
    }
}));

vi.mock('#lib/server/model/ArtifactDB', () => ({
    ArtifactDB: {
        getArtifacts: vi.fn(),
        countArtifacts: vi.fn()
    }
}));

vi.mock('#lib/model/User', () => ({
    User: { deserialize: vi.fn().mockReturnValue({ id: 1 }) }
}));

import { GET } from './+server';
import { TierListDB } from '#lib/server/model/TierListDB';
import { ArtifactDB } from '#lib/server/model/ArtifactDB';

const AUTH_OK = { status: 200, message: 'OK' };
const STANDALONE_TIER_LIST = { id: 42, artifactType: 'game', isStandalone: true };

function makeEvent(slug: string, searchParams: Record<string, string> = {}) {
    return {
        params: { slug },
        url: {
            searchParams: {
                get: (key: string) => searchParams[key] ?? null
            }
        },
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

describe('GET /api/tierlist/[slug]/artifacts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue(AUTH_OK as never);
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(STANDALONE_TIER_LIST as never);
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([]);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(0);
        vi.mocked(TierListDB.getItemArtifactIds).mockResolvedValue([]);
    });

    it('returns 403 when the user is not authorized', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 403, message: 'Not authorized' } as never);
        const status = await errorStatusOf(GET(makeEvent('42')));
        expect(status).toBe(403);
    });

    it('returns 404 when canEditTierList reports tier list does not exist', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 404, message: 'Not found' } as never);
        const status = await errorStatusOf(GET(makeEvent('42')));
        expect(status).toBe(404);
    });

    it('returns 400 if the tier list is not standalone', async () => {
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(
            { id: 42, artifactType: 'game', isStandalone: false } as never
        );
        const status = await errorStatusOf(GET(makeEvent('42')));
        expect(status).toBe(400);
    });

    it('returns artifacts with alreadyPresent: false for artifacts not yet on the tier list', async () => {
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([
            { id: 1, title: 'Game 1' },
            { id: 2, title: 'Game 2' }
        ] as never);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(2);
        vi.mocked(TierListDB.getItemArtifactIds).mockResolvedValue([]);

        const res = await GET(makeEvent('42'));
        const body = await (res as Response).json();

        expect(body.artifacts).toHaveLength(2);
        expect(body.artifacts[0]).toMatchObject({ id: 1, alreadyPresent: false });
        expect(body.artifacts[1]).toMatchObject({ id: 2, alreadyPresent: false });
    });

    it('marks alreadyPresent: true for artifacts already on the tier list', async () => {
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([
            { id: 1, title: 'Game 1' },
            { id: 2, title: 'Game 2' },
            { id: 3, title: 'Game 3' }
        ] as never);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(3);
        vi.mocked(TierListDB.getItemArtifactIds).mockResolvedValue([1, 3]); // artifacts 1 and 3 already present

        const res = await GET(makeEvent('42'));
        const body = await (res as Response).json();

        expect(body.artifacts[0]).toMatchObject({ id: 1, alreadyPresent: true });
        expect(body.artifacts[1]).toMatchObject({ id: 2, alreadyPresent: false });
        expect(body.artifacts[2]).toMatchObject({ id: 3, alreadyPresent: true });
    });

    it('returns the total count of artifacts in the response', async () => {
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(100);

        const res = await GET(makeEvent('42'));
        const body = await (res as Response).json();

        expect(body.total).toBe(100);
    });

    it('returns an empty artifacts array and total=0 when no artifacts exist', async () => {
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([]);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(0);
        vi.mocked(TierListDB.getItemArtifactIds).mockResolvedValue([]);

        const res = await GET(makeEvent('42'));
        const body = await (res as Response).json();

        expect(body.artifacts).toEqual([]);
        expect(body.total).toBe(0);
    });

    it('returns all present artifacts as alreadyPresent: true when all are on the tier list', async () => {
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([
            { id: 5, title: 'Game 5' },
            { id: 6, title: 'Game 6' }
        ] as never);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(2);
        vi.mocked(TierListDB.getItemArtifactIds).mockResolvedValue([5, 6]);

        const res = await GET(makeEvent('42'));
        const body = await (res as Response).json();

        expect(body.artifacts[0]).toMatchObject({ id: 5, alreadyPresent: true });
        expect(body.artifacts[1]).toMatchObject({ id: 6, alreadyPresent: true });
    });

    it('response shape has artifacts array and total number', async () => {
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([{ id: 1, title: 'G' }] as never);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(1);

        const res = await GET(makeEvent('42'));
        const body = await (res as Response).json();

        expect(body).toHaveProperty('artifacts');
        expect(body).toHaveProperty('total');
        expect(Array.isArray(body.artifacts)).toBe(true);
        expect(typeof body.total).toBe('number');
    });

    it('returns 400 when the slug is not a valid numeric ID', async () => {
        const status = await errorStatusOf(GET(makeEvent('not-a-number')));
        expect(status).toBe(400);
        expect(ArtifactDB.getArtifacts).not.toHaveBeenCalled();
    });

    it('caps pageSize at 100 even if a larger value is requested', async () => {
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([]);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(0);

        await GET(makeEvent('42', { pageSize: '500' }));

        const callArgs = vi.mocked(ArtifactDB.getArtifacts).mock.calls[0];
        // pageSize argument is the third parameter
        expect(callArgs[2]).toBeLessThanOrEqual(100);
    });

    it('returns 400 when page param is not a valid number', async () => {
        const status = await errorStatusOf(GET(makeEvent('42', { page: 'abc' })));
        expect(status).toBe(400);
        expect(ArtifactDB.getArtifacts).not.toHaveBeenCalled();
    });

    it('falls back to pageSize=20 when pageSize param is not a valid number', async () => {
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([]);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(0);

        await GET(makeEvent('42', { pageSize: 'invalid' }));

        const callArgs = vi.mocked(ArtifactDB.getArtifacts).mock.calls[0];
        // pageSize argument is the third parameter; NaN pageSize should fall back to 20
        expect(callArgs[2]).toBe(20);
    });

    it('returns 404 when getTierListById returns null', async () => {
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(null as never);
        const status = await errorStatusOf(GET(makeEvent('42')));
        expect(status).toBe(404);
        expect(ArtifactDB.getArtifacts).not.toHaveBeenCalled();
    });

    it('returns 400 when page param is negative', async () => {
        const status = await errorStatusOf(GET(makeEvent('42', { page: '-1' })));
        expect(status).toBe(400);
        expect(ArtifactDB.getArtifacts).not.toHaveBeenCalled();
    });

    it('clamps pageSize to 1 when a value less than 1 is requested', async () => {
        vi.mocked(ArtifactDB.getArtifacts).mockResolvedValue([]);
        vi.mocked(ArtifactDB.countArtifacts).mockResolvedValue(0);

        await GET(makeEvent('42', { pageSize: '0' }));

        const callArgs = vi.mocked(ArtifactDB.getArtifacts).mock.calls[0];
        // pageSize argument is the third parameter; value 0 should be clamped to 1
        expect(callArgs[2]).toBe(1);
    });
});
