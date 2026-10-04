import { error } from '@sveltejs/kit';
import { User, UserRights } from '$lib/model/User';
import { getServerLogs } from '$lib/server/ServerLog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.BOOTSTRAP)) {
        error(403, 'Only administrators can view server logs');
    }

    return { logs: getServerLogs() };
};