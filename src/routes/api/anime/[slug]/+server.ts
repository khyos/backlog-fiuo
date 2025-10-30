import { User, UserRights } from "$lib/model/User";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { AnimeDB } from "$lib/server/model/anime/AnimeDB";

export async function GET({ params }: RequestEvent) {
	const animeId = parseInt(params.slug);
	const anime = await AnimeDB.getById(animeId, true);
	if (anime) {
		return json(anime.toJSON());
	}
	error(404, 'Not found');
}

export async function DELETE({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.DELETE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
	const animeId = parseInt(params.slug);
    await AnimeDB.deleteAnime(animeId);
    return json({ deleted: animeId });
}