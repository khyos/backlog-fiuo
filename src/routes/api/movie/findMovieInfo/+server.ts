import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { User, UserRights } from "$lib/model/User";
import { RottenTomatoes } from "$lib/rottentomatoes/RottenTomatoes";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ url, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const query : string = url.searchParams.get('query') ?? '';

    let tmdbResults;
    try {
        tmdbResults = await TMDB.searchMovie(query);
    } catch (e) {
        tmdbResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let scResults;
    try {
        scResults = await SensCritique.searchMovie(query);
    } catch (e) {
        scResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let mcResults;
    try {
        mcResults = await MetaCritic.searchMovie(query);
    } catch (e) {
        mcResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let rtResults;
    try {
        rtResults = await RottenTomatoes.searchMovie(query);
    } catch (e) {
        rtResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }

    const results = {
        tmdb: tmdbResults,
        sc: scResults,
        mc: mcResults,
        rt: rtResults
    }

    return json(results);
}