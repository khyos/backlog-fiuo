import { MangaDB } from "$lib/server/model/manga/MangaDB";
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ url }: RequestEvent) {
    const page: number = parseInt(url.searchParams.get('page') ?? '0', 10);
    const pageSize: number = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const query: string = url.searchParams.get('query') ?? '';
    const mangas = await MangaDB.getMangas(page, pageSize, query);
    const serializedMangas = mangas.map((manga) => manga.toJSON());
    return json(serializedMangas);
}
