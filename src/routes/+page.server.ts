import { User, UserRights } from '$lib/model/User.js';
import { BacklogDB } from '$lib/server/model/BacklogDB.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = User.deserialize(locals.user);
	const page = parseInt(url.searchParams.get('page') ?? '0', 10);
	const backlogs = await BacklogDB.getBacklogs(user.id, page, 10, null);
	return {
		backlogs: backlogs.map(backlog => backlog.toJSON()),
		permissions: {
			canEdit: user.hasRight(UserRights.EDIT_BACKLOG),
			canCreate: user.hasRight(UserRights.CREATE_BACKLOG)
		}
	};
}