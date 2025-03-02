import { ArtifactType } from '$lib/model/Artifact.js';
import { Platform } from '$lib/model/game/Platform';
import { BacklogDB } from '$lib/server/model/BacklogDB';
import { GameDB } from '$lib/server/model/game/GameDB';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';
import type { Backlog } from '$lib/model/Backlog';

export const load: PageServerLoad = async ({ params, locals }) => {
	const backlogId = parseInt(params.slug);
	if (isNaN(backlogId)) {
		error(400, 'Invalid backlog ID');
	}

	const userInst = User.deserialize(locals.user);

	const backlog = await BacklogDB.getBacklogByIdWithItems(backlogId);
	if (!backlog) {
		error(404, 'Backlog not found');
	}

	const backlogTags = extractUniqueTagsFromBacklog(backlog);
	const genres = await fetchGenres(backlog.artifactType);
	const platforms = await fetchPlatforms(backlog.artifactType);
	
	return {
		backlog: backlog.serialize(),
		backlogTags: backlogTags.map(tag => { return { value: tag, name: tag }; } ),
		genres: genres,
		platforms: platforms,
		canEdit: userInst.hasRight(UserRights.EDIT_BACKLOG) && backlog.userId === userInst.id
	};
}

function extractUniqueTagsFromBacklog(backlog: Backlog) {
	const backlogTags: string[] = [];
	
	for (const item of backlog.backlogItems) {
		for (const tag of item.tags) {
			if (!backlogTags.includes(tag.id)) {
				backlogTags.push(tag.id);
			}
		}
	}
	
	return backlogTags;
}

async function fetchGenres(artifactType: ArtifactType) {
	let genres: { value: number; name: string }[] = [];
	
	if (artifactType === ArtifactType.GAME) {
		const allGenres = await GameDB.getAllGenres();
		genres = allGenres.map(genre => ({ value: genre.id, name: genre.title }));
	} 
	else if (artifactType === ArtifactType.MOVIE) {
		const allGenres = await MovieDB.getAllGenres();
		genres = allGenres.map(genre => ({ value: genre.id, name: genre.title }));
	}
	
	return genres;
}

async function fetchPlatforms(artifactType: ArtifactType) {
	let platforms: { value: number; name: string }[] = [];
	
	if (artifactType === ArtifactType.GAME) {
		const allPlatforms: Platform[] = await GameDB.getAllPlatforms();
		platforms = allPlatforms.map(platform => ({ value: platform.id, name: platform.title }));
	} 
	return platforms;
}