import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ArtifactType } from "$lib/model/Artifact";

export async function GET({ url, locals }: RequestEvent) {
	const { user } = locals;
	const page : number = parseInt(url.searchParams.get('page') ?? '0', 10);
    const pageSize : number = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
	const artifactType = url.searchParams.get('artifactType') as ArtifactType | null;
	if (artifactType !== null && !Object.values(ArtifactType).includes(artifactType)) {
		return error(500, 'invalid artifactType');
	}
	const userInst = User.deserialize(user);
	const backlogs = await BacklogDB.getBacklogs(userInst.id, page, pageSize, artifactType);
	return json(backlogs.map((backlog => backlog.serialize())));
}