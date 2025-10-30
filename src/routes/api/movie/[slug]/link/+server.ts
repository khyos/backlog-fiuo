import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { LinkType } from "$lib/model/Link";
import { RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { RottenTomatoes } from "$lib/rottentomatoes/RottenTomatoes";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const movieId = parseInt(params.slug);
    const { type, url } = await request.json();
	
    const finalUrl = await setLinkInfo(movieId, type, url);
    if (finalUrl) {
        LinkDB.addLink(movieId, type, url);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}


export async function PATCH({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const movieId = parseInt(params.slug);
    const { type, url } = await request.json();

    const finalUrl = await setLinkInfo(movieId, type, url);
    if (finalUrl) {
        LinkDB.updateLink(movieId, type, finalUrl);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

const setLinkInfo = async (movieId: number, type: LinkType, url: string): Promise<string> => {
    const finalUrl = url;
    if (type === LinkType.SENSCRITIQUE) {
        const scRating = await SensCritique.getMovieRating(url);
        if (scRating) {
            await RatingDB.addRating(movieId, RatingType.SENSCRITIQUE, scRating);
        }
    } else if (type === LinkType.METACRITIC) {
        const mcRating = await MetaCritic.getMovieRating(url);
        if (mcRating) {
            await RatingDB.addRating(movieId, RatingType.METACRITIC, mcRating);
        }
    } else if (type === LinkType.ROTTEN_TOMATOES) {
        const rtRatings = await RottenTomatoes.getMovieRatings(url);
        if (rtRatings.critics) {
            await RatingDB.addRating(movieId, RatingType.ROTTEN_TOMATOES_CRITICS, rtRatings.critics);
        }
        if (rtRatings.audience) {
            await RatingDB.addRating(movieId, RatingType.ROTTEN_TOMATOES_AUDIENCE, rtRatings.audience);
        }
    }
    return finalUrl;
}

export async function PUT({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const movieId = parseInt(params.slug);
    const { types } = await request.json();
    const links = await LinkDB.getLinks(movieId);
    for (const type of types) {
        const url = links.find(link => link.type === type)?.url;
        if (url) {
            if (type === LinkType.TMDB) {     
                try {
                    const tmdbMovie = await TMDB.getMovie(url);
                    let releaseDate = await TMDB.getMovieReleaseDate(url, tmdbMovie.origin_country?.[0]);
                    if (!releaseDate) {
                        releaseDate = tmdbMovie.release_date &&tmdbMovie.release_date !== '' ? new Date(tmdbMovie.release_date) : undefined;
                    }
                    let title = await TMDB.getMovieTitle(url, tmdbMovie);
                    if (!title) {
                        title = tmdbMovie.title;
                    }

                    const duration = tmdbMovie.runtime * 60;
                    await MovieDB.updateMovie(movieId, title, releaseDate, duration);
                } catch {
                    return error(500, "Failed to Update TMDB");
                }
            } else if (type === LinkType.SENSCRITIQUE) {
                try {
                    const scRating = await SensCritique.getMovieRating(url);
                    if (scRating) {
                        await RatingDB.updateRating(movieId, RatingType.SENSCRITIQUE, scRating);
                    }
                } catch {
                    return error(500, "Failed to Update SENSCRITIQUE");
                }
            } else if (type === LinkType.METACRITIC) {
                try {
                    const mcRating = await MetaCritic.getMovieRating(url);
                    if (mcRating) {
                        await RatingDB.updateRating(movieId, RatingType.METACRITIC, mcRating);
                    }
                } catch {
                    return error(500, "Failed to Update METACRITIC");
                }
            } else if (type === LinkType.ROTTEN_TOMATOES) {
                try {
                    const rtRatings = await RottenTomatoes.getMovieRatings(url);
                    if (rtRatings.critics) {
                        await RatingDB.updateRating(movieId, RatingType.ROTTEN_TOMATOES_CRITICS, rtRatings.critics);
                    }
                    if (rtRatings.audience) {
                        await RatingDB.updateRating(movieId, RatingType.ROTTEN_TOMATOES_AUDIENCE, rtRatings.audience);
                    }
                } catch {
                    return error(500, "Failed to Update ROTTEN_TOMATOES");
                }
            }
        }
    }
    return json({ success: true });
}