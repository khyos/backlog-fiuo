import { User } from "#lib/model/User";
import { TierListDB } from "#lib/server/model/TierListDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
    const tierListId = parseInt(params.slug);
    const tierList = await TierListDB.getTierListByIdWithItems(tierListId);
    if (!tierList) {
        return error(404, 'Not found');
    }
    return json(tierList.toJSON());
}

export async function DELETE({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const tierListId = parseInt(params.slug);
    const authorization = await TierListDB.canEditTierList(user, tierListId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    await TierListDB.deleteTierList(tierListId);
    return json({ success: true });
}
