import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { LinkType } from "$lib/model/Link";
import { RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { RottenTomatoes } from "$lib/rottentomatoes/RottenTomatoes";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const tvshowId = parseInt(params.slug);
    const { type, url } = await request.json();
	
    const finalUrl = await setLinkInfo(tvshowId, type, url);
    if (finalUrl) {
        LinkDB.addLink(tvshowId, type, url);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}


export async function PATCH({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const tvshowId = parseInt(params.slug);
    const { type, url } = await request.json();

    const finalUrl = await setLinkInfo(tvshowId, type, url);
    if (finalUrl) {
        LinkDB.updateLink(tvshowId, type, finalUrl);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

const setLinkInfo = async (tvshowId: number, type: LinkType, url: string): Promise<string> => {
    const finalUrl = url;
    if (type === LinkType.SENSCRITIQUE) {
        const scRating = await SensCritique.getTvshowRating(url);
        if (scRating) {
            await RatingDB.addRating(tvshowId, RatingType.SENSCRITIQUE, scRating);
        }
    } else if (type === LinkType.METACRITIC) {
        const mcRating = await MetaCritic.getTvshowRating(url);
        if (mcRating) {
            await RatingDB.addRating(tvshowId, RatingType.METACRITIC, mcRating);
        }
    } else if (type === LinkType.ROTTEN_TOMATOES) {
        const rtRatings = await RottenTomatoes.getTvshowRatings(url);
        if (rtRatings.critics) {
            await RatingDB.addRating(tvshowId, RatingType.ROTTEN_TOMATOES_CRITICS, rtRatings.critics);
        }
        if (rtRatings.audience) {
            await RatingDB.addRating(tvshowId, RatingType.ROTTEN_TOMATOES_AUDIENCE, rtRatings.audience);
        }
    }
    return finalUrl;
}

export async function PUT({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const tvshowId = parseInt(params.slug);
    const { types } = await request.json();
    const links = await LinkDB.getLinks(tvshowId);
    for (const type of types) {
        const url = links.find(link => link.type === type)?.url;
        if (url) {
            if (type === LinkType.TMDB) {     
                await updateTMDB(tvshowId, url);
            } else if (type === LinkType.SENSCRITIQUE) {
                try {
                    const scRating = await SensCritique.getTvshowRating(url);
                    if (scRating) {
                        await RatingDB.updateRating(tvshowId, RatingType.SENSCRITIQUE, scRating);
                    }
                } catch {
                    return error(500, "Failed to Update SENSCRITIQUE");
                }
            } else if (type === LinkType.METACRITIC) {
                try {
                    const mcRating = await MetaCritic.getTvshowRating(url);
                    if (mcRating) {
                        await RatingDB.updateRating(tvshowId, RatingType.METACRITIC, mcRating);
                    }
                } catch {
                    return error(500, "Failed to Update METACRITIC");
                }
            } else if (type === LinkType.ROTTEN_TOMATOES) {
                try {
                    const rtRatings = await RottenTomatoes.getTvshowRatings(url);
                    if (rtRatings.critics) {
                        await RatingDB.updateRating(tvshowId, RatingType.ROTTEN_TOMATOES_CRITICS, rtRatings.critics);
                    }
                    if (rtRatings.audience) {
                        await RatingDB.updateRating(tvshowId, RatingType.ROTTEN_TOMATOES_AUDIENCE, rtRatings.audience);
                    }
                } catch {
                    return error(500, "Failed to Update ROTTEN_TOMATOES");
                }
            }
        }
    }
    return json({ success: true });
}

const updateTMDB = async (tvshowId: number, url: string) => {
    try {
        const tvshow = await TvshowDB.getById(tvshowId, true, true);
        if (!tvshow) {
            return error(500, "Can't update a TV Show that doesn't exist");
        }

        const tmdbTvshow = await TMDB.getTvshow(url);
        const releaseDate = tmdbTvshow.first_air_date ? new Date(tmdbTvshow.first_air_date) : undefined;
        let title = await TMDB.getTvshowTitle(url, tmdbTvshow);
        if (!title) {
            title = tmdbTvshow.name;
        }

        
        let duration = 0;
        if (tmdbTvshow.seasons) {
            for (const season of tmdbTvshow.seasons) {
                if (season.season_number > 0) {
                    const tmdbTvshowSeason = await TMDB.getTvshowSeasons(url, season.season_number);
                    const seasonNumber = tmdbTvshowSeason.season_number;
                    const seasonReleaseDate = tmdbTvshowSeason.air_date ? new Date(tmdbTvshowSeason.air_date) : undefined;
                    const seasonTitle = tmdbTvshowSeason.name;
                    let tvshowSeason = tvshow.children.find(child => child.childIndex === seasonNumber)
                    if (!tvshowSeason) {
                        tvshowSeason = await TvshowDB.createTvshowSeason(tvshow.id, seasonNumber, seasonTitle, seasonReleaseDate, undefined);
                    } else {
                        await TvshowDB.updateTvshowSeason(tvshowSeason.id, seasonNumber, seasonTitle, seasonReleaseDate, undefined);
                    }
                    let seasonDuration = 0;
                    if (tmdbTvshowSeason.episodes) {
                        for (const episode of tmdbTvshowSeason.episodes) {
                            const episodeNumber = episode.episode_number;
                            const episodeReleaseDate = episode.air_date ? new Date(tmdbTvshowSeason.air_date) : undefined;
                            const episodeTitle = episode.name;
                            const tvshowEpisode = tvshowSeason.children.find(child => child.childIndex === episodeNumber)
                            if (!tvshowEpisode) {
                                await TvshowDB.createTvshowEpisode(tvshowSeason.id, episodeNumber, episodeTitle, episodeReleaseDate, episode.runtime * 60);
                            } else {
                                await TvshowDB.updateTvshowEpisode(tvshowEpisode.id, episodeNumber, episodeTitle, episodeReleaseDate, episode.runtime * 60);
                            }
                            seasonDuration += episode.runtime * 60;
                        }
                    }
                    await ArtifactDB.updateDuration(tvshowSeason.id, seasonDuration);
                    duration += seasonDuration;
                }
            }
        }
        await TvshowDB.updateTvshow(tvshowId, title, releaseDate, duration);
    } catch {
        return error(500, "Failed to Update TMDB");
    }
}