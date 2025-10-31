import { MAL } from "$lib/mal/MAL";
import { Link, LinkType } from "$lib/model/Link";
import { Rating, RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const { malId, scId } = await request.json();
    if (!malId) {
        error(500, 'No MyAnimeList ID provided');
    }
    
    const alreadyExists = await LinkDB.exists(LinkType.MAL, malId);
    if (alreadyExists) {
        error(500, 'Anime already exists in list');
    }
    
    const malAnime = await MAL.getAnime(malId);
    if (!malAnime) {
        error(500, 'Could not fetch anime from MyAnimeList');
    }
    
    const links: Link[] = [];
    const ratings: Rating[] = [];

    // Add MAL link
    links.push(new Link(LinkType.MAL, malId));

    // Add MAL rating if available
    if (malAnime.score) {
        ratings.push(new Rating(RatingType.MAL, malAnime.score));
    }

    // Add SensCritique link and rating if provided
    if (scId) {
        links.push(new Link(LinkType.SENSCRITIQUE, scId));
        const scRating = await SensCritique.getTvshowRating(scId);
        if (scRating) {
            ratings.push(new Rating(RatingType.SENSCRITIQUE, scRating));
        }
    }

    const releaseDate = MAL.parseAiredDate(malAnime.aired);

    const genreIds: number[] = [];
    if (malAnime.genres) {
        for (const genre of malAnime.genres) {
            genreIds.push(genre.mal_id);
        }
    }

    const anime = await AnimeDB.createAnime(
        malAnime.title,
        malAnime.synopsis || '',
        releaseDate,
        undefined,
        genreIds,
        links,
        ratings
    );

    const durationPerEpisode = (MAL.parsePerEpisodeDuration(malAnime.duration) ?? 20) * 60;

    let duration = 0;
    if (malAnime.episodes) {
        const animeEpisodes = await MAL.getAnimeEpisodes(malId);
        for (const episode of animeEpisodes) {
            const episodeNumber = episode.mal_id;
            const episodeReleaseDate = episode.aired ? new Date(episode.aired) : undefined;
            const episodeTitle = episode.title;
            await AnimeDB.createAnimeEpisode(anime.id, episodeNumber, episodeTitle, episodeReleaseDate, durationPerEpisode);
            duration += durationPerEpisode;
        }
    }
    await ArtifactDB.updateDuration(anime.id, duration);

    if (anime) {
        return json(anime.toJSON());
    } else {
        return error(500, 'Failed to create Anime');
    }
}