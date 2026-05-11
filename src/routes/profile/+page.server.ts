import { User } from '$lib/model/User';
import { SubscriptionServiceDB } from '$lib/server/model/SubscriptionServiceDB';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = User.deserialize(locals.user);
	if (user.id < 0) {
		error(401, 'Unauthorized');
	}

	const [allServices, userSubscriptions] = await Promise.all([
		SubscriptionServiceDB.getAllServices(),
		SubscriptionServiceDB.getUserSubscriptions(user.id)
	]);

	return {
		user: user.toJSON(),
		allServices: allServices.map(s => s.toJSON()),
		userSubscriptionIds: userSubscriptions.map(s => s.id)
	};
};
