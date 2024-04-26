import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { json } from "@sveltejs/kit";

export async function GET({ url }: any) {
    const page : number = url.searchParams.get('page') ?? 0;
    const pageSize : number = url.searchParams.get('pageSize') ?? 10;
    const query : string = url.searchParams.get('query') ?? '';
    const movies = await MovieDB.getMovies(page, pageSize, query);
    const serializedMovies = movies.map((movie) => movie.serialize());
    return json(serializedMovies);
}