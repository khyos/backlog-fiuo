import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { User, UserRights } from "$lib/model/User";
import { RottenTomatoes } from "$lib/rottentomatoes/RottenTomatoes";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, json } from "@sveltejs/kit";

export async function GET({ url, locals }: any) {
    const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const query : string = url.searchParams.get('query') ?? '';

    let tmdbResults;
    try {
        tmdbResults = await TMDB.searchMovie(query);
    } catch (e) {
        return error(500, "FAILED TMDB: " + e.toString());
    }
    let scResults;
    try {
        scResults = await SensCritique.searchMovie(query);
    } catch (e) {
        return error(500, "FAILED SC: " + e.toString());
    }
    let mcResults;
    try {
        mcResults = await MetaCritic.searchMovie(query);
    } catch (e) {
        return error(500, "FAILED MC: " + e.toString());
    }
    let rtResults;
    try {
        rtResults = await RottenTomatoes.searchMovie(query);
    } catch (e) {
        return error(500, "FAILED RT: " + e.toString());
    }

    const results = {
        tmdb: tmdbResults,
        sc: scResults,
        mc: mcResults,
        rt: rtResults
    }

    return json(results);
}