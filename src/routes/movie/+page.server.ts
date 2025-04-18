import { User, UserRights } from '$lib/model/User.js';
import { MovieDB } from '$lib/server/model/movie/MovieDB.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = User.deserialize(locals.user);
	const page = parseInt(url.searchParams.get('page') ?? '0', 10);
	const pageSize = 10;
	try {
		const movies = await MovieDB.getMovies(page, pageSize);
		return {
			movies: movies.map(movie => movie.toJSON()),
			permissions: {
				canDelete: user.hasRight(UserRights.DELETE_ARTIFACT),
				canCreate: user.hasRight(UserRights.CREATE_ARTIFACT)
			}
		};
	} catch (err) {
		console.error('Failed to load movies:', err);
		throw error(500, 'Failed to load movies');
	}
}
