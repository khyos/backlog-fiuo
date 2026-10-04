import { MAL } from "$lib/mal/MAL";
import { User, UserRights } from "$lib/model/User";
import { SensCritique } from "$lib/senscritique/SensCritique";
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

    const [malResults, scResults] = await Promise.all([
        searchExternal(() => MAL.searchAnime(query)),
        searchExternal(() => SensCritique.searchTvshow(query))
    ]);

    const results = {
        mal: malResults,
        sc: scResults
    }

    return json(results);
}
