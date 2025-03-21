import { User, UserRights } from "$lib/model/User";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
	const movieId = parseInt(params.slug);
	const movie = await MovieDB.getById(movieId);
	if (movie) {
		return json(movie.toJSON());
	}
	error(404, 'Not found');
}

export async function DELETE({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.DELETE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
	const movieId = parseInt(params.slug);
    await MovieDB.deleteMovie(movieId);
    return json({ deleted: movieId });
}