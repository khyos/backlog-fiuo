import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userInst = User.deserialize(locals.user);
	const movieId = parseInt(params.slug);
	const movie = await MovieDB.getById(movieId);
	if (movie) {
		const userInfo = await ArtifactDB.getUserInfo(userInst.id, movieId);
		return {
			canEdit: userInst.hasRight(UserRights.EDIT_ARTIFACT),
			movie: movie.serialize(),
			userConnected: userInst.id >= 0,
			userInfo: userInfo ? userInfo.serialize() : null
		};
	}
	error(404, 'Not found');
}