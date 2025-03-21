import { User } from '$lib/model/User';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const user = User.deserialize(locals.user);

	return {
		user: user.toJSON()
	};
}) satisfies LayoutServerLoad;