import { json } from "@sveltejs/kit";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import type { RequestEvent } from "./$types";

export async function GET({ url }: RequestEvent) {
    const page : number = parseInt(url.searchParams.get('page') ?? '0', 10);
    const pageSize : number = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const query : string = url.searchParams.get('query') ?? '';
    const tvshows = await TvshowDB.getTvshows(page, pageSize, query);
    const serializedTvshows = tvshows.map((tvshow) => tvshow.toJSON());
    return json(serializedTvshows);
}