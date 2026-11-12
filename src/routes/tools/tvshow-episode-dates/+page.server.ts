import { error } from '@sveltejs/kit';
import { User } from '#lib/model/User';
import { getDbRows } from '#lib/server/database';
import { ArtifactType } from '#lib/model/Artifact';
import { UserArtifactStatus } from '#lib/model/UserArtifact';
import type { PageServerLoad } from './$types';

export type TvshowWithMissingEpisodeDates = {
	tvshowId: number;
	title: string;
	showStartDate: number | null;
	showEndDate: number | null;
	episodesMissingDates: number;
};

export const load: PageServerLoad = async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (user.id < 0) {
		error(401, 'Please sign in to use this tool');
	}

	// Find TV shows where the user has finished episodes without end dates
	const rows = await getDbRows<TvshowWithMissingEpisodeDates>(
		`SELECT
			t.id AS tvshowId,
			t.title,
			ua_show.startDate AS showStartDate,
			ua_show.endDate   AS showEndDate,
			COUNT(ep.id)      AS episodesMissingDates
		FROM artifact t
		JOIN artifact s  ON s.parent_artifact_id = t.id
						 AND s.type = ?
						 AND s.child_index IS NOT NULL AND s.child_index > 0
		JOIN artifact ep ON ep.parent_artifact_id = s.id
						 AND ep.type = ?
		JOIN user_artifact ua_ep ON ua_ep.artifactId = ep.id
						 AND ua_ep.userId = ?
						 AND ua_ep.status = ?
						 AND ua_ep.endDate IS NULL
		LEFT JOIN user_artifact ua_show ON ua_show.artifactId = t.id AND ua_show.userId = ?
		WHERE t.type = ?
		GROUP BY t.id, t.title, ua_show.startDate, ua_show.endDate
		ORDER BY t.title ASC`,
		[
			ArtifactType.TVSHOW_SEASON,
			ArtifactType.TVSHOW_EPISODE,
			user.id,
			UserArtifactStatus.FINISHED,
			user.id,
			ArtifactType.TVSHOW,
		]
	);

	return { tvshows: rows };
};
