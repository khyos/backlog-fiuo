import { ArtifactType } from "./Artifact";

export enum LinkType {
    HLTB = 'HLTB',
    IGDB = 'IGDB',
    ITAD = 'ITAD',
    METACRITIC = 'METACRITIC',
    OPENCRITIC = 'OPENCRITIC',
    ROTTEN_TOMATOES =  'ROTTEN_TOMATOES',
    SENSCRITIQUE = 'SENSCRITIQUE',
    STEAM = 'STEAM',
    TMDB = 'TMDB'
}

export function getLinkTypeLabel(linkType: LinkType) {
    switch (linkType) {
        case LinkType.HLTB:
            return 'HowLongToBeat';
        case LinkType.IGDB:
            return 'IGDB';
        case LinkType.ITAD:
            return 'ITAD';
        case LinkType.METACRITIC:
            return 'Metacritic';
        case LinkType.OPENCRITIC:
            return 'OpenCritic';
        case LinkType.ROTTEN_TOMATOES:
            return 'Rotten Tomatoes';
        case LinkType.SENSCRITIQUE:
            return 'SensCritique';
        case LinkType.STEAM:
            return 'Steam';
        case LinkType.TMDB:
            return 'TMDB';
        default:
            return '';
    }
}

export function getLinkTypesByArtifactType(artifactType: ArtifactType) {
    if (artifactType === ArtifactType.GAME) {
        return getGameLinkTypes();
    } else if (artifactType === ArtifactType.MOVIE) {
        return getMovieLinkTypes();
    }
    return [];
}

export function getGameLinkTypes() {
    return [LinkType.IGDB, LinkType.HLTB, LinkType.SENSCRITIQUE, LinkType.METACRITIC, LinkType.OPENCRITIC, LinkType.STEAM, LinkType.ITAD];
}

export function getMovieLinkTypes() {
    return [LinkType.TMDB, LinkType.SENSCRITIQUE, LinkType.METACRITIC, LinkType.ROTTEN_TOMATOES];
}

export class Link {
    type: LinkType
    url: string

    constructor(type: LinkType, url: string) {
        this.type = type;
        this.url = url;
    }

    serialize() {
        return {
            type: this.type,
            url: this.url
        }
    }

    static deserialize(data: any) {
        return new Link(data.type, data.url);
    }
}