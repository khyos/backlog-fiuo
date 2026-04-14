import { error } from '@sveltejs/kit';
import { User } from '$lib/model/User';
import { getDbRows } from '$lib/server/database';
import { ArtifactType } from '$lib/model/Artifact';
import type { UserArtifactStatus } from '$lib/model/UserArtifact';
import type { PageServerLoad } from './$types';

const MAIN_ARTIFACT_TYPES = [
	ArtifactType.GAME,
	ArtifactType.MOVIE,
	ArtifactType.TVSHOW,
	ArtifactType.ANIME
];

const EPISODE_ARTIFACT_TYPES = [
	ArtifactType.ANIME_EPISODE,
	ArtifactType.TVSHOW_EPISODE
];

const ALL_QUERIED_TYPES = [...MAIN_ARTIFACT_TYPES, ...EPISODE_ARTIFACT_TYPES];

export type StatEntry = {
	type: ArtifactType;
	duration: number;
	status: UserArtifactStatus | null;
	score: number | null;
	endDate: string | null;
	startDate: string | null;
	episodeCount: number | null;
};

export const load: PageServerLoad = async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (user.id < 0) {
		error(401, 'Please sign in to view your statistics');
	}

	const placeholders = ALL_QUERIED_TYPES.map(() => '?').join(', ');
	const entries = await getDbRows<StatEntry>(
		`SELECT artifact.type, artifact.duration, user_artifact.status, user_artifact.score,
			user_artifact.endDate, user_artifact.startDate,
			CASE WHEN artifact.type = 'anime'
				THEN (SELECT COUNT(*) FROM artifact child WHERE child.parent_artifact_id = artifact.id)
				ELSE NULL
			END AS episodeCount
		FROM user_artifact
		JOIN artifact ON artifact.id = user_artifact.artifactId
		WHERE user_artifact.userId = ? AND artifact.type IN (${placeholders})`,
		[user.id, ...ALL_QUERIED_TYPES]
	);

	return { entries };
};
