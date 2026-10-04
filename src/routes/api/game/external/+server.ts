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
    const query: string = url.searchParams.get('query') ?? '';

    const [igdbResults, hltbResults, scResults, mcResults, ocResults, steamResults, itadResults] = await Promise.all([
        searchExternal(() => IGDB.searchGame(query)),
        searchExternal(() => HLTB.searchGame(query)),
        searchExternal(() => SensCritique.searchGame(query)),
        searchExternal(() => MetaCritic.searchGame(query)),
        searchExternal(() => OpenCritic.searchGame(query)),
        searchExternal(() => Steam.searchGame(query)),
        searchExternal(() => ITAD.searchGame(query))
    ]);

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
