import { ArtifactType } from '$lib/model/Artifact';
import { User, UserRights } from '$lib/model/User.js';
import { BacklogDB } from '$lib/server/model/BacklogDB.js';
import { error, redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	'do': async ({ locals, request }) => {
		const { user } = locals;
		const userInst = User.deserialize(user);
		if (!userInst.hasRight(UserRights.CREATE_BACKLOG)) {
			return error(403, "Not authorized");
		}
		const data = await request.formData();
		const title = data.get('title') as string;
		const artifactType = data.get('artifactType') as ArtifactType;
		const backlog = await BacklogDB.createBacklog(0, title, artifactType);
		if (backlog) {
			throw redirect(307, `/backlog/${backlog.id}`);
		} else {
			error(500, 'Failed to create backlog');
		}
	}
};