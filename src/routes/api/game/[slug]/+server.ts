import { User, UserRights } from "$lib/model/User";
import { GameDB } from "$lib/server/model/game/GameDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
  	const gameId = parseInt(params.slug);
	const game = await GameDB.getById(gameId);
	if (game) {
	  	return json(game.toJSON());
	}
	error(404, 'Not found');
}

export async function DELETE({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.DELETE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
	const gameId = parseInt(params.slug);
    await GameDB.deleteGame(gameId);
    return json({ deleted: gameId });
}