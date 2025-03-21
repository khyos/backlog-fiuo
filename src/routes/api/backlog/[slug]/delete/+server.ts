import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "../$types";

export async function POST({ params, request, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
    const backlogId = parseInt(params.slug);
    const authorization = await BacklogDB.canEditBacklog(user, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
	const { artifactId } = await request.json();
    await BacklogDB.deleteBacklogItem(backlogId, artifactId);
    return json({
        status: 201,
        body: { deleted: artifactId }
    });
}