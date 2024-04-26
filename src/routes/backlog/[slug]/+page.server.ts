import { ArtifactType } from '$lib/model/Artifact.js';
import { Platform } from '$lib/model/game/Platform';
import { BacklogDB } from '$lib/server/model/BacklogDB';
import { GameDB } from '$lib/server/model/game/GameDB';
import { MovieDB } from '$lib/server/model/movie/MovieDB';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User, UserRights } from '$lib/model/User';

export const load = (async ({ params, locals }: any) => {
	const { user } = locals;
	const userInst = User.deserialize(user);
	const backlogId = parseInt(params.slug);
	const backlog = await BacklogDB.getBacklogById(backlogId);
	if (backlog) {
		const backlogTags: string[] = [];
		for (const item of backlog.backlogItems) {
			for (const tag of item.tags) {
				if (!backlogTags.includes(tag.id)) {
					backlogTags.push(tag.id);
				}
			}
		}
		let genres: {
			value: number;
			name: string;
		}[] = [];
		let platforms: {
			value: number;
			name: string;
		}[] = [];
		if (backlog?.artifactType === ArtifactType.GAME) {
			const allGenres = await GameDB.getAllGenres();
			genres = allGenres.map(genre => { return { value: genre.id, name: genre.title }; } );
			const allPlatforms: Platform[] = await GameDB.getAllPlatforms();
			platforms = allPlatforms.map(platform => { return { value: platform.id, name: platform.title }; } );
		} else if (backlog?.artifactType === ArtifactType.MOVIE) {
			const allGenres = await MovieDB.getAllGenres();
			genres = allGenres.map(genre => { return { value: genre.id, name: genre.title }; } );
		}
		return {
			backlog: backlog.serialize(),
			backlogTags: backlogTags.map(tag => { return { value: tag, name: tag }; } ),
			genres: genres,
			platforms: platforms,
			canEdit: userInst.hasRight(UserRights.EDIT_BACKLOG) && backlog.userId === userInst.id
		};
	}
	error(404, 'Not found');
}) satisfies PageServerLoad;