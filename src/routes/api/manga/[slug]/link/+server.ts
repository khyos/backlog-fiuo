import { MAL } from "#lib/mal/MAL";
import { MangaBaka } from "#lib/mangabaka/MangaBaka";
import { ArtifactType } from "#lib/model/Artifact";
import { LinkType } from "#lib/model/Link";
import { RatingType } from "#lib/model/Rating";
import { User, UserRights } from "#lib/model/User";
import { SensCritique } from "#lib/senscritique/SensCritique";
import { LinkDB } from "#lib/server/model/LinkDB";
import { RatingDB } from "#lib/server/model/RatingDB";
import { MangaDB } from "#lib/server/model/manga/MangaDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const mangaId = parseInt(params.slug);
    const { type, url } = await request.json();

    const finalUrl = await setLinkInfo(mangaId, type, url);
    if (finalUrl) {
        LinkDB.addLink(mangaId, type, finalUrl);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

export async function PATCH({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const mangaId = parseInt(params.slug);
    const { type, url } = await request.json();

    const finalUrl = await setLinkInfo(mangaId, type, url);
    if (finalUrl) {
        LinkDB.updateLink(mangaId, type, finalUrl);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

const setLinkInfo = async (mangaId: number, type: LinkType, url: string): Promise<string> => {
    if (type === LinkType.SENSCRITIQUE) {
        const scRating = await SensCritique.getBDRating(url);
        if (scRating) {
            await RatingDB.addRating(mangaId, RatingType.SENSCRITIQUE, scRating);
        }
    } else if (type === LinkType.MANGABAKA) {
        const id = MangaBaka.extractId(url);
        if (!id) {
            return '';
        }
        return id;
    }
    return url;
};

export async function PUT({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const mangaId = parseInt(params.slug);
    const { types } = await request.json();
    const links = await LinkDB.getLinks(mangaId);

    for (const type of types) {
        const url = links.find(link => link.type === type)?.url;
        if (url) {
            if (type === LinkType.MAL) {
                await updateMAL(mangaId, url, links.some(l => l.type === LinkType.MANGABAKA));
            } else if (type === LinkType.MANGABAKA) {
                try {
                    await updateMangaBaka(mangaId, url);
                } catch {
                    return error(500, "Failed to Update MANGABAKA");
                }
            } else if (type === LinkType.SENSCRITIQUE) {
                try {
                    const scRating = await SensCritique.getBDRating(url);
                    if (scRating) {
                        await RatingDB.updateRating(mangaId, RatingType.SENSCRITIQUE, scRating);
                    }
                } catch {
                    return error(500, "Failed to Update SENSCRITIQUE");
                }
            }
        }
    }
    return json({ success: true });
}

const updateMAL = async (mangaId: number, malId: string, skipChildren = false) => {
    const manga = await MangaDB.getById(mangaId, true);
    if (!manga) {
        return error(500, "Can't update a Manga that doesn't exist");
    }

    const malManga = await MAL.getManga(malId);
    if (!malManga) {
        return error(500, "MAL Manga not found");
    }

    if (malManga.score) {
        await RatingDB.updateRating(mangaId, RatingType.MAL, malManga.score);
    }

    const releaseDate = malManga.published?.from ? new Date(malManga.published.from) : undefined;
    const chapterCount = malManga.chapters ?? 0;
    const volumeCount = malManga.volumes ?? 0;
    const durationPerChapter = 10 * 60;

    if (skipChildren) {
        await MangaDB.updateManga(mangaId, manga.title, releaseDate, manga.duration);
        return;
    }

    const existingChapters = manga.children.filter(c => c.type === ArtifactType.MANGA_CHAPTER);
    const existingVolumes = manga.children.filter(c => c.type === ArtifactType.MANGA_VOLUME);

    if (chapterCount > 0) {
        for (let i = 1; i <= chapterCount; i++) {
            const existing = existingChapters.find(c => c.childIndex === i);
            if (!existing) {
                await MangaDB.createMangaChapter(manga.id, i, `Chapter ${i}`, undefined, durationPerChapter);
            } else {
                await MangaDB.updateMangaChapter(existing.id, i, existing.title, undefined, durationPerChapter);
            }
        }
        for (const chapter of existingChapters) {
            if (chapter.childIndex === null || chapter.childIndex > chapterCount) {
                await MangaDB.deleteMangaChapter(chapter.id);
            }
        }
    }

    if (volumeCount > 0) {
        for (let i = 1; i <= volumeCount; i++) {
            const existing = existingVolumes.find(v => v.childIndex === i);
            if (!existing) {
                await MangaDB.createMangaVolume(manga.id, i, `Volume ${i}`, undefined, 0);
            } else {
                await MangaDB.updateMangaVolume(existing.id, i, existing.title, undefined, 0);
            }
        }
        for (const volume of existingVolumes) {
            if (volume.childIndex === null || volume.childIndex > volumeCount) {
                await MangaDB.deleteMangaVolume(volume.id);
            }
        }
    }

    const duration = chapterCount * durationPerChapter;
    await MangaDB.updateManga(mangaId, manga.title, releaseDate, duration);
};

async function updateMangaBaka(mangaId: number, id: string): Promise<void> {
    const manga = await MangaDB.getById(mangaId, true);
    if (!manga) {
        throw new Error("Can't update a Manga that doesn't exist");
    }

    const mangaBakaManga = await MangaBaka.getManga(id);
    if (!mangaBakaManga || mangaBakaManga.type !== 'manga') {
        throw new Error("MangaBaka manga not found");
    }

    const durationPerChapter = 10 * 60;

    const existingChapters = manga.children.filter(c => c.type === ArtifactType.MANGA_CHAPTER);
    const existingVolumes = manga.children.filter(v => v.type === ArtifactType.MANGA_VOLUME);

    const chapterCount = mangaBakaManga.totalChapters;
    if (chapterCount !== null) {
        for (let i = 1; i <= chapterCount; i++) {
            const existing = existingChapters.find(c => c.childIndex === i);
            if (!existing) {
                await MangaDB.createMangaChapter(manga.id, i, `Chapter ${i}`, undefined, durationPerChapter);
            } else {
                await MangaDB.updateMangaChapter(existing.id, i, `Chapter ${i}`, undefined, durationPerChapter);
            }
        }
        for (const chapter of existingChapters) {
            if (chapter.childIndex === null || chapter.childIndex > chapterCount) {
                await MangaDB.deleteMangaChapter(chapter.id);
            }
        }
    }

    const volumeCount = mangaBakaManga.finalVolume;
    if (volumeCount !== null) {
        for (let i = 1; i <= volumeCount; i++) {
            const existing = existingVolumes.find(v => v.childIndex === i);
            if (!existing) {
                await MangaDB.createMangaVolume(manga.id, i, `Volume ${i}`, undefined, 0);
            } else {
                await MangaDB.updateMangaVolume(existing.id, i, `Volume ${i}`, undefined, 0);
            }
        }
        for (const volume of existingVolumes) {
            if (volume.childIndex === null || volume.childIndex > volumeCount) {
                await MangaDB.deleteMangaVolume(volume.id);
            }
        }
    }

    const duration = chapterCount === null ? manga.duration : chapterCount * durationPerChapter;
    await MangaDB.updateManga(mangaId, manga.title, manga.releaseDate, duration);
}
