import { MAL } from "$lib/mal/MAL";
import { LinkType } from "$lib/model/Link";
import { RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { MangaDB } from "$lib/server/model/manga/MangaDB";
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
                await updateMAL(mangaId, url);
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

const updateMAL = async (mangaId: number, malId: string) => {
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

    const releaseDate = malManga.published?.from ? new Date(malManga.published.from) : new Date();
    const chapterCount = malManga.chapters ?? 0;
    const durationPerChapter = 10 * 60;

    if (chapterCount > 0) {
        for (let i = 1; i <= chapterCount; i++) {
            const existingChapter = manga.children.find(child => child.childIndex === i);
            if (!existingChapter) {
                await MangaDB.createMangaChapter(manga.id, i, `Chapter ${i}`, releaseDate, durationPerChapter);
            } else {
                await MangaDB.updateMangaChapter(existingChapter.id, i, existingChapter.title, releaseDate, durationPerChapter);
            }
        }
    }

    const duration = chapterCount * durationPerChapter;
    await MangaDB.updateManga(mangaId, manga.title, releaseDate, duration);
};
