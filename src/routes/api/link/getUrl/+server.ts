import { ITAD } from "$lib/itad/ITAD";
import { LinkType } from "$lib/model/Link";
import { error, text } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ArtifactType } from "$lib/model/Artifact";
import { IGDB } from "$lib/igdb/IGDB";

export async function GET({ url }: RequestEvent) {
    const artifactType = url.searchParams.get('artifactType') as ArtifactType | null;
    if (artifactType !== null && !Object.values(ArtifactType).includes(artifactType)) {
        error(500, 'Invalid artifactType')
    }
    const linkType = url.searchParams.get('linkType') as LinkType | null;
    if (linkType === null) {
        error(500, 'Missing Link Type')
    }
    const linkUrl: string | null = url.searchParams.get('linkUrl');
    if (linkUrl === null) {
        error(500, 'Missing Link URL')
    }
    const result = await getURLFromId(artifactType, linkType, linkUrl);
    return text(result);
}

const getURLFromId = async function(artifactType: ArtifactType | null, type: LinkType, url: string): Promise<string> {
    let finalUrl = url;
    switch (type) {
        case LinkType.HLTB:
            return `https://howlongtobeat.com/game?id=${url}`;
        case LinkType.IGDB:
            return await IGDB.getUrlFromId(url);
        case LinkType.ITAD:
            finalUrl = await ITAD.getSlugFromId(url);
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