import { BacklogDB } from '$lib/server/model/BacklogDB';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { BacklogUtil } from '$lib/server/model/BacklogUtil';
import { ArtifactType } from '$lib/model/Artifact';
import { User } from '$lib/model/User';

const COMPATIBLE_ARTIFACT_TYPES: ArtifactType[] = [
	ArtifactType.ANIME,
	ArtifactType.GAME,
	ArtifactType.MOVIE,
	ArtifactType.TVSHOW
];

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = User.deserialize(locals.user);
	if (!user) {
		error(401, 'Not authorized');
	}

	const artifactType: ArtifactType = params.slug as ArtifactType;
	if (COMPATIBLE_ARTIFACT_TYPES.indexOf(artifactType) === -1) {
		error(400, 'Invalid artifact type for future backlog');
	}
	let backlogId = await BacklogDB.getFutureBacklogIdForUser(user.id, artifactType);
	if (!backlogId) {
		backlogId = await BacklogDB.createFutureBacklogForUser(user.id, artifactType);
	}

	const backlogPageInfo = await BacklogUtil.loadBacklogPageInfo(backlogId, locals);
	if (!backlogPageInfo) {
		error(404, 'Backlog not found');
	}
	return backlogPageInfo;
}

