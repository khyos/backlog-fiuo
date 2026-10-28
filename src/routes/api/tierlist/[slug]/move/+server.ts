import { User } from "#lib/model/User";
import { TierListDB } from "#lib/server/model/TierListDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ErrorUtil } from "#lib/util/ErrorUtil";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const tierListId = parseInt(params.slug);
    const authorization = await TierListDB.canEditTierList(user, tierListId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    const { artifactId, targetTierId, targetPosition } = await request.json();
    try {
        await TierListDB.moveItem(tierListId, artifactId, targetTierId ?? null, targetPosition);
        return json({ success: true });
    } catch (e) {
        return error(500, ErrorUtil.getErrorMessage(e));
    }
}
