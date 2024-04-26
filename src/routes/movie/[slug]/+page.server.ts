import { User, UserRights } from '$lib/model/User';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params, locals }: any) {
	const { user } = locals;
	const userInst = User.deserialize(user);
	const movieId = parseInt(params.slug);
	const movie = await MovieDB.getById(movieId);
	if (movie) {
		return {
			canEdit: userInst.hasRight(UserRights.EDIT_ARTIFACT),
			movie: movie.serialize()
		};
	}
	error(404, 'Not found');
}