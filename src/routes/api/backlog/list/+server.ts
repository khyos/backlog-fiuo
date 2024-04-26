import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { json } from "@sveltejs/kit";

export async function POST({ request, locals }: any) {
	const { user } = locals;
	const { page } = await request.json();
	const userInst = User.deserialize(user);
	const backlogs = await BacklogDB.getBacklogs(userInst.id, page, 10);
	return json(backlogs.map((backlog => backlog.serialize())));
}