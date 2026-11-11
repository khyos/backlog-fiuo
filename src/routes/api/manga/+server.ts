import { MAL } from "#lib/mal/MAL";
import { MangaBaka, type MangaBakaManga } from "#lib/mangabaka/MangaBaka";
import { Link, LinkType } from "#lib/model/Link";
import { Rating, RatingType } from "#lib/model/Rating";
import { User, UserRights } from "#lib/model/User";
import { SensCritique } from "#lib/senscritique/SensCritique";
import { LinkDB } from "#lib/server/model/LinkDB";
import { MangaDB } from "#lib/server/model/manga/MangaDB";
import { ArtifactDB } from "#lib/server/model/ArtifactDB";
import { ArtifactType } from "#lib/model/Artifact";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const { malId, scId, mbId } = await request.json();
    if (!malId) {
        return error(400, 'No MyAnimeList ID provided');
    }

    const alreadyExists = await LinkDB.exists(LinkType.MAL, malId, ArtifactType.MANGA);
    if (alreadyExists) {
        return error(409, 'Manga already exists in list');
    }

    const malManga = await MAL.getManga(malId);
    if (!malManga) {
        return error(500, 'Could not fetch manga from MyAnimeList');
    }

    const links: Link[] = [];
    const ratings: Rating[] = [];

    links.push(new Link(LinkType.MAL, malId));

    if (malManga.score) {
        ratings.push(new Rating(RatingType.MAL, malManga.score));
    }

    if (scId) {
        links.push(new Link(LinkType.SENSCRITIQUE, scId));
        const scRating = await SensCritique.getBDRating(scId);
        if (scRating) {
            ratings.push(new Rating(RatingType.SENSCRITIQUE, scRating));
        }
    }

    let mangaBakaManga: MangaBakaManga | null = null;
    if (mbId) {
        const mangaBakaId = MangaBaka.extractId(mbId);
        if (!mangaBakaId) {
            return error(400, 'Not a valid MangaBaka link');
        }
        try {
            mangaBakaManga = await MangaBaka.getManga(mangaBakaId);
        } catch {
            return error(502, 'Could not fetch manga from MangaBaka');
        }
        if (!mangaBakaManga) {
            return error(404, 'MangaBaka manga not found');
        }
        if (mangaBakaManga.type !== 'manga') {
            return error(400, 'MangaBaka series is not a manga');
        }
        links.push(new Link(LinkType.MANGABAKA, mangaBakaId));
    }

    const releaseDate = malManga.published?.from ? new Date(malManga.published.from) : undefined;

    const genreIds: number[] = [];
    if (malManga.genres) {
        for (const genre of malManga.genres) {
            genreIds.push(genre.malId);
        }
    }

    // Duration estimate: chapters × 10 min × 60 s
    const durationPerChapter = 10 * 60;
    const chapterCount = mangaBakaManga?.totalChapters ?? malManga.chapters ?? 0;
    const volumeCount = mangaBakaManga?.finalVolume ?? malManga.volumes ?? 0;
    const duration = chapterCount * durationPerChapter;

    const manga = await MangaDB.createManga(
        malManga.title,
        malManga.synopsis || '',
        releaseDate,
        duration,
        genreIds,
        links,
        ratings
    );

    // Volumes and chapters are independent flat children of the manga — no nesting.
    for (let i = 1; i <= volumeCount; i++) {
        await MangaDB.createMangaVolume(manga.id, i, `Volume ${i}`, mangaBakaManga ? undefined : releaseDate, 0);
    }

    for (let i = 1; i <= chapterCount; i++) {
        await MangaDB.createMangaChapter(manga.id, i, `Chapter ${i}`, mangaBakaManga ? undefined : releaseDate, durationPerChapter);
    }

    await ArtifactDB.updateDuration(manga.id, duration);

    return json(manga.toJSON());
}
