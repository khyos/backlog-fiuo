import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/model/User', () => ({
    User: { deserialize: vi.fn().mockReturnValue({ hasRight: () => true }) },
    UserRights: { EDIT_ARTIFACT: 'EDIT_ARTIFACT' }
}));

vi.mock('#lib/mangabaka/MangaBaka', () => ({
    MangaBaka: {
        extractId: vi.fn((input: string) => input === 'bad' ? null : '1692'),
        getManga: vi.fn()
    }
}));

vi.mock('#lib/mal/MAL', () => ({ MAL: { getManga: vi.fn() } }));
vi.mock('#lib/senscritique/SensCritique', () => ({ SensCritique: { getBDRating: vi.fn() } }));
vi.mock('#lib/server/model/LinkDB', () => ({
    LinkDB: { addLink: vi.fn(), updateLink: vi.fn(), getLinks: vi.fn() }
}));
vi.mock('#lib/server/model/RatingDB', () => ({
    RatingDB: { addRating: vi.fn(), updateRating: vi.fn() }
}));
vi.mock('#lib/server/model/manga/MangaDB', () => ({
    MangaDB: {
        getById: vi.fn(),
        createMangaChapter: vi.fn(),
        updateMangaChapter: vi.fn(),
        deleteMangaChapter: vi.fn(),
        createMangaVolume: vi.fn(),
        updateMangaVolume: vi.fn(),
        deleteMangaVolume: vi.fn(),
        updateManga: vi.fn()
    }
}));

import { POST, PUT } from './+server';
import { MangaBaka } from '#lib/mangabaka/MangaBaka';
import { LinkDB } from '#lib/server/model/LinkDB';
import { MangaDB } from '#lib/server/model/manga/MangaDB';
import { MAL } from '#lib/mal/MAL';
import { LinkType } from '#lib/model/Link';
import { ArtifactType } from '#lib/model/Artifact';
import { RatingDB } from '#lib/server/model/RatingDB';
import { RatingType } from '#lib/model/Rating';

const DURATION_PER_CHAPTER = 10 * 60;

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

function chapter(id: number, childIndex: number) {
    return { id, title: `Chapter ${childIndex}`, type: ArtifactType.MANGA_CHAPTER, childIndex };
}

function volume(id: number, childIndex: number) {
    return { id, title: `Volume ${childIndex}`, type: ArtifactType.MANGA_VOLUME, childIndex };
}

function mangaWith(children: unknown[], duration = 1800) {
    return {
        id: 42,
        title: 'My Manga',
        releaseDate: new Date('2001-02-03'),
        duration,
        children
    };
}

function mangaBaka(overrides: Record<string, unknown> = {}) {
    return {
        id: '1692',
        title: 'BERSERK',
        type: 'manga',
        totalChapters: 2,
        finalVolume: 1,
        ...overrides
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('MangaBaka link management', () => {
    it('stores the numeric series ID from a MangaBaka URL', async () => {
        vi.mocked(MangaBaka.extractId).mockReturnValue('1692');

        const response = await POST(makeEvent('42', {
            type: LinkType.MANGABAKA,
            url: 'https://mangabaka.org/manga/1692/BERSERK'
        }));

        expect(MangaBaka.extractId).toHaveBeenCalledWith('https://mangabaka.org/manga/1692/BERSERK');
        expect(LinkDB.addLink).toHaveBeenCalledWith(42, LinkType.MANGABAKA, '1692');
        expect(await (response as Response).json()).toEqual({ success: true });
    });

    it('rejects invalid URLs without storing the link', async () => {
        vi.mocked(MangaBaka.extractId).mockReturnValue(null);

        expect(await statusOf(POST(makeEvent('42', {
            type: LinkType.MANGABAKA,
            url: 'not-a-series'
        })))).toBe(404);
        expect(LinkDB.addLink).not.toHaveBeenCalled();
    });
});

describe('PUT MangaBaka refresh', () => {
    function wireLink() {
        vi.mocked(LinkDB.getLinks).mockResolvedValue([
            { type: LinkType.MANGABAKA, url: '1692' }
        ] as never);
    }

    it('reconciles flat children to the MangaBaka counts and updates duration', async () => {
        wireLink();
        vi.mocked(MangaDB.getById).mockResolvedValue(mangaWith([
            chapter(101, 1),
            chapter(105, 5),
            volume(201, 1),
            volume(209, 9)
        ]) as never);
        vi.mocked(MangaBaka.getManga).mockResolvedValue(mangaBaka() as never);

        const response = await PUT(makeEvent('42', { types: [LinkType.MANGABAKA] }));

        expect(MangaBaka.getManga).toHaveBeenCalledWith('1692');
        expect(MangaDB.updateMangaChapter).toHaveBeenCalledWith(101, 1, 'Chapter 1', undefined, DURATION_PER_CHAPTER);
        expect(MangaDB.createMangaChapter).toHaveBeenCalledWith(42, 2, 'Chapter 2', undefined, DURATION_PER_CHAPTER);
        expect(MangaDB.deleteMangaChapter).toHaveBeenCalledWith(105);
        expect(MangaDB.updateMangaVolume).toHaveBeenCalledWith(201, 1, 'Volume 1', undefined, 0);
        expect(MangaDB.deleteMangaVolume).toHaveBeenCalledWith(209);
        expect(MangaDB.updateManga).toHaveBeenCalledWith(
            42, 'My Manga', new Date('2001-02-03'), 2 * DURATION_PER_CHAPTER
        );
        expect(await (response as Response).json()).toEqual({ success: true });
    });

    it('deletes all stale chapters when MangaBaka explicitly reports zero', async () => {
        wireLink();
        vi.mocked(MangaDB.getById).mockResolvedValue(mangaWith([chapter(101, 1)]) as never);
        vi.mocked(MangaBaka.getManga).mockResolvedValue(mangaBaka({ totalChapters: 0 }) as never);

        await PUT(makeEvent('42', { types: [LinkType.MANGABAKA] }));

        expect(MangaDB.deleteMangaChapter).toHaveBeenCalledWith(101);
        expect(MangaDB.updateManga).toHaveBeenCalledWith(
            42, 'My Manga', new Date('2001-02-03'), 0
        );
    });

    it('preserves children and duration for totals MangaBaka does not provide', async () => {
        wireLink();
        vi.mocked(MangaDB.getById).mockResolvedValue(mangaWith([chapter(101, 1)], 900) as never);
        vi.mocked(MangaBaka.getManga).mockResolvedValue(mangaBaka({
            totalChapters: null,
            finalVolume: null
        }) as never);

        await PUT(makeEvent('42', { types: [LinkType.MANGABAKA] }));

        expect(MangaDB.createMangaChapter).not.toHaveBeenCalled();
        expect(MangaDB.deleteMangaChapter).not.toHaveBeenCalled();
        expect(MangaDB.createMangaVolume).not.toHaveBeenCalled();
        expect(MangaDB.deleteMangaVolume).not.toHaveBeenCalled();
        expect(MangaDB.updateManga).toHaveBeenCalledWith(
            42, 'My Manga', new Date('2001-02-03'), 900
        );
    });

    it('does not mutate children when the MangaBaka lookup fails', async () => {
        wireLink();
        vi.mocked(MangaDB.getById).mockResolvedValue(mangaWith([chapter(101, 1)]) as never);
        vi.mocked(MangaBaka.getManga).mockRejectedValue(new Error('upstream unavailable'));

        expect(await statusOf(PUT(makeEvent('42', { types: [LinkType.MANGABAKA] })))).toBe(500);
        expect(MangaDB.createMangaChapter).not.toHaveBeenCalled();
        expect(MangaDB.updateMangaChapter).not.toHaveBeenCalled();
        expect(MangaDB.deleteMangaChapter).not.toHaveBeenCalled();
        expect(MangaDB.createMangaVolume).not.toHaveBeenCalled();
        expect(MangaDB.updateMangaVolume).not.toHaveBeenCalled();
        expect(MangaDB.deleteMangaVolume).not.toHaveBeenCalled();
        expect(MangaDB.updateManga).not.toHaveBeenCalled();
    });
});

describe('PUT MAL refresh with MangaBaka as the child-count source', () => {
    it('updates MAL ratings but does not overwrite MangaBaka children or duration', async () => {
        vi.mocked(LinkDB.getLinks).mockResolvedValue([
            { type: LinkType.MAL, url: '555' },
            { type: LinkType.MANGABAKA, url: '1692' }
        ] as never);
        vi.mocked(MangaDB.getById).mockResolvedValue(mangaWith([
            chapter(101, 1),
            chapter(102, 2)
        ], 1234) as never);
        vi.mocked(MAL.getManga).mockResolvedValue({
            score: 8,
            published: { from: '2005-06-07' },
            chapters: 100,
            volumes: 10
        } as never);

        await PUT(makeEvent('42', { types: [LinkType.MAL] }));

        expect(RatingDB.updateRating).toHaveBeenCalledWith(42, RatingType.MAL, 8);
        expect(MangaDB.updateManga).toHaveBeenCalledWith(
            42, 'My Manga', new Date('2005-06-07'), 1234
        );
        expect(MangaDB.createMangaChapter).not.toHaveBeenCalled();
        expect(MangaDB.deleteMangaChapter).not.toHaveBeenCalled();
    });
});
