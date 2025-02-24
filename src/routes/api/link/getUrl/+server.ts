import { ITAD } from "$lib/itad/ITAD";
import { LinkType } from "$lib/model/Link";
import { text } from "@sveltejs/kit";

export async function GET({ url }: any) {
    const artifactType: string = url.searchParams.get('artifactType');
    const linkType: LinkType = url.searchParams.get('linkType');
    const linkUrl: string = url.searchParams.get('linkUrl');
    const result = await getURLFromId(artifactType, linkType, linkUrl);
    return text(result);
}

const getURLFromId = async function(artifactType: string, type: LinkType, url: string): Promise<string> {
    switch (type) {
        case LinkType.HLTB:
            return `https://howlongtobeat.com/game?id=${url}`;
        case LinkType.IGDB:
            return `https://www.igdb.com/games/${url}`;
        case LinkType.ITAD:
            const finalUrl = await ITAD.getSlugFromId(url);
            return `https://isthereanydeal.com/game/${finalUrl}`;
        case LinkType.METACRITIC:
            if (artifactType === ArtifactType.GAME) {
                return `https://www.metacritic.com/game/${url}`;
            } else if (artifactType === ArtifactType.MOVIE) {
                return `https://www.metacritic.com/movie/${url}`;
            }
            break;
        case LinkType.OPENCRITIC:
            return `https://opencritic.com/game/${url}`;
        case LinkType.ROTTEN_TOMATOES:
            return `https://www.rottentomatoes.com/m/${url}`;
        case LinkType.SENSCRITIQUE:
            if (artifactType === ArtifactType.GAME) {
                return `https://www.senscritique.com/jeuvideo/${url}`;
            } else if (artifactType === ArtifactType.MOVIE) {
                return `https://www.senscritique.com/film/${url}`;
            }
            break;
        case LinkType.STEAM:
            return `https://store.steampowered.com/app/${url}`;
        case LinkType.TMDB:
            return `https://www.themoviedb.org/movie/${url}`;
        default:
            return url;
    }
    return url;
}