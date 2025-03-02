import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "../$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const { user } = locals;
	const userInst = User.deserialize(user);
    const backlogId = parseInt(params.slug);
    const authorization = await BacklogDB.canEditBacklog(userInst, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
	const { artifactId } = await request.json();
    try {
        const rank = await BacklogDB.getBacklogMaxRank(backlogId);
        const backlogItemId = await BacklogDB.addBacklogItem(backlogId, artifactId, rank + 1);
        return json({ backlogItemId });
    } catch (e) {
        return error(500, e instanceof Error ? e.message : 'Unknown Error');
    }
}