import { User, UserRights } from '$lib/model/User';
import { LinkType } from '$lib/model/Link';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';
import { LinkDB } from '$lib/server/model/LinkDB';
import { JSDOM } from 'jsdom';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export interface MALReconcileItem {
	malId: string;
	title: string;
	malUrl: string;
	/** User's MAL score (null = not rated, 1-10 otherwise) */
	malScore: number | null;
	/** Raw MAL list status string from the XML */
	malStatus: string;
	/** Date user finished the anime (YYYY-MM-DD), null if unset */
	finishDate: string | null;
	/** Date user started the anime (YYYY-MM-DD), null if unset */
	startDate: string | null;
	/** artifact id in the local DB, null if not found */
	dbId: number | null;
	/** artifact type in the local DB, null if not found */
	dbType: string | null;
	/** Current user's score in the local DB, null if not found or not rated */
	dbScore: number | null;
	/** Current user's end date in the local DB, null if not set */
	dbEndDate: string | null;
	/** Current user's start date in the local DB, null if not set */
	dbStartDate: string | null;
}

export interface MALReconcileResult {
	username: string;
	fetchedAt: string;
	totalFetched: number;
	matchedCount: number;
	missingCount: number;
	items: MALReconcileItem[];
}

interface ParsedEntry {
	malId: string;
	title: string;
	malScore: number | null;
	malStatus: string;
	finishDate: string | null;
	startDate: string | null;
}

/** MAL exports "0000-00-00" for dates that haven't been set. */
function normalizeDate(raw: string | null | undefined): string | null {
	if (!raw || raw === '0000-00-00') return null;
	return raw;
}

/**
 * Parses a MAL XML anime export file and returns the username and list entries.
 * The XML format has <myinfo> with <user_name> and <anime> elements with
 * <series_animedb_id>, <series_title>, <my_score>, <my_status>,
 * <my_start_date>, <my_finish_date>.
 */
function parseMALXML(xmlContent: string): { username: string; entries: ParsedEntry[] } {
	let doc: Document;
	try {
		const dom = new JSDOM(xmlContent, { contentType: 'text/xml' });
		doc = dom.window.document;
	} catch {
		throw new Error('Failed to parse XML file');
	}

	const username = doc.querySelector('myinfo > user_name')?.textContent?.trim() ?? '';

	const animeElements = doc.querySelectorAll('anime');
	if (animeElements.length === 0) {
		throw new Error('No anime entries found in the XML. Make sure you uploaded an anime list export.');
	}

	const entries: ParsedEntry[] = Array.from(animeElements).map((el) => {
		const malId = el.querySelector('series_animedb_id')?.textContent?.trim() ?? '';
		const title = el.querySelector('series_title')?.textContent?.trim() ?? '';
		const rawScore = parseInt(el.querySelector('my_score')?.textContent?.trim() ?? '0', 10);
		const malScore = rawScore > 0 ? rawScore : null;
		const malStatus = el.querySelector('my_status')?.textContent?.trim() ?? '';
		const finishDate = normalizeDate(el.querySelector('my_finish_date')?.textContent?.trim());
		const startDate = normalizeDate(el.querySelector('my_start_date')?.textContent?.trim());
		return { malId, title, malScore, malStatus, finishDate, startDate };
	});

	return { username, entries };
}

/**
 * POST /api/mal/reconcile
 * Body: { xmlContent: string } — the raw content of the MAL anime list XML export.
 *
 * Parses the export and annotates each item with local DB presence.
 * Restricted to users with the SENSCRITIQUE_EXPORT right.
 *
 * How to get the XML:
 *   MyAnimeList → Profile → Edit Profile → Export My List → Anime List
 */
export async function POST({ request, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
	if (!user.hasRight(UserRights.SENSCRITIQUE_EXPORT)) {
		return error(403, 'Forbidden');
	}

	let xmlContent: string;
	try {
		const body = await request.json();
		xmlContent = body?.xmlContent;
		if (typeof xmlContent !== 'string' || xmlContent.trim() === '') {
			return error(400, 'Missing xmlContent in request body');
		}
	} catch {
		return error(400, 'Invalid JSON body');
	}

	try {
		const { username, entries } = parseMALXML(xmlContent);

		const reconcileItems: MALReconcileItem[] = await Promise.all(
			entries.map(async (entry) => {
				const dbArtifact = await LinkDB.getArtifactByLink(LinkType.MAL, entry.malId);

				let dbScore: number | null = null;
				let dbEndDate: string | null = null;
				let dbStartDate: string | null = null;
				if (dbArtifact) {
					const userInfo = await ArtifactDB.getUserInfo(user.id, dbArtifact.id);
					dbScore = userInfo?.score ?? null;
					dbEndDate = userInfo?.endDate?.toISOString() ?? null;
					dbStartDate = userInfo?.startDate?.toISOString() ?? null;
				}

				return {
					...entry,
					malUrl: `https://myanimelist.net/anime/${entry.malId}`,
					dbId: dbArtifact?.id ?? null,
					dbType: dbArtifact?.artifactType ?? null,
					dbScore,
					dbEndDate,
					dbStartDate,
				};
			}),
		);

		const matchedCount = reconcileItems.filter((i) => i.dbId !== null).length;

		const result: MALReconcileResult = {
			username,
			fetchedAt: new Date().toISOString(),
			totalFetched: reconcileItems.length,
			matchedCount,
			missingCount: reconcileItems.length - matchedCount,
			items: reconcileItems,
		};

		return json(result);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return error(502, `MAL reconcile error: ${message}`);
	}
}
