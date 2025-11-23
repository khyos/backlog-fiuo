import { BacklogDB } from '$lib/server/model/BacklogDB';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { BacklogUtil } from '$lib/server/model/BacklogUtil';
import { ArtifactType } from '$lib/model/Artifact';
import { User } from '$lib/model/User';
import { AnimeDB } from '$lib/server/model/anime/AnimeDB';
import { GameDB } from '$lib/server/model/game/GameDB';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';

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
		error(400, 'Invalid artifact type for current backlog');
	}
	let backlogId = await BacklogDB.getCurrentBacklogIdForUser(user.id, artifactType);
	if (!backlogId) {
		backlogId = await BacklogDB.createCurrentBacklogForUser(user.id, artifactType);
	}

	const backlogPageInfo = await BacklogUtil.loadBacklogPageInfo(backlogId, locals);
	if (!backlogPageInfo) {
		error(404, 'Backlog not found');
	}

	const suggestedArtifactsDB = await BacklogDB.getCurrentSuggestedArtifacts(user.id, artifactType, backlogId);
	const suggestedArtifacts = suggestedArtifactsDB.map((artifactDB) => {
		if (artifactDB.type === ArtifactType.ANIME) {
			return AnimeDB.deserialize(artifactDB);
		} else if (artifactDB.type === ArtifactType.GAME) {
			return GameDB.deserialize(artifactDB);
		} else if (artifactDB.type === ArtifactType.MOVIE) {
			return MovieDB.deserialize(artifactDB);
		} else if (artifactDB.type === ArtifactType.TVSHOW) {
			return TvshowDB.deserialize(artifactDB);
		}
		return null;
	}).filter(artifact => artifact !== null);

	return {
		...backlogPageInfo,
		suggestedArtifacts: suggestedArtifacts.map(artifact => artifact.toJSON())
	};
}

