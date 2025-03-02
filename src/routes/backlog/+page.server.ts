import { User, UserRights } from '$lib/model/User.js';
import { BacklogDB } from '$lib/server/model/BacklogDB.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const { user } = locals;
	const userInst = User.deserialize(user);
	const page = parseInt(url.searchParams.get('page') ?? '0', 10);
	const backlogs = await BacklogDB.getBacklogs(userInst.id, page, 10, null);
	return {
		backlogs: backlogs.map(backlog => backlog.serialize()),
		permissions: {
			canEdit: userInst.hasRight(UserRights.EDIT_BACKLOG),
			canCreate: userInst.hasRight(UserRights.CREATE_BACKLOG)
		}
	};
}