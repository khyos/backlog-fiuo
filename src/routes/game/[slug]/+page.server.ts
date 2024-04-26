import { GameDB } from '$lib/server/model/game/GameDB';
import { error } from '@sveltejs/kit';
import { User, UserRights } from '$lib/model/User';

export async function load({ params, locals }) {
	const { user } = locals;
	const userInst = User.deserialize(user);
	const gameId = parseInt(params.slug);
	const game = await GameDB.getById(gameId);
	if (game) {
		return {
			canEdit: userInst.hasRight(UserRights.EDIT_ARTIFACT),
			game: game.serialize()
		};
	}
	error(404, 'Not found');
}