import { HLTB } from "$lib/hltb/HLTB";
import { IGDB } from "$lib/igdb/IGDB";
import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { User, UserRights } from "$lib/model/User";
import { OpenCritic } from "$lib/opencritic/OpenCritic";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { Steam } from "$lib/steam/Steam";
import { error, json } from "@sveltejs/kit";

export async function GET({ url, locals }: any) {
    const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const query : string = url.searchParams.get('query') ?? '';

    let igdbResults;
    try {
        igdbResults = await IGDB.searchGame(query);
    } catch (e) {
        return error(500, "FAILED TMDB: " + e.toString());
    }
    let hltbResults;
    try {
        hltbResults = await HLTB.searchGame(query);
    } catch (e) {
        return error(500, "FAILED TMDB: " + e.toString());
    }
    let scResults;
    try {
        scResults = await SensCritique.searchGame(query);
    } catch (e) {
        return error(500, "FAILED TMDB: " + e.toString());
    }
    let mcResults;
    try {
        mcResults = await MetaCritic.searchGame(query);
    } catch (e) {
        return error(500, "FAILED TMDB: " + e.toString());
    }
    let ocResults;
    try {
        ocResults = await OpenCritic.searchGame(query);
    } catch (e) {
        return error(500, "FAILED TMDB: " + e.toString());
    }
    let steamResults;
    try {
        steamResults = await Steam.searchGame(query);
    } catch (e) {
        return error(500, "FAILED TMDB: " + e.toString());
    }

    const results = {
        igdb: igdbResults,
        hltb: hltbResults,
        sc: scResults,
        mc: mcResults,
        oc: ocResults,
        steam: steamResults
    }

    return json(results);
}