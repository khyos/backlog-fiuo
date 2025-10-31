import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { User, UserRights } from "$lib/model/User";
import { RottenTomatoes } from "$lib/rottentomatoes/RottenTomatoes";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ErrorUtil } from "$lib/util/ErrorUtil";

export async function GET({ url, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const query : string = url.searchParams.get('query') ?? '';

    let tmdbResults;
    try {
        tmdbResults = await TMDB.searchTvshow(query);
    } catch (e) {
        tmdbResults = {
            error: ErrorUtil.getErrorMessage(e)
        }
    }
    let scResults;
    try {
        scResults = await SensCritique.searchTvshow(query);
    } catch (e) {
        scResults = {
            error: ErrorUtil.getErrorMessage(e)
        }
    }
    let mcResults;
    try {
        mcResults = await MetaCritic.searchTvshow(query);
    } catch (e) {
        mcResults = {
            error: ErrorUtil.getErrorMessage(e)
        }
    }
    let rtResults;
    try {
        rtResults = await RottenTomatoes.searchTvshow(query);
    } catch (e) {
        rtResults = {
            error: ErrorUtil.getErrorMessage(e)
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