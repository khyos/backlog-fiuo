import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
	const backlogId = parseInt(params.slug);
	const backlog = await BacklogDB.getBacklogByIdWithItems(backlogId);
	if (backlog) {
		return json(backlog.serialize());
	}
	error(404, 'Not found');
}

export async function DELETE({ params, locals }: RequestEvent) {
	const { user } = locals;
	const userInst = User.deserialize(user);
	const backlogId = parseInt(params.slug);
	const authorization = await BacklogDB.canEditBacklog(userInst, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    await BacklogDB.deleteBacklog(backlogId);
    return json({ deleted: backlogId });
}