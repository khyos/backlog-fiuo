import { User } from "#lib/model/User";
import { TierListDB } from "#lib/server/model/TierListDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const tierListId = parseInt(params.slug);
    if (isNaN(tierListId)) return error(400, 'Invalid id');
    const authorization = await TierListDB.canEditTierList(user, tierListId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    const tierList = await TierListDB.getTierListById(tierListId);
    if (!tierList) return error(404, 'Not found');
    if (tierList.isStandalone) {
        return error(400, 'Already standalone');
    }
    await TierListDB.unlinkFromBacklog(tierListId);
    const updated = await TierListDB.getTierListByIdWithItems(tierListId);
    if (!updated) return error(404, 'Not found');
    return json(updated.toJSON());
}
