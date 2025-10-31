import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "../$types";
import { ErrorUtil } from "$lib/util/ErrorUtil";

export async function POST({ params, request, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
    const backlogId = parseInt(params.slug);
    const authorization = await BacklogDB.canEditBacklog(user, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
	const { artifactId } = await request.json();
    try {
        const rank = await BacklogDB.getBacklogMaxRank(backlogId);
        const backlogItemId = await BacklogDB.addBacklogItem(backlogId, artifactId, rank + 1);
        return json({ backlogItemId });
    } catch (e) {
        return error(500, ErrorUtil.getErrorMessage(e));
    }
}