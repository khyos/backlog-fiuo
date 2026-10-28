import { User } from "#lib/model/User";
import { TierListDB } from "#lib/server/model/TierListDB";
import { TierListUtil } from "#lib/server/model/TierListUtil";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const tierListId = parseInt(params.slug);
    const authorization = await TierListDB.canEditTierList(user, tierListId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    const result = await TierListUtil.refreshFromBacklog(tierListId);
    return json(result);
}
