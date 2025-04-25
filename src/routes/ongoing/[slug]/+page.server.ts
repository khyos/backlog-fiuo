import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '$lib/model/User';
import { TvshowDB } from '$lib/server/model/tvshow/TvshowDB';
import { UserList } from '$lib/model/UserList';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';
import { UserArtifactStatus } from '$lib/model/UserArtifact';

export const load: PageServerLoad = async ({ params, locals }) => {
	const artifactType = params.slug;
	if (!artifactType) {
		error(400, 'Invalid type');
	}

	const user = User.deserialize(locals.user);

	if (user.id < 0) {
		error(400, 'Please connect to see your list');
	}

	const tvshows = await TvshowDB.getUserOngoingTvShows(user.id, true);
	const allArtifactIds: number[] = [];
	tvshows.forEach(tvshow => {
		allArtifactIds.push(...tvshow.getArtifactIds());
	});
	const userInfos = await ArtifactDB.getUserInfos(user.id, allArtifactIds);
	tvshows.forEach(tvshow => {
		tvshow.setUserInfos(Object.fromEntries(
			userInfos.map(userInfo => [userInfo.artifactId, userInfo])
		));
		tvshow.computeLastAndNextOngoing();
	});
	tvshows.sort((a, b) => {
		if (a.userInfo?.status !== b.userInfo?.status) {
			if (a.userInfo?.status === UserArtifactStatus.ON_GOING) {
				return -1
			} else {
				return 1;
			}
		}
		const aNext = a.lastAndNextOngoing.next;
		const bNext = b.lastAndNextOngoing.next;
		if (aNext === null && bNext === null) {
			return a.title.localeCompare(b.title);
		} else if (aNext === null) {
			return 1;
		} else if (bNext === null) {
			return -1;
		}
		return aNext.releaseDate < bNext.releaseDate ? -1 : 1;
	});

	const userList = new UserList(user.id, artifactType, tvshows);
	
	return {
		list: userList.toJSON()
	};
}