import { describe, expect, it, vi } from 'vitest';
import { GET } from './+server';

/**
 * Standards tests for the image proxy endpoint (`/api/image`).
 *
 * These exercise the host-allowlist and scheme validation branches that are only
 * visible by reading +server.ts:
 *   - ALLOWED_HOSTS set (images.igdb.com, image.tmdb.org)
 *   - the myanimelist.net exact + *.myanimelist.net suffix rule
 *   - the `protocol !== 'https:'` guard
 *   - missing / unparseable `url` query param
 *   - upstream response.ok handling
 * fetch is mocked so no network request is made.
 */
function makeEvent(target: string | null, fetchImpl?: typeof fetch) {
    const base = 'http://localhost/api/image';
    const url = target === null ? new URL(base) : new URL(`${base}?url=${encodeURIComponent(target)}`);
    return { url, fetch: fetchImpl ?? vi.fn() } as never;
}

async function statusOf(promise: Promise<unknown>): Promise<number> {
    try {
        await promise;
        throw new Error('expected handler to throw an HttpError');
    } catch (e) {
        return (e as { status: number }).status;
    }
}

describe('image proxy GET - validation', () => {
    it('returns 400 when the url query param is missing', async () => {
        expect(await statusOf(GET(makeEvent(null)))).toBe(400);
    });

    it('returns 400 when the url is not parseable', async () => {
        expect(await statusOf(GET(makeEvent('not a url')))).toBe(400);
    });

    it('rejects a non-https scheme even for an allowlisted host', async () => {
        const fetchSpy = vi.fn();
        expect(await statusOf(GET(makeEvent('http://images.igdb.com/a.jpg', fetchSpy)))).toBe(400);
        // The guard must short-circuit before any network call.
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects a host that is not on the allowlist', async () => {
        expect(await statusOf(GET(makeEvent('https://evil.com/a.jpg')))).toBe(400);
    });

    it('rejects a look-alike domain that only ends with "myanimelist.net" without the dot boundary', async () => {
        // "notmyanimelist.net" must NOT match the ".myanimelist.net" suffix rule.
        expect(await statusOf(GET(makeEvent('https://notmyanimelist.net/a.jpg')))).toBe(400);
        expect(await statusOf(GET(makeEvent('https://evilmyanimelist.net/a.jpg')))).toBe(400);
    });

    it('rejects a host that merely prefixes an allowed host before another domain', async () => {
        expect(await statusOf(GET(makeEvent('https://myanimelist.net.evil.com/a.jpg')))).toBe(400);
    });

    it.each([
        'https://images.igdb.com/igdb/image/upload/t_cover/abc.jpg',
        'https://image.tmdb.org/t/p/w500/poster.jpg',
        'https://myanimelist.net/images/anime/1.jpg',
        'https://cdn.myanimelist.net/images/anime/2.jpg'
    ])('passes an allowlisted https host and proxies the body: %s', async (target) => {
        const upstream = {
            ok: true,
            status: 200,
            headers: { get: (h: string) => (h === 'content-type' ? 'image/jpeg' : null) },
            arrayBuffer: async () => new TextEncoder().encode('bytes').buffer
        };
        const fetchSpy = vi.fn().mockResolvedValue(upstream);
        const res = (await GET(makeEvent(target, fetchSpy as never))) as Response;

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        // The proxied request must target the normalised, validated URL.
        expect(fetchSpy.mock.calls[0][0]).toBe(new URL(target).toString());
        expect(res).toBeInstanceOf(Response);
        expect(res.headers.get('content-type')).toBe('image/jpeg');
        expect(res.headers.get('cache-control')).toBe('public, max-age=86400');
    });

    it('defaults the content-type to application/octet-stream when upstream omits it', async () => {
        const upstream = {
            ok: true,
            status: 200,
            headers: { get: () => null },
            arrayBuffer: async () => new ArrayBuffer(0)
        };
        const res = (await GET(makeEvent('https://image.tmdb.org/x.jpg', vi.fn().mockResolvedValue(upstream) as never))) as Response;
        expect(res.headers.get('content-type')).toBe('application/octet-stream');
    });

    it('propagates the upstream status when the fetch is not ok', async () => {
        const upstream = { ok: false, status: 404, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0) };
        expect(await statusOf(GET(makeEvent('https://images.igdb.com/missing.jpg', vi.fn().mockResolvedValue(upstream) as never)))).toBe(404);
    });
});
