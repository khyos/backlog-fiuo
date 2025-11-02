import { User, UserRights } from '$lib/model/User.js';
import { DBUtil } from '$lib/util/DBUtil.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (async ({ locals }) => {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.BOOTSTRAP)) {
        return error(403, "Forbidden");
    }
	DBUtil.initDb();
});