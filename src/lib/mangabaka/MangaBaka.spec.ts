import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MangaBaka } from './MangaBaka';

const fetchMock = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

function response(data: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: vi.fn().mockResolvedValue(data)
    };
}

describe('MangaBaka.searchManga', () => {
    it('searches only manga and normalizes result IDs, dates, links, and cover art', async () => {
        fetchMock.mockResolvedValue(response({
            data: [{
                id: 1692,
                title: 'BERSERK',
                canonical_url: 'https://mangabaka.org/manga/1692/BERSERK',
                type: 'manga',
                published: { start_date: '1989-08-25' },
                cover: { x150: { x1: 'https://cdn.mangabaka.dev/cover.jpg' } }
            }]
        }));

        await expect(MangaBaka.searchManga('berserk')).resolves.toEqual([{
            id: '1692',
            name: 'BERSERK',
            link: 'https://mangabaka.org/manga/1692/BERSERK',
            date: '1989-08-25',
            poster: 'https://cdn.mangabaka.dev/cover.jpg'
        }]);

        const requestUrl = new URL(fetchMock.mock.calls[0][0]);
        expect(requestUrl.origin + requestUrl.pathname).toBe('https://api.mangabaka.org/v1/series/search');
        expect(requestUrl.searchParams.get('q')).toBe('berserk');
        expect(requestUrl.searchParams.get('type')).toBe('manga');
        expect(requestUrl.searchParams.get('limit')).toBe('10');
    });

    it('rejects API failures and invalid response shapes', async () => {
        fetchMock.mockResolvedValue(response({}, 503));
        await expect(MangaBaka.searchManga('x')).rejects.toThrow('MangaBaka manga search failed: 503');

        fetchMock.mockResolvedValue(response({ data: {} }));
        await expect(MangaBaka.searchManga('x')).rejects.toThrow('Invalid MangaBaka manga search response');
    });
});

describe('MangaBaka.getManga', () => {
    it('loads series details and reads nullable chapter and volume counts', async () => {
        fetchMock.mockResolvedValue(response({
            data: {
                id: 1692,
                title: 'BERSERK',
                canonical_url: 'https://mangabaka.org/manga/1692/BERSERK',
                type: 'manga',
                published: { start_date: '1989-08-25' },
                total_chapters: '401',
                final_volume: '43',
                cover: { x150: { x1: 'https://cdn.mangabaka.dev/cover.jpg' } }
            }
        }));

        await expect(MangaBaka.getManga('1692')).resolves.toEqual({
            id: '1692',
            title: 'BERSERK',
            link: 'https://mangabaka.org/manga/1692/BERSERK',
            date: '1989-08-25',
            poster: 'https://cdn.mangabaka.dev/cover.jpg',
            type: 'manga',
            totalChapters: 401,
            finalVolume: 43
        });
        expect(fetchMock).toHaveBeenCalledWith('https://api.mangabaka.org/v1/series/1692');
    });

    it('returns null for not found and preserves missing totals as null', async () => {
        fetchMock.mockResolvedValue(response({}, 404));
        await expect(MangaBaka.getManga('123')).resolves.toBeNull();

        fetchMock.mockResolvedValue(response({
            data: {
                id: 123,
                title: 'Unknown counts',
                canonical_url: 'https://mangabaka.org/manga/123',
                type: 'manga',
                total_chapters: null,
                final_volume: null
            }
        }));
        await expect(MangaBaka.getManga('123')).resolves.toMatchObject({
            totalChapters: null,
            finalVolume: null
        });
    });

    it('throws on API errors and malformed series data', async () => {
        fetchMock.mockResolvedValue(response({}, 500));
        await expect(MangaBaka.getManga('123')).rejects.toThrow('MangaBaka manga lookup failed: 500');

        fetchMock.mockResolvedValue(response({ data: { id: 123 } }));
        await expect(MangaBaka.getManga('123')).rejects.toThrow('Invalid MangaBaka manga response');
    });
});

describe('MangaBaka ID and URL helpers', () => {
    it('accepts a positive numeric ID and MangaBaka series URLs only', () => {
        expect(MangaBaka.extractId('1692')).toBe('1692');
        expect(MangaBaka.extractId('https://mangabaka.org/manga/1692/BERSERK')).toBe('1692');
        expect(MangaBaka.extractId('https://mangabaka.org/1692')).toBe('1692');
        expect(MangaBaka.extractId('https://example.com/manga/1692')).toBeNull();
        expect(MangaBaka.extractId('0')).toBeNull();
        expect(MangaBaka.extractId('not-an-id')).toBeNull();
    });

    it('builds the canonical series URL from a stored ID', () => {
        expect(MangaBaka.getUrlFromId('1692')).toBe('https://mangabaka.org/manga/1692');
    });
});
