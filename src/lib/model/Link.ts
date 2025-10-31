import { ArtifactType } from "./Artifact";
import type { ISerializable, Serializable } from "./Serializable";

export enum LinkType {
    HLTB = 'HLTB',
    IGDB = 'IGDB',
    ITAD = 'ITAD',
    MAL = 'MAL',
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
        case LinkType.MAL:
            return 'MyAnimeList';
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
    } else if (artifactType === ArtifactType.TVSHOW) {
        return getTvshowLinkTypes();
    } else if (artifactType === ArtifactType.ANIME) {
        return getAnimeLinkTypes();
    }
    return [];
}

export function getGameLinkTypes() {
    return [LinkType.IGDB, LinkType.HLTB, LinkType.SENSCRITIQUE, LinkType.METACRITIC, LinkType.OPENCRITIC, LinkType.STEAM, LinkType.ITAD];
}

export function getMovieLinkTypes() {
    return [LinkType.TMDB, LinkType.SENSCRITIQUE, LinkType.METACRITIC, LinkType.ROTTEN_TOMATOES];
}

export function getTvshowLinkTypes() {
    return [LinkType.TMDB, LinkType.SENSCRITIQUE, LinkType.METACRITIC, LinkType.ROTTEN_TOMATOES];
}

export function getAnimeLinkTypes() {
    return [LinkType.MAL, LinkType.SENSCRITIQUE];
}


export const SERIALIZE_TYPE = 'Link';

export interface ILinkDB {
    artifactId: number
    type: LinkType
    url: string
}

export interface ILink extends ISerializable {
    type: LinkType
    url: string
}

export class Link implements Serializable<ILink> {
    type: LinkType
    url: string

    constructor(type: LinkType, url: string) {
        this.type = type;
        this.url = url;
    }

    toJSON(): ILink {
        return {
            __type: SERIALIZE_TYPE,
            type: this.type,
            url: this.url
        }
    }

    static fromJSON(json: ILink) {
        if (json.__type !== SERIALIZE_TYPE) {
            throw new Error('Invalid Type');
        }
        return new Link(json.type, json.url);
    }
}