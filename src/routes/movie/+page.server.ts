import { User, UserRights } from '$lib/model/User.js';
import { MovieDB } from '$lib/server/model/movie/MovieDB.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ url, locals }: any) {
	const { user } = locals;
	const userInst = User.deserialize(user);
	const page = url.searchParams.get('page') ?? 0;
	const movies = await MovieDB.getMovies(page, 10);
	return {
		movies: movies.map(movie => movie.serialize()),
		canDelete: userInst.hasRight(UserRights.DELETE_ARTIFACT),
		canCreate: userInst.hasRight(UserRights.CREATE_ARTIFACT)
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	'delete': async ({ request, locals }) => {
		const { user } = locals;
		const userInst = User.deserialize(user);
		if (!userInst.hasRight(UserRights.DELETE_ARTIFACT)) {
			return error(403, 'Forbidden');
		}
		const data = await request.formData();
		const movieId = parseInt(data.get('movieId') as string, 10);
		MovieDB.deleteMovie(movieId);
	}
};