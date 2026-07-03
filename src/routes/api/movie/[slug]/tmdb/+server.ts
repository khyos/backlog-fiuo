import { LinkType } from "$lib/model/Link";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TMDB } from "$lib/tmdb/TMDB";
import { User } from "$lib/model/User";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, 'Unauthorized');
    }
    const movieId = parseInt(params.slug);
	const movie = await MovieDB.getById(movieId);
	if (movie?.links) {
		const link = movie.links.find(link => link.type === LinkType.TMDB);
        if (link) {
            const tmdbMovie = await TMDB.getMovie(link.url, 'fr-FR');
            if (tmdbMovie) {
                return json(tmdbMovie);
            }
        }
	}
	return error(404, 'Not found');
}