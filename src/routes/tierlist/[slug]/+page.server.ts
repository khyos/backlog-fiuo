import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { TierListUtil } from '#lib/server/model/TierListUtil';

export const load: PageServerLoad = async ({ params, locals }) => {
	const tierListId = parseInt(params.slug);
	if (isNaN(tierListId)) {
		error(400, 'Invalid tier list ID');
	}

	const tierListPageInfo = await TierListUtil.loadTierListPageInfo(tierListId, locals);
	if (!tierListPageInfo) {
		error(404, 'Tier list not found');
	}
	return tierListPageInfo;
}
