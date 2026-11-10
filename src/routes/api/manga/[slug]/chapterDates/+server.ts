import { User } from "$lib/model/User";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { MangaDB } from "$lib/server/model/manga/MangaDB";
import { UserArtifactStatus } from "$lib/model/UserArtifact";
import { error, json } from "@sveltejs/kit";
import { getDbRows } from "$lib/server/database";
import type { RequestEvent } from "./$types";

interface ChapterRow {
    id: number;
    child_index: number | null;
}

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Please sign in");
    }

    const mangaId = parseInt(params.slug);
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
        return error(400, "startDate and endDate are required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return error(400, "Invalid date format");
    }

    if (start > end) {
        return error(400, "startDate must be before or equal to endDate");
    }

    const manga = await MangaDB.getById(mangaId, false);
    if (!manga) {
        return error(404, "Manga not found");
    }

    const chapterRows = await getDbRows<ChapterRow>(
        `SELECT ch.id, ch.child_index
         FROM artifact ch
         JOIN user_artifact ua ON ua.artifactId = ch.id AND ua.userId = ?
         WHERE ch.parent_artifact_id = ?
           AND ch.type = 'manga_chapter'
           AND ua.status = ?
           AND ua.endDate IS NULL
         ORDER BY ch.child_index ASC`,
        [user.id, mangaId, UserArtifactStatus.FINISHED]
    );

    if (chapterRows.length === 0) {
        return json({ success: true });
    }

    const count = chapterRows.length;
    const startTime = start.getTime();
    const endTime = end.getTime();

    for (let i = 0; i < count; i++) {
        const chapter = chapterRows[i];
        let chapterDate: Date;

        if (count === 1) {
            chapterDate = end;
        } else {
            const ratio = i / (count - 1);
            chapterDate = new Date(startTime + ratio * (endTime - startTime));
        }

        await ArtifactDB.setUserDate(user.id, chapter.id, chapterDate.getTime(), 'end');
    }

    return json({ success: true });
}
