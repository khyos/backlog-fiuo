import { User } from "$lib/model/User";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import { UserArtifactStatus } from "$lib/model/UserArtifact";
import { error, json } from "@sveltejs/kit";
import { getDbRows } from "$lib/server/database";
import type { RequestEvent } from "./$types";

interface EpisodeRow {
    id: number;
    child_index: number | null;
}

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        error(401, "Please sign in");
    }

    const animeId = parseInt(params.slug);
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
        error(400, "startDate and endDate are required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        error(400, "Invalid date format");
    }

    if (start > end) {
        error(400, "startDate must be before or equal to endDate");
    }

    // Verify the anime exists
    const anime = await AnimeDB.getById(animeId, false);
    if (!anime) {
        error(404, "Anime not found");
    }

    // Get all finished episodes of this anime that have no end date for this user
    const episodeRows = await getDbRows<EpisodeRow>(
        `SELECT ep.id, ep.child_index
         FROM artifact ep
         JOIN user_artifact ua ON ua.artifactId = ep.id AND ua.userId = ?
         WHERE ep.parent_artifact_id = ?
           AND ep.type = 'anime_episode'
           AND ua.status = ?
           AND ua.endDate IS NULL
         ORDER BY ep.child_index ASC`,
        [user.id, animeId, UserArtifactStatus.FINISHED]
    );

    if (episodeRows.length === 0) {
        return json({ updated: 0 });
    }

    const count = episodeRows.length;
    const startTime = start.getTime();
    const endTime = end.getTime();

    // Distribute dates evenly: episode i gets date at position i/(count-1) between start and end
    // If only one episode, it gets endDate
    for (let i = 0; i < count; i++) {
        const episode = episodeRows[i];
        let episodeDate: Date;

        if (count === 1) {
            episodeDate = end;
        } else {
            const ratio = i / (count - 1);
            episodeDate = new Date(startTime + ratio * (endTime - startTime));
        }

        const dateStr = episodeDate.toISOString().split('T')[0];
        await ArtifactDB.setUserDate(user.id, episode.id, dateStr, 'end');
    }

    return json({ updated: count });
}
