import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';
import { GameDB } from '$lib/server/model/game/GameDB';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = User.deserialize(locals.user);
	const gameId = parseInt(params.slug);
	const game = await GameDB.getById(gameId);
	if (game) {
		const userInfo = await ArtifactDB.getUserInfo(user.id, gameId);
		return {
			canEdit: user.hasRight(UserRights.EDIT_ARTIFACT),
			game: game.toJSON(),
			userConnected: user.id >= 0,
			userInfo: userInfo ? userInfo.toJSON() : null
		};
	}
	error(404, 'Not found');
}