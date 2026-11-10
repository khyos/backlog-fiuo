import { User } from "$lib/model/User";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { MangaDB } from "$lib/server/model/manga/MangaDB";
import { UserArtifactStatus } from "$lib/model/UserArtifact";
import { error, json } from "@sveltejs/kit";
import { getDbRows } from "$lib/server/database";
import type { RequestEvent } from "./$types";

interface VolumeRow {
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

    const volumeRows = await getDbRows<VolumeRow>(
        `SELECT v.id, v.child_index
         FROM artifact v
         JOIN user_artifact ua ON ua.artifactId = v.id AND ua.userId = ?
         WHERE v.parent_artifact_id = ?
           AND v.type = 'manga_volume'
           AND ua.status = ?
           AND ua.endDate IS NULL
         ORDER BY v.child_index ASC`,
        [user.id, mangaId, UserArtifactStatus.FINISHED]
    );

    if (volumeRows.length === 0) {
        return json({ success: true });
    }

    const count = volumeRows.length;
    const startTime = start.getTime();
    const endTime = end.getTime();

    for (let i = 0; i < count; i++) {
        const volume = volumeRows[i];
        let volumeDate: Date;

        if (count === 1) {
            volumeDate = end;
        } else {
            const ratio = i / (count - 1);
            volumeDate = new Date(startTime + ratio * (endTime - startTime));
        }

        await ArtifactDB.setUserDate(user.id, volume.id, volumeDate.getTime(), 'end');
    }

    return json({ success: true });
}
