import { ArtifactType } from '$lib/model/Artifact.js';
import { GameDB } from '$lib/server/model/game/GameDB';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '$lib/model/User';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const artifactType = params.slug;
	if (!artifactType) {
		error(400, 'Invalid type');
	}

	const user = User.deserialize(locals.user);

	if (user.id < 0) {
		error(400, 'Please connect to see your list');
	}

	const list = await ArtifactDB.getUserList(user.id, artifactType);

	const genres = await fetchGenres(artifactType);
	const platforms = await fetchPlatforms(artifactType);
	
	return {
		list: list.toJSON(),
		genres: genres.map(genre => genre.toJSON()),
		platforms: platforms.map(platform => platform.toJSON())
	};
}

async function fetchGenres(artifactType: ArtifactType) {
	if (artifactType === ArtifactType.GAME) {
		return await GameDB.getAllGenres();
	} 
	else if (artifactType === ArtifactType.MOVIE) {
		return await MovieDB.getAllGenres();
	}
	else if (artifactType === ArtifactType.TVSHOW) {
		return await TvshowDB.getAllGenres();
	}
	return [];
}

async function fetchPlatforms(artifactType: ArtifactType) {
	if (artifactType === ArtifactType.GAME) {
		return await GameDB.getAllPlatforms();
	} 
	return [];
}