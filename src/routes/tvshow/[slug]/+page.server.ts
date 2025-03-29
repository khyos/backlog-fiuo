import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = User.deserialize(locals.user);
	const tvshowId = parseInt(params.slug);
	const tvshow = await TvshowDB.getById(tvshowId, true, true);
	if (tvshow) {
		const userInfos = await ArtifactDB.getUserInfos(user.id, tvshow.getArtifactIds());
		tvshow.setUserInfos(Object.fromEntries(
			userInfos.map(userInfo => [userInfo.artifactId, userInfo])
		));
		return {
			canEdit: user.hasRight(UserRights.EDIT_ARTIFACT),
			tvshow: tvshow.toJSON(),
			userConnected: user.id >= 0
		};
	}
	error(404, 'Not found');
}