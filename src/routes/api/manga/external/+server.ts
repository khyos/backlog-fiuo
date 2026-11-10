import { MAL } from "#lib/mal/MAL";
import { User, UserRights } from "#lib/model/User";
import { SensCritique } from "#lib/senscritique/SensCritique";
import { ErrorUtil } from "#lib/util/ErrorUtil";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ url, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const query: string = url.searchParams.get('query') ?? '';

    let malResults;
    try {
        malResults = await MAL.searchManga(query);
    } catch (err) {
        malResults = { error: ErrorUtil.getErrorMessage(err) };
    }

    let scResults;
    try {
        scResults = await SensCritique.searchBD(query);
    } catch (err) {
        scResults = { error: ErrorUtil.getErrorMessage(err) };
    }

    return json({ mal: malResults, sc: scResults });
}
