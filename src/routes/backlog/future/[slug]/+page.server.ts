import { ArtifactType } from '$lib/model/Artifact.js';
import { BacklogDB } from '$lib/server/model/BacklogDB';
import { GameDB } from '$lib/server/model/game/GameDB';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { error } from '@sveltejs/kit';
import type { ServerLoadEvent } from '@sveltejs/kit';
import { User, UserRights } from '$lib/model/User';
import type { Tag } from '$lib/model/Tag';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';
import { AnimeDB } from '$lib/server/model/anime/AnimeDB';

export const load = async ({ params, locals }: ServerLoadEvent) => {
	const artifactTypeParam = params.slug;
	if (!artifactTypeParam || !Object.values(ArtifactType).includes(artifactTypeParam as ArtifactType)) {
		error(400, 'Invalid artifact type');
	}

	const artifactType = artifactTypeParam as ArtifactType;
	const user = User.deserialize(locals.user);

	if (user.id < 0) {
		error(401, 'Please sign in to access your future list');
	}

	const backlog = await BacklogDB.getVirtualFutureBacklog(user.id, artifactType);
	if (!backlog) {
		error(404, 'Future list not found');
	}

	const backlogTags = extractUniqueTagsFromBacklog(backlog);
	const genres = await fetchGenres(artifactType);
	const platforms = await fetchPlatforms(artifactType);
	
	return {
		backlog: backlog.toJSON(),
		backlogTags: backlogTags.map(backlogTag => backlogTag.toJSON()),
		genres: genres.map(genre => genre.toJSON()),
		platforms: platforms.map(platform => platform.toJSON()),
		canEdit: user.hasRight(UserRights.EDIT_BACKLOG)
	};
}

function extractUniqueTagsFromBacklog(backlog: { backlogItems: Array<{ tags: Tag[] }> }) {
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