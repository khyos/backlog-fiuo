import { error } from '@sveltejs/kit';
import { User } from '$lib/model/User';
import { getDbRows } from '$lib/server/database';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactStatus } from '$lib/model/UserArtifact';
import type { PageServerLoad } from './$types';

export type AnimeWithMissingEpisodeDates = {
	animeId: number;
	title: string;
	animeStartDate: string | null;
	animeEndDate: string | null;
	episodesMissingDates: number;
};

export const load: PageServerLoad = async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (user.id < 0) {
		error(401, 'Please sign in to use this tool');
	}

	// Find anime where the user has finished episodes without end dates
	const rows = await getDbRows<AnimeWithMissingEpisodeDates>(
		`SELECT
			a.id AS animeId,
			a.title,
			ua_parent.startDate AS animeStartDate,
			ua_parent.endDate AS animeEndDate,
			COUNT(ep.id) AS episodesMissingDates
		FROM artifact a
		JOIN artifact ep ON ep.parent_artifact_id = a.id AND ep.type = ?
		JOIN user_artifact ua_ep ON ua_ep.artifactId = ep.id
			AND ua_ep.userId = ?
			AND ua_ep.status = ?
			AND ua_ep.endDate IS NULL
		LEFT JOIN user_artifact ua_parent ON ua_parent.artifactId = a.id
			AND ua_parent.userId = ?
		WHERE a.type = ?
		GROUP BY a.id, a.title, ua_parent.startDate, ua_parent.endDate
		ORDER BY a.title ASC`,
		[
			ArtifactType.ANIME_EPISODE,
			user.id,
			UserArtifactStatus.FINISHED,
			user.id,
			ArtifactType.ANIME,
		]
	);

	return { animes: rows };
};
