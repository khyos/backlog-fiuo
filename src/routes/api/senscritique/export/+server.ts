import { exportUserCollection, UNIVERSE_ALIASES } from '$lib/senscritique/SensCritiqueExport';
import { User, UserRights } from '$lib/model/User';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

/**
 * GET /api/senscritique/export?username=<username>[&universe=film][&mode=done|wished|all][&withReviews=true]
 *
 * Restricted to administrators (BOOTSTRAP right).
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
				`Unknown universe "${universeParam}". Accepted values: film, book, game, tvshow, bd, album, track`,
			);
		}
		universe = mapped;
	}

	const modeParam = url.searchParams.get('mode') ?? 'done';
	if (modeParam !== 'done' && modeParam !== 'wished' && modeParam !== 'all') {
		return error(400, 'Invalid mode. Accepted values: done, wished, all');
	}

	const withReviews = url.searchParams.get('withReviews') === 'true';

	try {
		const result = await exportUserCollection(username.trim(), {
			universe,
			mode: modeParam,
			withReviews,
		});
		return json(result);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return error(502, `SensCritique API error: ${message}`);
	}
}
