import { GameDB } from "$lib/server/model/game/GameDB";
import { json } from "@sveltejs/kit";

export async function GET({ url }: any) {
    const page : number = url.searchParams.get('page') ?? 0;
    const pageSize : number = url.searchParams.get('pageSize') ?? 10;
    const query : string = url.searchParams.get('query') ?? '';
    const games = await GameDB.getGames(page, pageSize, query);
    const serializedGames = games.map((game) => game.serialize());
    return json(serializedGames);
}