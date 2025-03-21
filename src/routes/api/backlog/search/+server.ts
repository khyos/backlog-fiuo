import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ locals, url }: RequestEvent) {
	const user = User.deserialize(locals.user);
    const page: number = parseInt(url.searchParams.get('page') ?? '0', 10);
    const pageSize: number = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const artifactType: string | null = url.searchParams.get('artifactType') ?? null;
    const query : string = url.searchParams.get('query') ?? '';
    const backlogs = await BacklogDB.getBacklogs(user.id, page, pageSize, artifactType, query);
    const serializedBacklogs = backlogs.map(backlog => backlog.toJSON());
    return json(serializedBacklogs);
}