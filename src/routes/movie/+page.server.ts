import { User, UserRights } from '$lib/model/User.js';
import { MovieDB } from '$lib/server/model/movie/MovieDB.js';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userInst = User.deserialize(locals.user);
	const page = parseInt(url.searchParams.get('page') ?? '0', 10);
	const pageSize = 10;
	try {
		const movies = await MovieDB.getMovies(page, pageSize);
		return {
			movies: movies.map(movie => movie.serialize()),
			permissions: {
				canDelete: userInst.hasRight(UserRights.DELETE_ARTIFACT),
				canCreate: userInst.hasRight(UserRights.CREATE_ARTIFACT)
			}
		};
	} catch (err) {
		console.error('Failed to load movies:', err);
		throw error(500, 'Failed to load movies');
	}
}

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const userInst = User.deserialize(locals.user);
		if (!userInst.hasRight(UserRights.DELETE_ARTIFACT)) {
			return error(403, 'Forbidden');
		}

		const data = await request.formData();
		const movieIdRaw = data.get('movieId');
		
		if (!movieIdRaw) {
			throw error(400, 'Missing movie ID');
		}
		
		const movieId = parseInt(movieIdRaw.toString(), 10);
		
		if (isNaN(movieId)) {
			throw error(400, 'Invalid movie ID');
		}

		try {
			await MovieDB.deleteMovie(movieId);
			return { success: true };
		} catch (err) {
			console.error(`Failed to delete movie ${movieId}:`, err);
			throw error(500, 'Failed to delete movie');
		}
	}
};