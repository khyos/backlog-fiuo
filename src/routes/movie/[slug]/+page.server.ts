import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = User.deserialize(locals.user);
	const movieId = parseInt(params.slug);
	const movie = await MovieDB.getById(movieId);
	if (movie) {
		const userInfos = await ArtifactDB.getUserInfos(user.id, [movieId]);
		movie.setUserInfos(Object.fromEntries(
			userInfos.map(userInfo => [userInfo.artifactId, userInfo])
		));
		return {
			canEdit: user.hasRight(UserRights.EDIT_ARTIFACT),
			movie: movie.toJSON(),
			userConnected: user.id >= 0
		};
	}
	error(404, 'Not found');
}