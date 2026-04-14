import { json } from '@sveltejs/kit';
import { User } from '$lib/model/User';
import { getDbRows } from '$lib/server/database';
import { ArtifactType } from '$lib/model/Artifact';
import type { RequestHandler } from './$types';

type DataAnomalyEntry = {
	artifactId: number;
	title: string | null;
	type: ArtifactType | null;
};

type AnimeWithMalId = DataAnomalyEntry & { malId: string | null };

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

async function getAnimeEpisodeCount(malId: string): Promise<number | null> {
	while (true) {
		const response = await fetch(`${JIKAN_BASE_URL}/anime/${malId}`);
		if (response.status === 429) {
			const retryAfter = parseInt(response.headers.get('Retry-After') ?? '2', 10);
			await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
			continue;
		}
		if (!response.ok) return null;
		const data = await response.json();
		return data.data?.episodes ?? null;
	}
}

async function filterOutSingleEpisodeAnime(entries: AnimeWithMalId[]): Promise<DataAnomalyEntry[]> {
	const results: DataAnomalyEntry[] = [];
	for (const entry of entries) {
		if (!entry.malId) {
			results.push(entry);
			continue;
		}
		const episodes = await getAnimeEpisodeCount(entry.malId);
		if (episodes !== 1) {
			results.push(entry);
		}
		// Jikan: max 3 req/s — stay safe with ~400ms between requests
		await new Promise(resolve => setTimeout(resolve, 400));
	}
	return results;
}

export const GET: RequestHandler = async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (user.id < 0) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const raw = await getDbRows<AnimeWithMalId>(
		`SELECT a.id AS artifactId, a.title, a.type, l.url AS malId
		FROM artifact a
		LEFT JOIN link l ON l.artifactId = a.id AND l.type = 'MAL'
		WHERE a.type = ?
		  AND NOT EXISTS (
			SELECT 1 FROM artifact ep WHERE ep.parent_artifact_id = a.id
		  )`,
		[ArtifactType.ANIME]
	);

	const filtered = await filterOutSingleEpisodeAnime(raw);
	return json(filtered);
};
