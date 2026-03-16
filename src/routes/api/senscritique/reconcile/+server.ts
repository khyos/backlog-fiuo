import { exportUserCollection, UNIVERSE_ALIASES, type ExportItem } from '$lib/senscritique/SensCritiqueExport';
import { User, UserRights } from '$lib/model/User';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';
import { LinkDB } from '$lib/server/model/LinkDB';
import { LinkType } from '$lib/model/Link';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export interface ReconcileItem extends ExportItem {
	/** artifact id in the local DB, null if not found */
	dbId: number | null;
	/** artifact type in the local DB (movie, game, tvshow, anime…), null if not found */
	dbType: string | null;
	/** The derived SC id used for the DB lookup (slug/numericId) */
	scId: string;
	/** Current user's score in the local DB, null if not found or not rated */
	dbScore: number | null;
	/** Current user's end date in the local DB, null if not set */
	dbEndDate: string | null;
}

export interface ReconcileResult {
	username: string;
	displayName: string;
	extractedAt: string;
	totalInCollection: number;
	exportedCount: number;
	matchedCount: number;
	missingCount: number;
	items: ReconcileItem[];
}

/**
 * Extracts the SensCritique id stored in the DB from a full SC URL.
 * e.g. https://www.senscritique.com/film/her/1301677/ → "her/1301677"
 */
function scIdFromUrl(url: string): string {
	return url.split('/').filter(Boolean).slice(-2).join('/');
}

/**
 * GET /api/senscritique/reconcile?username=<username>[&universe=film|game|tvshow|serie][&mode=done|wished|all]
 *
 * Fetches the SC user collection and annotates each item with local DB presence.
 * Restricted to users with the SENSCRITIQUE_EXPORT right.
 */
export async function GET({ url, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
	if (!user.hasRight(UserRights.SENSCRITIQUE_EXPORT)) {
		return error(403, 'Forbidden');
	}

	const username = url.searchParams.get('username');
	if (!username || username.trim() === '') {
		return error(400, 'Missing required query parameter: username');
	}

	const universeParam = url.searchParams.get('universe');
	let universe: string | null = null;
	if (universeParam) {
		const mapped = UNIVERSE_ALIASES[universeParam.toLowerCase()];
		if (!mapped) {
			return error(
				400,
				`Unknown universe "${universeParam}". Accepted values: film, game, tvshow, serie`,
			);
		}
		universe = mapped;
	}

	const modeParam = url.searchParams.get('mode') ?? 'all';
	if (modeParam !== 'done' && modeParam !== 'wished' && modeParam !== 'all') {
		return error(400, 'Invalid mode. Accepted values: done, wished, all');
	}

	try {
		const exportResult = await exportUserCollection(username.trim(), {
			universe,
			mode: modeParam,
			withReviews: false,
		});

		const reconcileItems: ReconcileItem[] = await Promise.all(
			exportResult.items.map(async (item) => {
				const scId = scIdFromUrl(item.url);
				const dbArtifact = await LinkDB.getArtifactByLink(LinkType.SENSCRITIQUE, scId);
				let dbScore: number | null = null;
				let dbEndDate: string | null = null;
				if (dbArtifact) {
					const userInfo = await ArtifactDB.getUserInfo(user.id, dbArtifact.id);
					dbScore = userInfo?.score ?? null;
					dbEndDate = userInfo?.endDate?.toISOString() ?? null;
				}
				return {
					...item,
					scId,
					dbId: dbArtifact?.id ?? null,
					dbType: dbArtifact?.artifactType ?? null,
					dbScore,
					dbEndDate,
				};
			}),
		);

		const matchedCount = reconcileItems.filter((i) => i.dbId !== null).length;

		const result: ReconcileResult = {
			username: exportResult.username,
			displayName: exportResult.displayName,
			extractedAt: exportResult.extractedAt,
			totalInCollection: exportResult.totalInCollection,
			exportedCount: exportResult.exportedCount,
			matchedCount,
			missingCount: exportResult.exportedCount - matchedCount,
			items: reconcileItems,
		};

		return json(result);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return error(502, `SensCritique reconcile error: ${message}`);
	}
}
