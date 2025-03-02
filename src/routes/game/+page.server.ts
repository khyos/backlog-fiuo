import { User, UserRights } from '$lib/model/User.js';
import { GameDB } from '$lib/server/model/game/GameDB.js';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types.js';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userInst = User.deserialize(locals.user);
	const page = parseInt(url.searchParams.get('page') ?? '0', 10);
	const pageSize = 10;
	try {
		const games = await GameDB.getGames(page, pageSize);
		return {
			games: games.map(game => game.serialize()),
			permissions: {
				canDelete: userInst.hasRight(UserRights.DELETE_ARTIFACT),
				canCreate: userInst.hasRight(UserRights.CREATE_ARTIFACT)
			}
		};
	} catch (err) {
		console.error('Failed to load games:', err);
		throw error(500, 'Failed to load games');
	}
}

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const userInst = User.deserialize(locals.user);
		if (!userInst.hasRight(UserRights.DELETE_ARTIFACT)) {
			return error(403, 'Forbidden');
		}

		const data = await request.formData();
		const gameIdRaw = data.get('gameId');
		
		if (!gameIdRaw) {
			throw error(400, 'Missing game ID');
		}
		
		const gameId = parseInt(gameIdRaw.toString(), 10);
		
		if (isNaN(gameId)) {
			throw error(400, 'Invalid game ID');
		}

		try {
			await GameDB.deleteGame(gameId);
			return { success: true };
		} catch (err) {
			console.error(`Failed to delete game ${gameId}:`, err);
			throw error(500, 'Failed to delete game');
		}
	}
};