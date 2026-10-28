import { User } from "#lib/model/User";
import { TierListDB } from "#lib/server/model/TierListDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ErrorUtil } from "#lib/util/ErrorUtil";

export async function PATCH({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const tierListId = parseInt(params.slug);
    const authorization = await TierListDB.canEditTierList(user, tierListId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    const { tiers } = await request.json();
    if (!Array.isArray(tiers) || tiers.length < 1) {
        return error(400, 'A tier list must have at least one tier');
    }
    try {
        await TierListDB.replaceTiers(tierListId, tiers);
        const tierList = await TierListDB.getTierListByIdWithItems(tierListId);
        return json(tierList!.toJSON());
    } catch (e) {
        return error(500, ErrorUtil.getErrorMessage(e));
    }
}
