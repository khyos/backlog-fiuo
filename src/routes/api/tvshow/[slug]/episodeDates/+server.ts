import { User } from "#lib/model/User";
import { ArtifactDB } from "#lib/server/model/ArtifactDB";
import { TvshowDB } from "#lib/server/model/tvshow/TvshowDB";
import { ArtifactType } from "#lib/model/Artifact";
import { UserArtifactStatus } from "#lib/model/UserArtifact";
import { error, json } from "@sveltejs/kit";
import { getDbRows } from "#lib/server/database";
import type { RequestEvent } from "./$types";

interface EpisodeRow {
    episodeId: number;
    episodeIndex: number | null;
    seasonId: number;
    seasonIndex: number | null;
}

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Please sign in");
    }

    const tvshowId = parseInt(params.slug);
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

    // Verify the TV show exists
    const tvshow = await TvshowDB.getById(tvshowId, false);
    if (!tvshow) {
        return error(404, "TV show not found");
    }

    // Get all finished episodes of this TV show that have no end date for this user,
    // ordered by season then episode, excluding specials (season index must be > 0)
    const rows = await getDbRows<EpisodeRow>(
        `SELECT ep.id          AS episodeId,
                ep.child_index AS episodeIndex,
                s.id           AS seasonId,
                s.child_index  AS seasonIndex
         FROM artifact ep
         JOIN artifact s ON s.id = ep.parent_artifact_id
                         AND s.type = ?
                         AND s.child_index IS NOT NULL AND s.child_index > 0
         JOIN user_artifact ua ON ua.artifactId = ep.id AND ua.userId = ?
         WHERE s.parent_artifact_id = ?
           AND ep.type = ?
           AND ua.status = ?
           AND ua.endDate IS NULL
         ORDER BY s.child_index ASC, ep.child_index ASC`,
        [
            ArtifactType.TVSHOW_SEASON,
            user.id,
            tvshowId,
            ArtifactType.TVSHOW_EPISODE,
            UserArtifactStatus.FINISHED,
        ]
    );

    if (rows.length === 0) {
        return json({ success: true });
    }

    const count = rows.length;
    const startMs = start.getTime();
    const endMs = end.getTime();

    // Distribute dates evenly across episodes, and track per-season bounds
    const seasonBounds = new Map<number, { first: number; last: number }>();

    for (let i = 0; i < count; i++) {
        const row = rows[i];
        const dateMs = count === 1 ? endMs : startMs + (i / (count - 1)) * (endMs - startMs);

        await ArtifactDB.setUserDate(user.id, row.episodeId, dateMs, 'end');

        const bounds = seasonBounds.get(row.seasonId);
        if (!bounds) {
            seasonBounds.set(row.seasonId, { first: dateMs, last: dateMs });
        } else {
            bounds.last = dateMs;
        }
    }

    for (const [seasonId, { first, last }] of seasonBounds) {
        await ArtifactDB.setUserDate(user.id, seasonId, first, 'start');
        await ArtifactDB.setUserDate(user.id, seasonId, last, 'end');
    }

    return json({ success: true });
}
