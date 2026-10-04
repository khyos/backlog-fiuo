import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { User, UserRights } from "$lib/model/User";
import { RottenTomatoes } from "$lib/rottentomatoes/RottenTomatoes";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

async function searchExternal<T>(search: () => Promise<T[] | null | undefined>): Promise<T[]> {
    try {
        return (await search()) ?? [];
    } catch (e) {
        console.error('External search failed:', e);
        return [];
    }
}

export async function GET({ url, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const query : string = url.searchParams.get('query') ?? '';

    const [tmdbResults, scResults, mcResults, rtResults] = await Promise.all([
        searchExternal(() => TMDB.searchMovie(query)),
        searchExternal(() => SensCritique.searchMovie(query)),
        searchExternal(() => MetaCritic.searchMovie(query)),
        searchExternal(() => RottenTomatoes.searchMovie(query))
    ]);

    const results = {
        tmdb: tmdbResults,
        sc: scResults,
        mc: mcResults,
        rt: rtResults
    }

    return json(results);
}
