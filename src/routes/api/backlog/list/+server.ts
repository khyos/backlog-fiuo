import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { json } from "@sveltejs/kit";

export async function GET({ url, locals }: any) {
	const { user } = locals;
	const page : number = url.searchParams.get('page') ?? 0;
    const pageSize : number = url.searchParams.get('pageSize') ?? 10;
	const artifactType : string = url.searchParams.get('artifactType') ?? null;
	const userInst = User.deserialize(user);
	const backlogs = await BacklogDB.getBacklogs(userInst.id, page, pageSize, artifactType);
	return json(backlogs.map((backlog => backlog.serialize())));
}