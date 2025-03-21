import { User, UserRights } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ request, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_BACKLOG)) {
        return error(403, "Not authorized");
    }
	const { title, artifactType, rankingType } = await request.json();
    const backlog = await BacklogDB.createBacklog(user.id, title, artifactType, rankingType);
    if (backlog) {
        return json(backlog.toJSON());
    } else {
        return error(500, 'Failed to create backlog');
    }
}