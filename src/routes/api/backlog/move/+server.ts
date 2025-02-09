import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";

export async function POST({ request, locals }: any) {
    const { user } = locals;
	const userInst = User.deserialize(user);
    const { fromBacklogId, toBacklogId, artifactId, keepTags } = await request.json();
    let authorization = await BacklogDB.canEditBacklog(userInst, fromBacklogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    authorization = await BacklogDB.canEditBacklog(userInst, toBacklogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    try {
        await BacklogDB.moveItemToOtherBacklog(fromBacklogId, toBacklogId, artifactId, keepTags);
        return json({ result: 'ok' });
    } catch (e: any) {
        return error(500, e.message);
    }
}