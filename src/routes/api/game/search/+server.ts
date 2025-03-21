import { GameDB } from "$lib/server/model/game/GameDB";
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ url }: RequestEvent) {
    const page : number = parseInt(url.searchParams.get('page') ?? '0', 10);
    const pageSize : number = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const query : string = url.searchParams.get('query') ?? '';
    const games = await GameDB.getGames(page, pageSize, query);
    const serializedGames = games.map((game) => game.toJSON());
    return json(serializedGames);
}