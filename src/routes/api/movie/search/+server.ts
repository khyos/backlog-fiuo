import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ url }: RequestEvent) {
    const page : number = parseInt(url.searchParams.get('page') ?? '0', 10);
    const pageSize : number = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const query : string = url.searchParams.get('query') ?? '';
    const movies = await MovieDB.getMovies(page, pageSize, query);
    const serializedMovies = movies.map((movie) => movie.serialize());
    return json(serializedMovies);
}