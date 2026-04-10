import { error } from '@sveltejs/kit';
import { User } from '$lib/model/User';
import { getDbRows } from '$lib/server/database';
import { ArtifactType } from '$lib/model/Artifact';
import type { PageServerLoad } from './$types';

export type DataAnomalyEntry = {
	artifactId: number;
	title: string | null;
	type: ArtifactType | null;
};

export type DataAnomalyGroup = {
	key: string;
	label: string;
	description: string;
	entries: DataAnomalyEntry[];
};

export const load: PageServerLoad = async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (user.id < 0) {
		error(401, 'Please sign in to view data anomalies');
	}

	const animeNoEpisodes = await getDbRows<DataAnomalyEntry>(
		`SELECT a.id AS artifactId, a.title, a.type
		FROM artifact a
		WHERE a.type = ?
		  AND NOT EXISTS (
			SELECT 1 FROM artifact ep WHERE ep.parent_artifact_id = a.id
		  )`,
		[ArtifactType.ANIME]
	);

	const tvshowNoEpisodes = await getDbRows<DataAnomalyEntry>(
		`SELECT a.id AS artifactId, a.title, a.type
		FROM artifact a
		WHERE a.type = ?
		  AND NOT EXISTS (
			SELECT 1 FROM artifact ep WHERE ep.parent_artifact_id = a.id
		  )`,
		[ArtifactType.TVSHOW]
	);

	const groups: DataAnomalyGroup[] = [
		{
			key: 'anime_no_episodes',
			label: 'Anime — no episodes in database',
			description: 'Anime entries that have no episode records in the database.',
			entries: animeNoEpisodes
		},
		{
			key: 'tvshow_no_episodes',
			label: 'TV Show — no episodes in database',
			description: 'TV show entries that have no season or episode records in the database.',
			entries: tvshowNoEpisodes
		}
	];

	return {
		groups: groups.filter(g => g.entries.length > 0)
	};
};
