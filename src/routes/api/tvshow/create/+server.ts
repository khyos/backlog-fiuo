import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { Link, LinkType } from "$lib/model/Link";
import { Rating, RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { RottenTomatoes } from "$lib/rottentomatoes/RottenTomatoes";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const { tmdbId, scId, mcId, rtId } = await request.json();
    if (!tmdbId) {
        error(500, 'No TMDB ID provided');
    }
    const alreadyExists = await LinkDB.exists(LinkType.TMDB, tmdbId);
    if (alreadyExists) {
        error(500, 'TV Show already exists in list');
    }
    const tmdbTvshow = await TMDB.getTvshow(tmdbId);
    const releaseDate = tmdbTvshow.first_air_date ? new Date(tmdbTvshow.first_air_date) : undefined;
    let title = await TMDB.getTvshowTitle(tmdbId, tmdbTvshow);
    if (!title) {
        title = tmdbTvshow.name;
    }

    const links: Link[] = [];
    const ratings: Rating[] = [];

    links.push(new Link(LinkType.TMDB, tmdbId));

    if (scId) {
        links.push(new Link(LinkType.SENSCRITIQUE, scId));
        const scRating = await SensCritique.getTvshowRating(scId);
        if (scRating) {
            ratings.push(new Rating(RatingType.SENSCRITIQUE, scRating));
        }
    }

    if (mcId) {
        links.push(new Link(LinkType.METACRITIC, mcId));
        const mcRating = await MetaCritic.getTvshowRating(mcId);
        if (mcRating) {
            ratings.push(new Rating(RatingType.METACRITIC, mcRating));
        }
    }
    
    if (rtId) {
        links.push(new Link(LinkType.ROTTEN_TOMATOES, rtId));
        const rtRatings = await RottenTomatoes.getTvshowRatings(rtId);
        if (rtRatings.critics) {
            ratings.push(new Rating(RatingType.ROTTEN_TOMATOES_CRITICS, rtRatings.critics));
        }
        if (rtRatings.audience) {
            ratings.push(new Rating(RatingType.ROTTEN_TOMATOES_AUDIENCE, rtRatings.audience));
        }
    }

    const genres = tmdbTvshow.genres.map((genre) => genre.id);
    const tvshow = await TvshowDB.createTvshow(title, releaseDate, undefined, genres, links, ratings);

    let duration = 0;
    if (tmdbTvshow.seasons) {
        for (const season of tmdbTvshow.seasons) {
            if (season.season_number > 0) {
                const tmdbTvshowSeason = await TMDB.getTvshowSeasons(tmdbId, season.season_number);
                const seasonIndex = tmdbTvshowSeason.season_number;
                const seasonReleaseDate = tmdbTvshowSeason.air_date ? new Date(tmdbTvshowSeason.air_date) : undefined;
                const seasonTitle = tmdbTvshowSeason.name;
                const tvshowSeason = await TvshowDB.createTvshowSeason(tvshow.id, seasonIndex, seasonTitle, seasonReleaseDate, undefined);
                let seasonDuration = 0;
                if (tmdbTvshowSeason.episodes) {
                    for (const episode of tmdbTvshowSeason.episodes) {
                        const episodeReleaseDate = episode.air_date ? new Date(episode.air_date) : undefined;
                        const episodeTitle = episode.name;
                        await TvshowDB.createTvshowEpisode(tvshowSeason.id, episode.episode_number, episodeTitle, episodeReleaseDate, episode.runtime * 60);
                        seasonDuration += episode.runtime * 60;
                    }
                }
                await ArtifactDB.updateDuration(tvshowSeason.id, seasonDuration);
                duration += seasonDuration;
            }
        }
    }

    await ArtifactDB.updateDuration(tvshow.id, duration);
    if (tvshow) {
        return json(tvshow.toJSON());
    } else {
        return error(500, 'Failed to create TV Show');
    }
}
