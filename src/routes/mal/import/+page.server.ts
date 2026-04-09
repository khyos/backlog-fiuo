import { User, UserRights } from '$lib/model/User';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (!user.hasRight(UserRights.SENSCRITIQUE_EXPORT)) {
		return error(403, 'Forbidden');
	}
	return { user: user.toJSON() };
}) satisfies PageServerLoad;
