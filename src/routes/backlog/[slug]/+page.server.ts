import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { BacklogUtil } from '$lib/server/model/BacklogUtil';

export const load: PageServerLoad = async ({ params, locals }) => {
	const backlogId = parseInt(params.slug);
	if (isNaN(backlogId)) {
		error(400, 'Invalid backlog ID');
	}

	const backlogPageInfo = await BacklogUtil.loadBacklogPageInfo(backlogId, locals);
	if (!backlogPageInfo) {
		error(404, 'Backlog not found');
	}
	return backlogPageInfo;
}