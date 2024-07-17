import { ArtifactType } from "./Artifact";

export enum LinkType {
    HLTB = 'HLTB',
    IGDB = 'IGDB',
    METACRITIC = 'METACRITIC',
    OPENCRITIC = 'OPENCRITIC',
    ROTTEN_TOMATOES =  'ROTTEN_TOMATOES',
    SENSCRITIQUE = 'SENSCRITIQUE',
    TMDB = 'TMDB'
}

export namespace LinkType {
    export function getLinkTypeLabel(linkType: LinkType) {
        switch (linkType) {
            case LinkType.HLTB:
                return 'HowLongToBeat';
            case LinkType.IGDB:
                return 'IGDB';
            case LinkType.METACRITIC:
                return 'Metacritic';
            case LinkType.OPENCRITIC:
                return 'OpenCritic';
            case LinkType.ROTTEN_TOMATOES:
                return 'Rotten Tomatoes';
            case LinkType.SENSCRITIQUE:
                return 'SensCritique';
            case LinkType.TMDB:
                return 'TMDB';
            default:
                return '';
        }
    }

    export function getLinkTypesByArtifactType(artifactType: string) {
        if (artifactType === ArtifactType.GAME) {
            return getGameLinkTypes();
        } else if (artifactType === ArtifactType.MOVIE) {
            return getMovieLinkTypes();
        }
        return [];
    }

    export function getGameLinkTypes() {
        return [LinkType.IGDB, LinkType.HLTB, LinkType.SENSCRITIQUE, LinkType.METACRITIC, LinkType.OPENCRITIC, ];
    }

    export function getMovieLinkTypes() {
        return [LinkType.TMDB, LinkType.SENSCRITIQUE, LinkType.METACRITIC, LinkType.ROTTEN_TOMATOES];
    }
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

    static getURL(artifactType: string, type: LinkType, url: string): string {
        switch (type) {
            case LinkType.HLTB:
                return `https://howlongtobeat.com/game?id=${url}`;
            case LinkType.IGDB:
                return `https://www.igdb.com/games/${url}`;
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
            case LinkType.TMDB:
                return `https://www.themoviedb.org/movie/${url}`;
            default:
                return url;
        }
        return url;
    }
}