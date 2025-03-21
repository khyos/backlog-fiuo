import { HLTB } from "$lib/hltb/HLTB";
import { IGDB } from "$lib/igdb/IGDB";
import { ITAD } from "$lib/itad/ITAD";
import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { User, UserRights } from "$lib/model/User";
import { OpenCritic } from "$lib/opencritic/OpenCritic";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { Steam } from "$lib/steam/Steam";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ url, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const query : string = url.searchParams.get('query') ?? '';

    let igdbResults;
    try {
        igdbResults = await IGDB.searchGame(query);
    } catch (e) {
        igdbResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let hltbResults;
    try {
        hltbResults = await HLTB.searchGame(query);
    } catch (e) {
        hltbResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let scResults;
    try {
        scResults = await SensCritique.searchGame(query);
    } catch (e) {
        scResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let mcResults;
    try {
        mcResults = await MetaCritic.searchGame(query);
    } catch (e) {
        mcResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let ocResults;
    try {
        ocResults = await OpenCritic.searchGame(query);
    } catch (e) {
        ocResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let steamResults;
    try {
        steamResults = await Steam.searchGame(query);
    } catch (e) {
        steamResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }
    let itadResults;
    try {
        itadResults = await ITAD.searchGame(query);
    } catch (e) {
        itadResults = {
            error: e instanceof Error ? e.toString() : 'Unknown Error'
        }
    }

    const results = {
        igdb: igdbResults,
        hltb: hltbResults,
        sc: scResults,
        mc: mcResults,
        oc: ocResults,
        steam: steamResults,
        itad: itadResults
    }

    return json(results);
}