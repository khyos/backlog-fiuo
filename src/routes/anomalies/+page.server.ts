import { error } from '@sveltejs/kit';
import { User } from '$lib/model/User';
import { getDbRows } from '$lib/server/database';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactStatus } from '$lib/model/UserArtifact';
import type { PageServerLoad } from './$types';

const TRACKED_TYPES = [
	ArtifactType.GAME,
	ArtifactType.MOVIE,
	ArtifactType.TVSHOW,
	ArtifactType.ANIME
];

export type AnomalyEntry = {
	artifactId: number;
	title: string | null;
	type: ArtifactType | null;
	status: UserArtifactStatus | null;
	score: number | null;
	startDate: string | null;
	endDate: string | null;
};

export type AnomalyGroup = {
	key: string;
	label: string;
	description: string;
	entries: AnomalyEntry[];
};

export const load: PageServerLoad = async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (user.id < 0) {
		error(401, 'Please sign in to view anomalies');
	}

	const placeholders = TRACKED_TYPES.map(() => '?').join(', ');
	const all = await getDbRows<AnomalyEntry>(
		`SELECT artifact.id AS artifactId, artifact.title, artifact.type,
			user_artifact.status, user_artifact.score,
			user_artifact.startDate, user_artifact.endDate
		FROM user_artifact
		JOIN artifact ON artifact.id = user_artifact.artifactId
		WHERE user_artifact.userId = ? AND artifact.type IN (${placeholders})`,
		[user.id, ...TRACKED_TYPES]
	);

	const orphaned = await getDbRows<Omit<AnomalyEntry, 'title' | 'type'>>(
		`SELECT user_artifact.artifactId, user_artifact.status, user_artifact.score,
			user_artifact.startDate, user_artifact.endDate
		FROM user_artifact
		LEFT JOIN artifact ON artifact.id = user_artifact.artifactId
		WHERE user_artifact.userId = ? AND artifact.id IS NULL`,
		[user.id]
	);

	const groups: AnomalyGroup[] = [
		{
			key: 'end_date_not_finished',
			label: 'Has end date — not finished or dropped',
			description: 'An end date is set but status is neither "Finished" nor "Dropped".',
			entries: all.filter(e =>
				e.endDate &&
				e.status !== UserArtifactStatus.FINISHED &&
				e.status !== UserArtifactStatus.DROPPED
			)
		},
		{
			key: 'start_date_no_status',
			label: 'Has start date — no status',
			description: 'A start date is recorded but no status has been set.',
			entries: all.filter(e =>
				e.startDate && !e.status
			)
		},
		{
			key: 'no_status',
			label: 'Has score — no status',
			description: 'A score is recorded but no status has been set.',
			entries: all.filter(e => !e.status && e.score !== null && e.score > 0)
		},
		{
			key: 'finished_no_date',
			label: 'Finished — no end date',
			description: 'Status is "Finished" but no end date is recorded.',
			entries: all.filter(e =>
				e.status === UserArtifactStatus.FINISHED && !e.endDate
			)
		},
		{
			key: 'finished_no_score',
			label: 'Finished or dropped — no score',
			description: 'Status is "Finished" or "Dropped" but no score has been given.',
			entries: all.filter(e =>
				(e.status === UserArtifactStatus.FINISHED || e.status === UserArtifactStatus.DROPPED) &&
				(e.score === null || e.score === 0)
			)
		},
		{
			key: 'orphaned_artifact',
			label: 'Relation to non-existing artifact',
			description: 'A user_artifact entry references an artifact that no longer exists in the database.',
			entries: orphaned.map(e => ({ ...e, title: null, type: null }))
		}
	];

	const animeNoEpisodes = await getDbRows<AnomalyEntry>(
		`SELECT artifact.id AS artifactId, artifact.title, artifact.type,
			user_artifact.status, user_artifact.score,
			user_artifact.startDate, user_artifact.endDate
		FROM user_artifact
		JOIN artifact ON artifact.id = user_artifact.artifactId
		WHERE user_artifact.userId = ?
		  AND artifact.type = ?
		  AND NOT EXISTS (
			SELECT 1 FROM artifact AS ep WHERE ep.parent_artifact_id = artifact.id
		  )`,
		[user.id, ArtifactType.ANIME]
	);

	if (animeNoEpisodes.length > 0) {
		groups.push({
			key: 'anime_no_episodes',
			label: 'Anime — no episodes in database',
			description: 'Anime entries in your collection that have no episode records in the database.',
			entries: animeNoEpisodes
		});
	}

	return {
		groups: groups.filter(g => g.entries.length > 0)
	};
};
