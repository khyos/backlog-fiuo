import { User, UserRights } from '$lib/model/User.js';
import { AnimeDB } from '$lib/server/model/anime/AnimeDB.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = User.deserialize(locals.user);
	const page = parseInt(url.searchParams.get('page') ?? '0', 10);
	const pageSize = 10;
	try {
		const animes = await AnimeDB.getAnimes(page, pageSize);
		return {
			animes: animes.map(anime => anime.toJSON()),
			permissions: {
				canDelete: user.hasRight(UserRights.DELETE_ARTIFACT),
				canCreate: user.hasRight(UserRights.CREATE_ARTIFACT)
			}
		};
	} catch (err) {
		console.error('Failed to load animes:', err);
		throw error(500, 'Failed to load animes');
	}
}