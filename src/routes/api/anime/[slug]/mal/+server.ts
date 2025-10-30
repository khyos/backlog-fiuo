import { LinkType } from "$lib/model/Link";
import { MAL } from "$lib/mal/MAL";
import { error, json } from "@sveltejs/kit";
import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
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
	error(404, 'Not found');
}