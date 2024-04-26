import { User, UserRights } from "$lib/model/User";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { error, json } from "@sveltejs/kit";

export async function GET({ params }: any) {
  	const movieId = parseInt(params.slug);
	const movie = await MovieDB.getById(movieId);
	if (movie) {
	  	return json(movie.serialize());
	}
	error(404, 'Not found');
}

export async function DELETE({ params, locals }: any) {
	const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.DELETE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
	const movieId = parseInt(params.slug);
    await MovieDB.deleteMovie(movieId);
    return json({ deleted: movieId });
}