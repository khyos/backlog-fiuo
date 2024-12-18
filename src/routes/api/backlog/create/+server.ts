import { User, UserRights } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";

export async function POST({ request, locals }: any) {
    const { user } = locals;
	const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.CREATE_BACKLOG)) {
        return error(403, "Not authorized");
    }
	const { title, artifactType, rankingType } = await request.json();
    const backlog = await BacklogDB.createBacklog(userInst.id, title, artifactType, rankingType);
    if (backlog) {
        return json(backlog.serialize());
    } else {
        error(500, 'Failed to create backlog');
    }
}