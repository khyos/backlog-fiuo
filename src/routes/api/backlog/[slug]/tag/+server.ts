import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { BacklogItemDB } from "$lib/server/model/BacklogItemDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
    const backlogId = parseInt(params.slug);
    const authorization = await BacklogDB.canEditBacklog(user, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
	const { artifactId, tagId } = await request.json();
    await BacklogItemDB.addTag(backlogId, artifactId, tagId);
    return json({ success: true });
}

export async function DELETE({ params, request, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
    const backlogId = parseInt(params.slug);
    const authorization = await BacklogDB.canEditBacklog(user, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    const { artifactId, tagId } = await request.json();
    await BacklogItemDB.removeTag(backlogId, artifactId, tagId);
    return json({ deleted: artifactId });
}