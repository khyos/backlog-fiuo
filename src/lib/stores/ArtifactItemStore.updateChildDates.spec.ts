/**
 * Contract tests for updateChildDates — ArtifactItemStore
 *
 * Public contract (from spec):
 *   updateChildDates(childId: number, startDate: Date | null, endDate: Date | null): Promise<void>
 *
 *   - Calls POST /api/artifact/{childId}/userDate twice:
 *       once with startEnd: "start", once with startEnd: "end"
 *   - On success: updates the in-memory store child with new dates
 *   - Throws if either API call returns non-OK
 *   - Does NOT update the store if the API call fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeStore, updateChildDates } from './ArtifactItemStore';
import { ArtifactType } from '#lib/model/Artifact';
import { Game } from '#lib/model/game/Game';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHILD_ID = 42;
const START_DATE = new Date('2024-01-15');
const END_DATE = new Date('2024-06-30');

function buildStoreWithChild(): { parent: Game; child: Game } {
    const parent = new Game(1, 'Parent Artifact', ArtifactType.GAME, new Date(), 60);
    parent.genres = [];
    parent.ratings = [];
    parent.tags = [];
    parent.links = [];
    parent.platforms = [];

    const child = new Game(CHILD_ID, 'Child Artifact', ArtifactType.GAME, new Date(), 30);
    child.genres = [];
    child.ratings = [];
    child.tags = [];
    child.links = [];
    child.platforms = [];

    parent.children = [child];

    initializeStore(parent);

    return { parent, child };
}

function makeFetchOk() {
    return vi.fn().mockResolvedValue({ ok: true } as Response);
}

function makeFetchFail() {
    return vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
}

// ---------------------------------------------------------------------------
// Contract: POST /api/artifact/{childId}/userDate is called exactly twice
// ---------------------------------------------------------------------------

// Each call to updateChildDates must result in exactly two HTTP POST requests
// — one for the start date and one for the end date — directed at the correct URL.
describe('updateChildDates — fetch calls', () => {
    let fetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        buildStoreWithChild();
        fetchSpy = makeFetchOk();
        vi.stubGlobal('fetch', fetchSpy);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('makes exactly two fetch calls per invocation', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('sends both requests to the correct URL for the given childId', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        const urls = fetchSpy.mock.calls.map((call: unknown[]) => call[0] as string);
        expect(urls[0]).toContain(`/api/artifact/${CHILD_ID}/userDate`);
        expect(urls[1]).toContain(`/api/artifact/${CHILD_ID}/userDate`);
    });

    it('sends both requests as POST', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        const methods = fetchSpy.mock.calls.map(
            (call: unknown[]) => (call[1] as RequestInit)?.method?.toUpperCase()
        );
        expect(methods[0]).toBe('POST');
        expect(methods[1]).toBe('POST');
    });

    it('includes startEnd: "start" in one of the two calls', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        const bodies = fetchSpy.mock.calls.map((call: unknown[]) => {
            const body = (call[1] as RequestInit)?.body;
            return typeof body === 'string' ? JSON.parse(body) : body;
        });
        const hasStart = bodies.some((b: Record<string, unknown>) => b?.startEnd === 'start');
        expect(hasStart).toBe(true);
    });

    it('includes startEnd: "end" in one of the two calls', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        const bodies = fetchSpy.mock.calls.map((call: unknown[]) => {
            const body = (call[1] as RequestInit)?.body;
            return typeof body === 'string' ? JSON.parse(body) : body;
        });
        const hasEnd = bodies.some((b: Record<string, unknown>) => b?.startEnd === 'end');
        expect(hasEnd).toBe(true);
    });

    it('passes null startDate correctly in the start request', async () => {
        await updateChildDates(CHILD_ID, null, END_DATE);
        const bodies = fetchSpy.mock.calls.map((call: unknown[]) => {
            const body = (call[1] as RequestInit)?.body;
            return typeof body === 'string' ? JSON.parse(body) : body;
        });
        const startBody = bodies.find((b: Record<string, unknown>) => b?.startEnd === 'start');
        expect(startBody).toBeDefined();
    });

    it('passes null endDate correctly in the end request', async () => {
        await updateChildDates(CHILD_ID, START_DATE, null);
        const bodies = fetchSpy.mock.calls.map((call: unknown[]) => {
            const body = (call[1] as RequestInit)?.body;
            return typeof body === 'string' ? JSON.parse(body) : body;
        });
        const endBody = bodies.find((b: Record<string, unknown>) => b?.startEnd === 'end');
        expect(endBody).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// Contract: on success, the in-memory store is updated with new dates
// ---------------------------------------------------------------------------

// After a successful API round-trip, the child artifact inside the store
// must reflect the new startDate and endDate values.
describe('updateChildDates — store update on success', () => {
    let child: Game;

    beforeEach(() => {
        ({ child } = buildStoreWithChild());
        vi.spyOn(child, 'updateUserStartDate');
        vi.spyOn(child, 'updateUserEndDate');
        vi.stubGlobal('fetch', makeFetchOk());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('calls updateUserStartDate on the child artifact with the provided start date', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        expect(child.updateUserStartDate).toHaveBeenCalledWith(START_DATE);
    });

    it('calls updateUserEndDate on the child artifact with the provided end date', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        expect(child.updateUserEndDate).toHaveBeenCalledWith(END_DATE);
    });

    it('calls updateUserStartDate with null when startDate is null', async () => {
        await updateChildDates(CHILD_ID, null, END_DATE);
        expect(child.updateUserStartDate).toHaveBeenCalledWith(null);
    });

    it('calls updateUserEndDate with null when endDate is null', async () => {
        await updateChildDates(CHILD_ID, START_DATE, null);
        expect(child.updateUserEndDate).toHaveBeenCalledWith(null);
    });

    it('resolves without throwing when both API calls succeed', async () => {
        await expect(updateChildDates(CHILD_ID, START_DATE, END_DATE)).resolves.not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Contract: throws and does NOT update the store when an API call fails
// ---------------------------------------------------------------------------

// If either fetch response is not ok, the function must throw an error
// and leave the store dates unchanged.
describe('updateChildDates — error handling on non-OK response', () => {
    let child: Game;

    beforeEach(() => {
        ({ child } = buildStoreWithChild());
        vi.spyOn(child, 'updateUserStartDate');
        vi.spyOn(child, 'updateUserEndDate');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('throws when the API returns a non-OK response', async () => {
        vi.stubGlobal('fetch', makeFetchFail());
        await expect(updateChildDates(CHILD_ID, START_DATE, END_DATE)).rejects.toThrow();
    });

    it('does NOT call updateUserStartDate when the API fails', async () => {
        vi.stubGlobal('fetch', makeFetchFail());
        try {
            await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        } catch {
            // expected to throw
        }
        expect(child.updateUserStartDate).not.toHaveBeenCalled();
    });

    it('does NOT call updateUserEndDate when the API fails', async () => {
        vi.stubGlobal('fetch', makeFetchFail());
        try {
            await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        } catch {
            // expected to throw
        }
        expect(child.updateUserEndDate).not.toHaveBeenCalled();
    });

    it('throws when only the first API call fails', async () => {
        // First call fails, second would succeed
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
            .mockResolvedValueOnce({ ok: true } as Response);
        vi.stubGlobal('fetch', fetchSpy);
        await expect(updateChildDates(CHILD_ID, START_DATE, END_DATE)).rejects.toThrow();
    });

    it('throws when only the second API call fails', async () => {
        // First call succeeds, second fails
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce({ ok: true } as Response)
            .mockResolvedValueOnce({ ok: false, status: 500 } as Response);
        vi.stubGlobal('fetch', fetchSpy);
        await expect(updateChildDates(CHILD_ID, START_DATE, END_DATE)).rejects.toThrow();
    });

    it('does NOT update the store when only the second API call fails', async () => {
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce({ ok: true } as Response)
            .mockResolvedValueOnce({ ok: false, status: 500 } as Response);
        vi.stubGlobal('fetch', fetchSpy);
        try {
            await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        } catch {
            // expected to throw
        }
        // The store should NOT have been updated at all
        expect(child.updateUserStartDate).not.toHaveBeenCalled();
        expect(child.updateUserEndDate).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Contract: boundary — null dates for both start and end
// ---------------------------------------------------------------------------

// The function must handle fully null date pairs without throwing.
describe('updateChildDates — null date boundary', () => {
    beforeEach(() => {
        buildStoreWithChild();
        vi.stubGlobal('fetch', makeFetchOk());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resolves successfully when both startDate and endDate are null', async () => {
        await expect(updateChildDates(CHILD_ID, null, null)).resolves.not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Standards: childId not found in the store → throws without calling fetch
// ---------------------------------------------------------------------------

// The store's guard clause — `if (!child) throw new Error('Artifact Not Found')` — is
// never reached by the TDD tests, which always build a store that contains CHILD_ID.
describe('updateChildDates — childId not found', () => {
    beforeEach(() => {
        // Store with parent only, no children containing an unexpected id
        const parent = new Game(1, 'Root', ArtifactType.GAME, new Date(), 60);
        parent.genres = [];
        parent.ratings = [];
        parent.tags = [];
        parent.links = [];
        parent.platforms = [];
        initializeStore(parent);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('throws when the childId is not in the store', async () => {
        vi.stubGlobal('fetch', vi.fn());
        await expect(updateChildDates(999, START_DATE, END_DATE)).rejects.toThrow('Artifact Not Found');
    });

    it('does not make any fetch calls when the childId is missing', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
        try {
            await updateChildDates(999, START_DATE, END_DATE);
        } catch {
            // expected
        }
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Standards: exact JSON payload serialisation
// ---------------------------------------------------------------------------

// The TDD tests only check that startEnd is present; they do not verify the
// exact value of the `date` field in the body.  The implementation serialises a
// Date as `d.toISOString()` and null as the JSON literal `null`.
describe('updateChildDates — exact request body content', () => {
    let fetchSpy: ReturnType<typeof vi.fn>;

    function parsedBodies() {
        return fetchSpy.mock.calls.map(
            (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string)
        );
    }

    beforeEach(() => {
        buildStoreWithChild();
        fetchSpy = makeFetchOk();
        vi.stubGlobal('fetch', fetchSpy);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('serialises a valid startDate as its ISO string', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        const startBody = parsedBodies().find((b: Record<string, unknown>) => b.startEnd === 'start');
        expect(startBody.date).toBe(START_DATE.toISOString());
    });

    it('serialises a valid endDate as its ISO string', async () => {
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        const endBody = parsedBodies().find((b: Record<string, unknown>) => b.startEnd === 'end');
        expect(endBody.date).toBe(END_DATE.toISOString());
    });

    it('serialises a null startDate as JSON null (not the string "null")', async () => {
        await updateChildDates(CHILD_ID, null, END_DATE);
        const startBody = parsedBodies().find((b: Record<string, unknown>) => b.startEnd === 'start');
        expect(startBody.date).toBeNull();
    });

    it('serialises a null endDate as JSON null (not the string "null")', async () => {
        await updateChildDates(CHILD_ID, START_DATE, null);
        const endBody = parsedBodies().find((b: Record<string, unknown>) => b.startEnd === 'end');
        expect(endBody.date).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Standards: call order — start is always sent before end
// ---------------------------------------------------------------------------

// The implementation awaits the start call before issuing the end call.
// The TDD tests verify both calls exist but do not assert their sequence.
describe('updateChildDates — call order', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sends the start request before the end request', async () => {
        buildStoreWithChild();
        const order: string[] = [];
        vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
            const body = JSON.parse(init.body as string);
            order.push(body.startEnd);
            return Promise.resolve({ ok: true } as Response);
        }));
        await updateChildDates(CHILD_ID, START_DATE, END_DATE);
        expect(order[0]).toBe('start');
        expect(order[1]).toBe('end');
    });
});
