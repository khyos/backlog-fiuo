import { User, UserRights } from '$lib/model/User.js';
import { DBUtil } from '$lib/util/DBUtil.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ locals }) {
	const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.BOOTSTRAP)) {
        return error(403, "Forbidden");
    }
	DBUtil.initDb();
}