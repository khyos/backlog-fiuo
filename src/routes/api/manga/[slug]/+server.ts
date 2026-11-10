import { User, UserRights } from "$lib/model/User";
import { MangaDB } from "$lib/server/model/manga/MangaDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
    const mangaId = parseInt(params.slug);
    const manga = await MangaDB.getById(mangaId, true);
    if (manga) {
        return json(manga.toJSON());
    }
    return error(404, 'Not found');
}

export async function DELETE({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.DELETE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const mangaId = parseInt(params.slug);
    await MangaDB.deleteManga(mangaId);
    return json({ success: true });
}
