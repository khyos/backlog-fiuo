import { IGDB } from "$lib/igdb/IGDB";
import { LinkType } from "$lib/model/Link";
import { GameDB } from "$lib/server/model/game/GameDB";
import { error, text } from "@sveltejs/kit";

export async function GET({ params }: any) {
    const gameId = parseInt(params.slug);
	const game = await GameDB.getById(gameId);
	if (game?.links) {
		const link = game.links.find(link => link.type === LinkType.IGDB);
        if (link) {
            const url = await IGDB.getImageURL(link.url);
            if (url) {
                return text(url);
            }
        }
	}
	error(404, 'Not found');
}