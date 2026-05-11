import { User } from "$lib/model/User";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
	const backlogId = parseInt(params.slug);
	const backlog = await BacklogDB.getBacklogByIdWithItems(backlogId);
	if (backlog) {
		if (user.id !== -1) {
			const artifactIds = backlog.backlogItems.map(item => item.artifact.id);
			if (artifactIds.length > 0) {
				const userInfos = await ArtifactDB.getUserInfos(user.id, artifactIds);
				const userInfoMap = Object.fromEntries(userInfos.map(ui => [ui.artifactId, ui]));
				backlog.backlogItems.forEach(item => item.artifact.setUserInfos(userInfoMap));
			}
		}
		return json(backlog.toJSON());
	}
	error(404, 'Not found');
}

export async function DELETE({ params, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
	const backlogId = parseInt(params.slug);
	const authorization = await BacklogDB.canEditBacklog(user, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    await BacklogDB.deleteBacklog(backlogId);
    return json({ deleted: backlogId });
}