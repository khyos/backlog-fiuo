import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/model/User', () => ({
    User: { deserialize: vi.fn().mockReturnValue({ hasRight: () => true }) },
    UserRights: { CREATE_ARTIFACT: 'CREATE_ARTIFACT' }
}));

vi.mock('#lib/mangabaka/MangaBaka', () => ({
    MangaBaka: {
        extractId: vi.fn((input: string) => input === 'bad' ? null : '1692'),
        getManga: vi.fn()
    }
}));

vi.mock('#lib/mal/MAL', () => ({ MAL: { getManga: vi.fn() } }));
vi.mock('#lib/senscritique/SensCritique', () => ({ SensCritique: { getBDRating: vi.fn() } }));
vi.mock('#lib/server/model/LinkDB', () => ({ LinkDB: { exists: vi.fn() } }));
vi.mock('#lib/server/model/ArtifactDB', () => ({ ArtifactDB: { updateDuration: vi.fn() } }));
vi.mock('#lib/server/model/manga/MangaDB', () => ({
    MangaDB: {
        createManga: vi.fn(),
        createMangaVolume: vi.fn(),
        createMangaChapter: vi.fn()
    }
}));

import { POST } from './+server';
import { MangaBaka } from '#lib/mangabaka/MangaBaka';
import { MAL } from '#lib/mal/MAL';
import { LinkDB } from '#lib/server/model/LinkDB';
import { ArtifactDB } from '#lib/server/model/ArtifactDB';
import { MangaDB } from '#lib/server/model/manga/MangaDB';
import { LinkType } from '#lib/model/Link';

const DURATION_PER_CHAPTER = 10 * 60;
const MAL_RELEASE = new Date('2005-06-07');

function makeEvent(body: Record<string, unknown>) {
    return {
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

function malManga(overrides: Record<string, unknown> = {}) {
    return {
        title: 'My Manga',
        synopsis: 'A synopsis',
        score: 8,
        published: { from: '2005-06-07' },
        chapters: 5,
        volumes: 2,
        ...overrides
    };
}

function mangaBaka(overrides: Record<string, unknown> = {}) {
    return {
        id: '1692',
        title: 'BERSERK',
        link: 'https://mangabaka.org/manga/1692/BERSERK',
        type: 'manga',
        finalVolume: 1,
        totalChapters: 3,
        ...overrides
    };
}

function linksPassedToCreateManga() {
    return vi.mocked(MangaDB.createManga).mock.calls[0][5] as Array<{ type: LinkType; url: string }>;
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LinkDB.exists).mockResolvedValue(false);
    vi.mocked(MAL.getManga).mockResolvedValue(malManga() as never);
    vi.mocked(MangaDB.createManga).mockResolvedValue({
        id: 7,
        toJSON: () => ({ id: 7, title: 'My Manga' })
    } as never);
});

describe('POST /api/manga with MangaBaka metadata', () => {
    it('uses MangaBaka counts, stores its ID, and creates flat chapter and volume children', async () => {
        vi.mocked(MangaBaka.getManga).mockResolvedValue(mangaBaka() as never);

        await POST(makeEvent({ malId: '555', mbId: 'https://mangabaka.org/manga/1692/BERSERK' }));

        expect(MangaBaka.getManga).toHaveBeenCalledWith('1692');
        expect(linksPassedToCreateManga()).toContainEqual({ type: LinkType.MANGABAKA, url: '1692' });
        expect(MangaDB.createMangaChapter).toHaveBeenCalledTimes(3);
        expect(MangaDB.createMangaChapter).toHaveBeenCalledWith(7, 1, 'Chapter 1', undefined, DURATION_PER_CHAPTER);
        expect(MangaDB.createMangaChapter).toHaveBeenCalledWith(7, 3, 'Chapter 3', undefined, DURATION_PER_CHAPTER);
        expect(MangaDB.createMangaVolume).toHaveBeenCalledWith(7, 1, 'Volume 1', undefined, 0);
        expect(MangaDB.createManga).toHaveBeenCalledWith(
            'My Manga', 'A synopsis', MAL_RELEASE, 3 * DURATION_PER_CHAPTER, [], expect.anything(), expect.anything()
        );
        expect(ArtifactDB.updateDuration).toHaveBeenCalledWith(7, 3 * DURATION_PER_CHAPTER);
    });

    it('falls back to MAL counts when MangaBaka totals are unknown', async () => {
        vi.mocked(MangaBaka.getManga).mockResolvedValue(mangaBaka({
            totalChapters: null,
            finalVolume: null
        }) as never);

        await POST(makeEvent({ malId: '555', mbId: '1692' }));

        expect(MangaDB.createMangaChapter).toHaveBeenCalledTimes(5);
        expect(MangaDB.createMangaChapter).toHaveBeenCalledWith(7, 1, 'Chapter 1', undefined, DURATION_PER_CHAPTER);
        expect(MangaDB.createMangaVolume).toHaveBeenCalledTimes(2);
        expect(ArtifactDB.updateDuration).toHaveBeenCalledWith(7, 5 * DURATION_PER_CHAPTER);
    });

    it('rejects invalid IDs, missing series, and non-manga series before creating records', async () => {
        expect(await statusOf(POST(makeEvent({ malId: '555', mbId: 'bad' })))).toBe(400);
        expect(MangaBaka.getManga).not.toHaveBeenCalled();

        vi.mocked(MangaBaka.getManga).mockResolvedValue(null);
        expect(await statusOf(POST(makeEvent({ malId: '555', mbId: '1692' })))).toBe(404);

        vi.mocked(MangaBaka.getManga).mockResolvedValue(mangaBaka({ type: 'novel' }) as never);
        expect(await statusOf(POST(makeEvent({ malId: '555', mbId: '1692' })))).toBe(400);
        expect(MangaDB.createManga).not.toHaveBeenCalled();
    });

    it('reports MangaBaka API failures instead of creating with stale MAL counts', async () => {
        vi.mocked(MangaBaka.getManga).mockRejectedValue(new Error('upstream unavailable'));

        expect(await statusOf(POST(makeEvent({ malId: '555', mbId: '1692' })))).toBe(502);
        expect(MangaDB.createManga).not.toHaveBeenCalled();
    });

    it('retains the MAL-only behavior when no MangaBaka ID is provided', async () => {
        await POST(makeEvent({ malId: '555' }));

        expect(MangaBaka.getManga).not.toHaveBeenCalled();
        expect(linksPassedToCreateManga().some(link => link.type === LinkType.MANGABAKA)).toBe(false);
        expect(MangaDB.createMangaChapter).toHaveBeenCalledTimes(5);
        expect(MangaDB.createMangaChapter).toHaveBeenCalledWith(7, 1, 'Chapter 1', MAL_RELEASE, DURATION_PER_CHAPTER);
    });
});
