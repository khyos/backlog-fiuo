import { MAL } from "$lib/mal/MAL";
import { LinkType } from "$lib/model/Link";
import { RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const animeId = parseInt(params.slug);
    const { type, url } = await request.json();
	
    const finalUrl = await setLinkInfo(animeId, type, url);
    if (finalUrl) {
        LinkDB.addLink(animeId, type, url);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

export async function PATCH({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const animeId = parseInt(params.slug);
    const { type, url } = await request.json();

    const finalUrl = await setLinkInfo(animeId, type, url);
    if (finalUrl) {
        LinkDB.updateLink(animeId, type, finalUrl);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

const setLinkInfo = async (animeId: number, type: LinkType, url: string): Promise<string> => {
    const finalUrl = url;
    if (type === LinkType.SENSCRITIQUE) {
        const scRating = await SensCritique.getTvshowRating(url);
        if (scRating) {
            await RatingDB.addRating(animeId, RatingType.SENSCRITIQUE, scRating);
        }
    }
    return finalUrl;
}

export async function PUT({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const animeId = parseInt(params.slug);
    const { types } = await request.json();
    const links = await LinkDB.getLinks(animeId);
    
    for (const type of types) {
        const url = links.find(link => link.type === type)?.url;
        if (url) {
            if (type === LinkType.MAL) {
                await updateMAL(animeId, url);
            } else if (type === LinkType.SENSCRITIQUE) {
                try {
                    const scRating = await SensCritique.getTvshowRating(url);
                    if (scRating) {
                        await RatingDB.updateRating(animeId, RatingType.SENSCRITIQUE, scRating);
                    }
                } catch {
                    return error(500, "Failed to Update SENSCRITIQUE");
                }
            }
        }
    }
    return json({ success: true });
}

const updateMAL = async (animeId: number, malId: string) => {
    try {
        const anime = await AnimeDB.getById(animeId, true);
        if (!anime) {
            return error(500, "Can't update an Anime that doesn't exist");
        }

        const malAnime = await MAL.getAnime(malId);
        if (!malAnime) {
            return error(500, "MAL Anime not found");
        }
        if (malAnime.score) {
            await RatingDB.updateRating(animeId, RatingType.MAL, malAnime.score);
        }
        const releaseDate = MAL.parseAiredDate(malAnime.aired);
        const durationPerEpisode = (MAL.parsePerEpisodeDuration(malAnime.duration) ?? 20) * 60;

        let duration = 0;
        if (malAnime.episodes) {
            const malAnimeEpisodes = await MAL.getAnimeEpisodes(malId);
            for (const episode of malAnimeEpisodes) {
                const episodeNumber = episode.mal_id;
                const episodeReleaseDate = episode.aired ? new Date(episode.aired) : undefined;
                const episodeTitle = episode.title;
                const animeEpisode = anime.children.find(child => child.childIndex === episodeNumber)
                if (!animeEpisode) {
                    await AnimeDB.createAnimeEpisode(anime.id, episodeNumber, episodeTitle, episodeReleaseDate, durationPerEpisode);
                } else {
                    await AnimeDB.updateAnimeEpisode(animeEpisode.id, episodeNumber, episodeTitle, episodeReleaseDate, durationPerEpisode);
                }
                duration += durationPerEpisode;
            }
            for (const animeEpisode of anime.children) {
                const episode = malAnimeEpisodes.find(child => child.mal_id === animeEpisode.childIndex);
                if (!episode) {
                    await AnimeDB.deleteAnimeEpisode(animeEpisode.id);
                }
            }
        }
       
        await AnimeDB.updateAnime(animeId, malAnime.title, releaseDate, duration);
    } catch {
        return error(500, "Failed to Update TMDB");
    }
}
