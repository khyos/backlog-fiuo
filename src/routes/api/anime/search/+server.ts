import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ url }: RequestEvent) {
    const page : number = parseInt(url.searchParams.get('page') ?? '0', 10);
    const pageSize : number = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const query : string = url.searchParams.get('query') ?? '';
    const animes = await AnimeDB.getAnimes(page, pageSize, query);
    const serializedAnimes = animes.map((anime) => anime.toJSON());
    return json(serializedAnimes);
}