import { User } from "#lib/model/User";
import { BacklogDB } from "#lib/server/model/BacklogDB";
import { TierListUtil } from "#lib/server/model/TierListUtil";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const { backlogId } = await request.json();
    const authorization = await BacklogDB.canEditBacklog(user, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    const id = await TierListUtil.createTierListFromBacklog(user, backlogId);
    if (id == null) {
        return error(500, 'Failed to create tier list');
    }
    return json({ id });
}
