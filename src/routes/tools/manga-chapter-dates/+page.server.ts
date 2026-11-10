import { error } from '@sveltejs/kit';
import { User } from '#lib/model/User';
import { getDbRows } from '#lib/server/database';
import { ArtifactType } from '#lib/model/Artifact';
import { UserArtifactStatus } from '#lib/model/UserArtifact';
import type { PageServerLoad } from './$types';

export type MangaWithMissingDates = {
	mangaId: number;
	title: string;
	mangaStartDate: number | null;
	mangaEndDate: number | null;
	missingCount: number;
	childType: 'chapter' | 'volume';
};

const missingDatesQuery = () => `
	SELECT
		a.id AS mangaId,
		a.title,
		ua_parent.startDate AS mangaStartDate,
		ua_parent.endDate AS mangaEndDate,
		COUNT(ch.id) AS missingCount
	FROM artifact a
	JOIN artifact ch ON ch.parent_artifact_id = a.id AND ch.type = ?
	JOIN user_artifact ua_ch ON ua_ch.artifactId = ch.id
		AND ua_ch.userId = ?
		AND ua_ch.status = ?
		AND ua_ch.endDate IS NULL
	LEFT JOIN user_artifact ua_parent ON ua_parent.artifactId = a.id
		AND ua_parent.userId = ?
	WHERE a.type = ?
	GROUP BY a.id, a.title, ua_parent.startDate, ua_parent.endDate
	ORDER BY a.title ASC`;

export const load: PageServerLoad = async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (user.id < 0) {
		error(401, 'Please sign in to use this tool');
	}

	const [chapterRows, volumeRows] = await Promise.all([
		getDbRows<Omit<MangaWithMissingDates, 'childType'>>(
			missingDatesQuery(),
			[ArtifactType.MANGA_CHAPTER, user.id, UserArtifactStatus.FINISHED, user.id, ArtifactType.MANGA]
		),
		getDbRows<Omit<MangaWithMissingDates, 'childType'>>(
			missingDatesQuery(),
			[ArtifactType.MANGA_VOLUME, user.id, UserArtifactStatus.FINISHED, user.id, ArtifactType.MANGA]
		),
	]);

	const rows: MangaWithMissingDates[] = [
		...chapterRows.map(r => ({ ...r, childType: 'chapter' as const })),
		...volumeRows.map(r => ({ ...r, childType: 'volume' as const })),
	].sort((a, b) => a.title.localeCompare(b.title));

	return { rows };
};
