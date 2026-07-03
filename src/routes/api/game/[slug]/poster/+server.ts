import { IGDB } from "$lib/igdb/IGDB";
import { LinkType } from "$lib/model/Link";
import { GameDB } from "$lib/server/model/game/GameDB";
import { User } from "$lib/model/User";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, 'Unauthorized');
    }
    const gameId = parseInt(params.slug);
	const game = await GameDB.getById(gameId);
	if (game?.links) {
		const link = game.links.find(link => link.type === LinkType.IGDB);
        if (link) {
            const url = await IGDB.getImageURL(link.url);
            if (url) {
                return json({ url });
            }
        }
	}
	return error(404, 'Not found');
}