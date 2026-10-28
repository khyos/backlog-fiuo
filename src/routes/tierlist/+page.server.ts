import { User, UserRights } from '#lib/model/User.js';
import { TierListDB } from '#lib/server/model/TierListDB.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = User.deserialize(locals.user);
	const page = parseInt(url.searchParams.get('page') ?? '0', 10);
	const tierLists = await TierListDB.getTierLists(user.id, page, 10);
	return {
		tierLists: tierLists.map(tierList => tierList.toJSON()),
		permissions: {
			canEdit: user.hasRight(UserRights.EDIT_BACKLOG)
		}
	};
}
