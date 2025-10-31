import { MAL } from "$lib/mal/MAL";
import { User, UserRights } from "$lib/model/User";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ErrorUtil } from "$lib/util/ErrorUtil";

export async function GET({ url, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const query : string = url.searchParams.get('query') ?? '';

    let malResults;
    try {
        malResults = await MAL.searchAnime(query);
    } catch (error) {
        malResults = {
            error: ErrorUtil.getErrorMessage(error)
        }
    }

    let scResults;
    try {
        scResults = await SensCritique.searchTvshow(query); // Assuming they have anime/tv shows
    } catch (error) {
        scResults = {
            error: ErrorUtil.getErrorMessage(error)
        }
    }

    const results = {
        mal: malResults,
        sc: scResults
    }

    return json(results);
}