import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract: POST /api/tierlist/[slug]/item
 *
 * - Requires auth: returns the canEditTierList status (403/404) if not authorized
 * - Returns 403 if the tier list is not standalone (only standalone lists can accept new items)
 * - Returns 409 if the artifact is already present on the tier list
 * - Returns 400 if the artifact type does not match the tier list's artifact type
 * - Returns 404 if the artifact does not exist
 * - Adds the artifact to the unranked pool and returns { success: true } on success
 */

vi.mock('#lib/server/model/TierListDB', () => ({
    TierListDB: {
        canEditTierList: vi.fn(),
        getTierListById: vi.fn(),
        getItemArtifactIds: vi.fn(),
        addUnrankedItems: vi.fn(),
        deleteItem: vi.fn()
    }
}));

vi.mock('#lib/server/model/ArtifactDB', () => ({
    ArtifactDB: {
        getArtifactById: vi.fn()
    }
}));

vi.mock('#lib/model/User', () => ({
    User: { deserialize: vi.fn().mockReturnValue({ id: 1 }) }
}));

import { POST, DELETE } from './+server';
import { TierListDB } from '#lib/server/model/TierListDB';
import { ArtifactDB } from '#lib/server/model/ArtifactDB';

const AUTH_OK = { status: 200, message: 'OK' };
const STANDALONE_TIER_LIST = { id: 42, artifactType: 'game', isStandalone: true };

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

describe('POST /api/tierlist/[slug]/item', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue(AUTH_OK as never);
        vi.mocked(TierListDB.getTierListById).mockResolvedValue(STANDALONE_TIER_LIST as never);
        vi.mocked(TierListDB.getItemArtifactIds).mockResolvedValue([]);
        vi.mocked(TierListDB.addUnrankedItems).mockResolvedValue(undefined);
    });

    it('returns 403 when canEditTierList reports the user is not authorized', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 403, message: 'Not authorized' } as never);
        const status = await errorStatusOf(POST(makeEvent('42', { artifactId: 10 })));
        expect(status).toBe(403);
        expect(TierListDB.addUnrankedItems).not.toHaveBeenCalled();
    });

    it('returns 404 when canEditTierList reports the tier list does not exist', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 404, message: 'Not found' } as never);
        const status = await errorStatusOf(POST(makeEvent('42', { artifactId: 10 })));
        expect(status).toBe(404);
    });

    it('returns 400 when the tier list is not standalone', async () => {
        vi.mocked(TierListDB.getTierListById).mockResolvedValue({ id: 42, artifactType: 'game', isStandalone: false } as never);
        const status = await errorStatusOf(POST(makeEvent('42', { artifactId: 10 })));
        expect(status).toBe(400);
        expect(TierListDB.addUnrankedItems).not.toHaveBeenCalled();
    });

    it('returns 404 when the artifact does not exist', async () => {
        vi.mocked(ArtifactDB.getArtifactById).mockResolvedValue(null);
        const status = await errorStatusOf(POST(makeEvent('42', { artifactId: 999 })));
        expect(status).toBe(404);
        expect(TierListDB.addUnrankedItems).not.toHaveBeenCalled();
    });

    it('returns 400 when the artifact type does not match the tier list artifact type', async () => {
        vi.mocked(ArtifactDB.getArtifactById).mockResolvedValue({ id: 10, type: 'movie' } as never);
        const status = await errorStatusOf(POST(makeEvent('42', { artifactId: 10 })));
        expect(status).toBe(400);
        expect(TierListDB.addUnrankedItems).not.toHaveBeenCalled();
    });

    it('returns 409 when the artifact is already present on the tier list', async () => {
        vi.mocked(ArtifactDB.getArtifactById).mockResolvedValue({ id: 10, type: 'game' } as never);
        vi.mocked(TierListDB.getItemArtifactIds).mockResolvedValue([10]);
        const status = await errorStatusOf(POST(makeEvent('42', { artifactId: 10 })));
        expect(status).toBe(409);
        expect(TierListDB.addUnrankedItems).not.toHaveBeenCalled();
    });

    it('adds the artifact to the unranked pool and returns { success: true } on success', async () => {
        vi.mocked(ArtifactDB.getArtifactById).mockResolvedValue({ id: 10, type: 'game' } as never);
        vi.mocked(TierListDB.getItemArtifactIds).mockResolvedValue([]);

        const res = await POST(makeEvent('42', { artifactId: 10 }));
        const body = await (res as Response).json();

        expect(TierListDB.addUnrankedItems).toHaveBeenCalledWith(42, [10]);
        expect(body).toEqual({ success: true });
    });

    it('returns 400 when the slug is not a valid numeric ID', async () => {
        const status = await errorStatusOf(POST(makeEvent('not-a-number', { artifactId: 10 })));
        expect(status).toBe(400);
        expect(TierListDB.addUnrankedItems).not.toHaveBeenCalled();
    });
});

describe('DELETE /api/tierlist/[slug]/item', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue(AUTH_OK as never);
        vi.mocked(TierListDB.deleteItem).mockResolvedValue(undefined);
    });

    it('returns 400 when the slug is not a valid numeric ID', async () => {
        const status = await errorStatusOf(DELETE(makeEvent('not-a-number', { artifactId: 10 })));
        expect(status).toBe(400);
        expect(TierListDB.deleteItem).not.toHaveBeenCalled();
    });

    it('returns 403 when canEditTierList reports the user is not authorized', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 403, message: 'Not authorized' } as never);
        const status = await errorStatusOf(DELETE(makeEvent('42', { artifactId: 10 })));
        expect(status).toBe(403);
        expect(TierListDB.deleteItem).not.toHaveBeenCalled();
    });

    it('returns 404 when canEditTierList reports the tier list does not exist', async () => {
        vi.mocked(TierListDB.canEditTierList).mockResolvedValue({ status: 404, message: 'Not found' } as never);
        const status = await errorStatusOf(DELETE(makeEvent('42', { artifactId: 10 })));
        expect(status).toBe(404);
        expect(TierListDB.deleteItem).not.toHaveBeenCalled();
    });

    it('calls deleteItem with the parsed tier list ID and artifact ID', async () => {
        await DELETE(makeEvent('42', { artifactId: 10 }));
        expect(TierListDB.deleteItem).toHaveBeenCalledWith(42, 10);
    });

    it('returns { success: true } on successful deletion', async () => {
        const res = await DELETE(makeEvent('42', { artifactId: 10 }));
        const body = await (res as Response).json();
        expect(body).toEqual({ success: true });
    });
});
