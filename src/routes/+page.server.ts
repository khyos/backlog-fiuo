import { User, UserRights } from '$lib/model/User.js';
import { BacklogDB } from '$lib/server/model/BacklogDB.js';

/** @type {import('./$types').PageLoad} */
export async function load({ url, locals }: any) {
	const { user } = locals;
	const userInst = User.deserialize(user);
	const page = url.searchParams.get('page') ?? 0;
	const backlogs = await BacklogDB.getBacklogs(userInst.id, page, 10, null);
	return {
		backlogs: backlogs.map(backlog => backlog.serialize()),
		canEdit: userInst.hasRight(UserRights.EDIT_BACKLOG),
		canCreate: userInst.hasRight(UserRights.CREATE_BACKLOG)
	};
}