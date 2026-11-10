import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';
import { MangaDB } from '$lib/server/model/manga/MangaDB';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = User.deserialize(locals.user);
	const mangaId = parseInt(params.slug);
	const manga = await MangaDB.getById(mangaId, true);
	if (manga) {
		const userInfos = await ArtifactDB.getUserInfos(user.id, manga.getArtifactIds());
		manga.setUserInfos(Object.fromEntries(
			userInfos.map(userInfo => [userInfo.artifactId, userInfo])
		));
		return {
			canEdit: user.hasRight(UserRights.EDIT_ARTIFACT),
			manga: manga.toJSON(),
			userConnected: user.id >= 0
		};
	}
	error(404, 'Not found');
}
