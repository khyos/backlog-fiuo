import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '$lib/model/User';
import { AnimeDB } from '$lib/server/model/anime/AnimeDB';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';
import { UserList } from '$lib/model/UserList';
import { ArtifactType, type Artifact } from '$lib/model/Artifact';
import { processOngoingArtifacts } from '$lib/util/OngoingUtil';

export const load: PageServerLoad = async ({ params, locals }) => {
	const artifactType = params.slug;
	if (!artifactType) {
		error(400, 'Invalid type');
	}

	const user = User.deserialize(locals.user);

	if (user.id < 0) {
		error(400, 'Please connect to see your list');
	}

	let items: Artifact[] = [];
	let validArtifactType: ArtifactType;

	if (artifactType === 'tvshow') {
		validArtifactType = ArtifactType.TVSHOW;
		const tvshows = await TvshowDB.getUserOngoingTvShows(user.id, true);
		items = await processOngoingArtifacts(user.id, tvshows);
	} else if (artifactType === 'anime') {
		validArtifactType = ArtifactType.ANIME;
		const animes = await AnimeDB.getUserOngoingAnimes(user.id, true);
		items = await processOngoingArtifacts(user.id, animes);
	} else {
		error(400, 'Invalid artifact type');
	}

	const userList = new UserList(user.id, validArtifactType, items);
	
	return {
		list: userList.toJSON()
	};
}