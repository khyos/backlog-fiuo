import { MAL } from "$lib/mal/MAL";
import { Link, LinkType } from "$lib/model/Link";
import { Rating, RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { MangaDB } from "$lib/server/model/manga/MangaDB";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { ArtifactType } from "$lib/model/Artifact";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const { malId, scId } = await request.json();
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

    const releaseDate = malManga.published?.from ? new Date(malManga.published.from) : new Date();

    const genreIds: number[] = [];
    if (malManga.genres) {
        for (const genre of malManga.genres) {
            genreIds.push(genre.mal_id);
        }
    }

    // Duration estimate: chapters × 10 min × 60 s
    // For ongoing manga (still publishing), Jikan has no chapter-list endpoint —
    // volumes/chapters reflect MAL's last known counts, or undefined if MAL doesn't track them yet.
    const isPublishing = malManga.status === 'Publishing';
    const chapterCount = malManga.chapters ?? 0;
    const volumeCount = malManga.volumes ?? 0;
    const durationPerChapter = 10 * 60;
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

    if (volumeCount > 0) {
        // Create one volume stub per known published volume.
        for (let i = 1; i <= volumeCount; i++) {
            await MangaDB.createMangaVolume(manga.id, i, `Volume ${i}`, releaseDate, 0);
        }
    }

    if (chapterCount > 0) {
        // Chapters beyond the collected volumes are standalone (published but not yet bound).
        // For ongoing manga the volume count may lag behind, so we use a ~10 ch/volume heuristic.
        const chaptersInVolumes = volumeCount > 0 ? volumeCount * 10 : 0;
        const standaloneCount = Math.max(0, chapterCount - chaptersInVolumes);

        if (standaloneCount > 0) {
            for (let i = chapterCount - standaloneCount + 1; i <= chapterCount; i++) {
                await MangaDB.createMangaChapter(manga.id, i, `Chapter ${i}`, releaseDate, durationPerChapter);
            }
        } else if (volumeCount === 0) {
            // No volumes at all — all chapters are standalone.
            for (let i = 1; i <= chapterCount; i++) {
                await MangaDB.createMangaChapter(manga.id, i, `Chapter ${i}`, releaseDate, durationPerChapter);
            }
        }
    } else if (isPublishing && volumeCount === 0) {
        // Counts are unknown (null from MAL) and the manga is still publishing.
        // Jikan v4 has no chapter-list endpoint for manga, so we can't enumerate chapters.
        // The manga is created without stubs; volumes/chapters can be added manually.
    }

    await ArtifactDB.updateDuration(manga.id, duration);

    return json(manga.toJSON());
}
