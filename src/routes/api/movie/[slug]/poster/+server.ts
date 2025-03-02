import { LinkType } from "$lib/model/Link";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, text } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
    const movieId = parseInt(params.slug);
	const movie = await MovieDB.getById(movieId);
	if (movie?.links) {
		const link = movie.links.find(link => link.type === LinkType.TMDB);
        if (link) {
            const url = await TMDB.getImageURL(link.url);
            if (url) {
                return text(url);
            }
        }
	}
	error(404, 'Not found');
}