import { LinkType } from "$lib/model/Link";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, text } from "@sveltejs/kit";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
    const tvshowId = parseInt(params.slug);
	const tvshow = await TvshowDB.getById(tvshowId);
	if (tvshow?.links) {
		const link = tvshow.links.find(link => link.type === LinkType.TMDB);
        if (link) {
            const url = await TMDB.getTvshowImageURL(link.url);
            if (url) {
                return text(url);
            }
        }
	}
	error(404, 'Not found');
}