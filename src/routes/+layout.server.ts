import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const user = locals.user;

	return {
		user: user?.serialize()
	};
}) satisfies LayoutServerLoad;