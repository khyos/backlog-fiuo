import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';
import { AnimeDB } from '$lib/server/model/anime/AnimeDB';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = User.deserialize(locals.user);
	const animeId = parseInt(params.slug);
	const anime = await AnimeDB.getById(animeId, true);
	if (anime) {
		const userInfos = await ArtifactDB.getUserInfos(user.id, anime.getArtifactIds());
		anime.setUserInfos(Object.fromEntries(
			userInfos.map(userInfo => [userInfo.artifactId, userInfo])
		));
		return {
			canEdit: user.hasRight(UserRights.EDIT_ARTIFACT),
			anime: anime.toJSON(),
			userConnected: user.id >= 0
		};
	}
	error(404, 'Not found');
}