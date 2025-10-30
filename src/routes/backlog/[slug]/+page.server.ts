import { ArtifactType } from '$lib/model/Artifact.js';
import { BacklogDB } from '$lib/server/model/BacklogDB';
import { GameDB } from '$lib/server/model/game/GameDB';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';
import type { Backlog } from '$lib/model/Backlog';
import type { Tag } from '$lib/model/Tag';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';
import { AnimeDB } from '$lib/server/model/anime/AnimeDB';

export const load: PageServerLoad = async ({ params, locals }) => {
	const backlogId = parseInt(params.slug);
	if (isNaN(backlogId)) {
		error(400, 'Invalid backlog ID');
	}

	const user = User.deserialize(locals.user);

	const backlog = await BacklogDB.getBacklogByIdWithItems(backlogId);
	if (!backlog) {
		error(404, 'Backlog not found');
	}

	const backlogTags = extractUniqueTagsFromBacklog(backlog);
	const genres = await fetchGenres(backlog.artifactType);
	const platforms = await fetchPlatforms(backlog.artifactType);
	
	return {
		backlog: backlog.toJSON(),
		backlogTags: backlogTags.map(backlogTag => backlogTag.toJSON()),
		genres: genres.map(genre => genre.toJSON()),
		platforms: platforms.map(platform => platform.toJSON()),
		canEdit: user.hasRight(UserRights.EDIT_BACKLOG) && backlog.userId === user.id
	};
}

function extractUniqueTagsFromBacklog(backlog: Backlog) {
	const backlogTags: Tag[] = [];
	
	for (const item of backlog.backlogItems) {
		for (const tag of item.tags) {
			if (!backlogTags.some(backlogTag => backlogTag.id === tag.id)) {
				backlogTags.push(tag);
			}
		}
	}
	
	return backlogTags;
}

async function fetchGenres(artifactType: ArtifactType) {
	if (artifactType === ArtifactType.ANIME) {
		return await AnimeDB.getGenreDefinitions();
	}
	else if (artifactType === ArtifactType.GAME) {
		return await GameDB.getGenreDefinitions();
	} 
	else if (artifactType === ArtifactType.MOVIE) {
		return await MovieDB.getGenreDefinitions();
	}
	else if (artifactType === ArtifactType.TVSHOW) {
		return await TvshowDB.getGenreDefinitions();
	}
	return [];
}

async function fetchPlatforms(artifactType: ArtifactType) {
	if (artifactType === ArtifactType.GAME) {
		return await GameDB.getAllPlatforms();
	} 
	return [];
}