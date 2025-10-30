import { ArtifactType } from '$lib/model/Artifact.js';
import { GameDB } from '$lib/server/model/game/GameDB';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '$lib/model/User';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';
import { AnimeDB } from '$lib/server/model/anime/AnimeDB';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const artifactTypeSlug = params.slug;
	if (!artifactTypeSlug) {
		error(400, 'Invalid type');
	}

	// Convert string to ArtifactType enum
	let artifactType: ArtifactType;
	if (artifactTypeSlug === 'game') {
		artifactType = ArtifactType.GAME;
	} else if (artifactTypeSlug === 'movie') {
		artifactType = ArtifactType.MOVIE;
	} else if (artifactTypeSlug === 'tvshow') {
		artifactType = ArtifactType.TVSHOW;
	} else if (artifactTypeSlug === 'anime') {
		artifactType = ArtifactType.ANIME;
	} else {
		error(400, 'Invalid artifact type');
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
		return await GameDB.getGenreDefinitions();
	} 
	else if (artifactType === ArtifactType.MOVIE) {
		return await MovieDB.getGenreDefinitions();
	}
	else if (artifactType === ArtifactType.TVSHOW) {
		return await TvshowDB.getGenreDefinitions();
	}
	else if (artifactType === ArtifactType.ANIME) {
		return await AnimeDB.getGenreDefinitions();
	}
	return [];
}

async function fetchPlatforms(artifactType: ArtifactType) {
	if (artifactType === ArtifactType.GAME) {
		return await GameDB.getAllPlatforms();
	} 
	return [];
}