import { LinkType } from "$lib/model/Link";
import { MAL } from "$lib/mal/MAL";
import { User } from "$lib/model/User";
import { MangaDB } from "$lib/server/model/manga/MangaDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, 'Unauthorized');
    }
    const mangaId = parseInt(params.slug);
    const manga = await MangaDB.getById(mangaId);
    if (manga?.links) {
        const link = manga.links.find(link => link.type === LinkType.MAL);
        if (link) {
            const malManga = await MAL.getManga(link.url);
            if (malManga) {
                return json(malManga);
            }
        }
    }
    return error(404, 'Not found');
}
