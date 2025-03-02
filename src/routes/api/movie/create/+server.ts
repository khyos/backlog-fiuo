import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { Link, LinkType } from "$lib/model/Link";
import { Rating, RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { RottenTomatoes } from "$lib/rottentomatoes/RottenTomatoes";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TMDB } from "$lib/tmdb/TMDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ request, locals }: RequestEvent) {
    const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const { tmdbId, scId, mcId, rtId } = await request.json();
    if (!tmdbId) {
        error(500, 'No TMDB ID provided');
    }
    const alreadyExists = await LinkDB.exists(LinkType.TMDB, tmdbId);
    if (alreadyExists) {
        error(500, 'Movie already exists in list');
    }
    const tmdbMovie = await TMDB.getMovie(tmdbId);
    let releaseDate = await TMDB.getReleaseDate(tmdbId, tmdbMovie.origin_country?.[0]);
    if (!releaseDate) {
        releaseDate = tmdbMovie.release_date &&tmdbMovie.release_date !== '' ? new Date(tmdbMovie.release_date) : undefined;
    }
    let title = await TMDB.getTitle(tmdbId, tmdbMovie);
    if (!title) {
        title = tmdbMovie.title;
    }

    const links: Link[] = [];
    const ratings: Rating[] = [];

    links.push(new Link(LinkType.TMDB, tmdbId));

    if (scId) {
        links.push(new Link(LinkType.SENSCRITIQUE, scId));
        const scRating = await SensCritique.getMovieRating(scId);
        if (scRating) {
            ratings.push(new Rating(RatingType.SENSCRITIQUE, scRating));
        }
    }

    if (mcId) {
        links.push(new Link(LinkType.METACRITIC, mcId));
        const mcRating = await MetaCritic.getMovieRating(mcId);
        if (mcRating) {
            ratings.push(new Rating(RatingType.METACRITIC, mcRating));
        }
    }
    
    if (rtId) {
        links.push(new Link(LinkType.ROTTEN_TOMATOES, rtId));
        const rtRatings = await RottenTomatoes.getMovieRatings(rtId);
        if (rtRatings.critics) {
            ratings.push(new Rating(RatingType.ROTTEN_TOMATOES_CRITICS, rtRatings.critics));
        }
        if (rtRatings.audience) {
            ratings.push(new Rating(RatingType.ROTTEN_TOMATOES_AUDIENCE, rtRatings.audience));
        }
    }

    const duration = tmdbMovie.runtime * 60;
    const genres = tmdbMovie.genres.map((genre: any) => genre.id);
    const movie = await MovieDB.createMovie(title, releaseDate, duration, genres, links, ratings);
    if (movie) {
        return json(movie.serialize());
    } else {
        return error(500, 'Failed to create Movie');
    }
}
