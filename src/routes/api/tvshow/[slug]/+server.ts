import { User, UserRights } from "$lib/model/User";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";

export async function GET({ params }: RequestEvent) {
	const tvshowId = parseInt(params.slug);
	const tvshow = await TvshowDB.getById(tvshowId, true, true);
	if (tvshow) {
		return json(tvshow.toJSON());
	}
	error(404, 'Not found');
}

export async function DELETE({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.DELETE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
	const tvshowId = parseInt(params.slug);
    await TvshowDB.deleteTvshow(tvshowId);
    return json({ deleted: tvshowId });
}