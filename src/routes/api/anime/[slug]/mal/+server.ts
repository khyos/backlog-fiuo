import { LinkType } from "$lib/model/Link";
import { MAL } from "$lib/mal/MAL";
import { error, json } from "@sveltejs/kit";
import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import { User } from "$lib/model/User";
import type { RequestEvent } from "./$types";

export async function GET({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, 'Unauthorized');
    }
    const animeId = parseInt(params.slug);
	const anime = await AnimeDB.getById(animeId);
	if (anime?.links) {
		const link = anime.links.find(link => link.type === LinkType.MAL);
        if (link) {
            const malAnime = await MAL.getAnime(link.url);
            if (malAnime) {
                return json(malAnime);
            }
        }
	}
	return error(404, 'Not found');
}