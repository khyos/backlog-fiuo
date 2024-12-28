import { GameDB } from '$lib/server/model/game/GameDB';
import { error } from '@sveltejs/kit';
import { User, UserRights } from '$lib/model/User';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export async function load({ params, locals }) {
	const { user } = locals;
	const userInst = User.deserialize(user);
	const gameId = parseInt(params.slug);
	const game = await GameDB.getById(gameId);
	if (game) {
		const userInfo = await ArtifactDB.getUserInfo(userInst.id, gameId);
		return {
			canEdit: userInst.hasRight(UserRights.EDIT_ARTIFACT),
			game: game.serialize(),
			userConnected: userInst.id >= 0,
			userInfo: userInfo ? userInfo.serialize() : null
		};
	}
	error(404, 'Not found');
}