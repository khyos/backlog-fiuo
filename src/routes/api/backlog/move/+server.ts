import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ErrorUtil } from "$lib/util/ErrorUtil";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const { fromBacklogId, toBacklogId, artifactId, keepTags } = await request.json();
    let authorization = await BacklogDB.canEditBacklog(user, fromBacklogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    authorization = await BacklogDB.canEditBacklog(user, toBacklogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    try {
        await BacklogDB.moveItemToOtherBacklog(fromBacklogId, toBacklogId, artifactId, keepTags);
        return json({ result: 'ok' });
    } catch (e) {
        return error(500, ErrorUtil.getErrorMessage(e));
    }
}