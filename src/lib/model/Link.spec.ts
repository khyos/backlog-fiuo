import { describe, expect, test } from 'vitest';
import { Link, LinkType, SERIALIZE_TYPE, getLinkTypeLabel, getLinkTypesByArtifactType, getMangaLinkTypes, getAnimeLinkTypes, getGameLinkTypes, getMovieLinkTypes, getTvshowLinkTypes, type ILink } from './Link';
import { ArtifactType } from './Artifact';

describe('Link', () => {
    test('should create a link with correct initial values', () => {
        const link = new Link(LinkType.TMDB, 'https://example.com');
        
        expect(link.type).toBe(LinkType.TMDB);
        expect(link.url).toBe('https://example.com');
    });

    test('should serialize to JSON', () => {
        const link = new Link(LinkType.TMDB, 'https://example.com');
        const json = link.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            type: LinkType.TMDB,
            url: 'https://example.com'
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            type: LinkType.TMDB,
            url: 'https://example.com'
        };

        const link = Link.fromJSON(json);

        expect(link).toBeInstanceOf(Link);
        expect(link.type).toBe(LinkType.TMDB);
        expect(link.url).toBe('https://example.com');
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            type: LinkType.TMDB,
            url: 'https://example.com'
        };

        expect(() => Link.fromJSON(json as ILink)).toThrow('Invalid Type');
    });
});

describe('getLinkTypeLabel', () => {
    test('should return correct labels for all link types', () => {
        expect(getLinkTypeLabel(LinkType.HLTB)).toBe('HowLongToBeat');
        expect(getLinkTypeLabel(LinkType.IGDB)).toBe('IGDB');
        expect(getLinkTypeLabel(LinkType.ITAD)).toBe('ITAD');
        expect(getLinkTypeLabel(LinkType.MAL)).toBe('MyAnimeList');
        expect(getLinkTypeLabel(LinkType.METACRITIC)).toBe('Metacritic');
        expect(getLinkTypeLabel(LinkType.OPENCRITIC)).toBe('OpenCritic');
        expect(getLinkTypeLabel(LinkType.ROTTEN_TOMATOES)).toBe('Rotten Tomatoes');
        expect(getLinkTypeLabel(LinkType.SENSCRITIQUE)).toBe('SensCritique');
        expect(getLinkTypeLabel(LinkType.STEAM)).toBe('Steam');
        expect(getLinkTypeLabel(LinkType.TMDB)).toBe('TMDB');
        expect(getLinkTypeLabel('INVALID' as LinkType)).toBe('');
    });
});

describe('getLinkTypesByArtifactType', () => {
    test('should return correct link types for games', () => {
        const types = getLinkTypesByArtifactType(ArtifactType.GAME);
        expect(types).toContain(LinkType.IGDB);
        expect(types).toContain(LinkType.HLTB);
        expect(types).toContain(LinkType.STEAM);
        expect(types).toContain(LinkType.METACRITIC);
        expect(types).toContain(LinkType.OPENCRITIC);
        expect(types).toContain(LinkType.SENSCRITIQUE);
        expect(types).toContain(LinkType.ITAD);
    });

    test('should return correct link types for movies', () => {
        const types = getLinkTypesByArtifactType(ArtifactType.MOVIE);
        expect(types).toContain(LinkType.TMDB);
        expect(types).toContain(LinkType.SENSCRITIQUE);
        expect(types).toContain(LinkType.METACRITIC);
        expect(types).toContain(LinkType.ROTTEN_TOMATOES);
    });

    test('should return correct link types for TV shows', () => {
        const types = getLinkTypesByArtifactType(ArtifactType.TVSHOW);
        expect(types).toContain(LinkType.TMDB);
        expect(types).toContain(LinkType.SENSCRITIQUE);
        expect(types).toContain(LinkType.METACRITIC);
        expect(types).toContain(LinkType.ROTTEN_TOMATOES);
    });

    test('should return correct link types for anime', () => {
        const types = getLinkTypesByArtifactType(ArtifactType.ANIME);
        expect(types).toContain(LinkType.MAL);
        expect(types).toContain(LinkType.SENSCRITIQUE);
    });

    test('should return empty array for unknown artifact type', () => {
        const types = getLinkTypesByArtifactType('UNKNOWN' as ArtifactType);
        expect(types).toEqual([]);
    });
});

/**
 * Complementary wiring coverage for the newly-added MANGABAKA link type.
 * The pre-existing label test and list tests above intentionally do NOT mention
 * MANGABAKA, so these assert the new enum member is wired in exactly where it
 * should be (manga list only) and nowhere else.
 */
describe('MANGABAKA link wiring', () => {
    test('enum member has the stringified value "MANGABAKA"', () => {
        expect(LinkType.MANGABAKA).toBe('MANGABAKA');
    });

    test('getLinkTypeLabel returns "MangaBaka"', () => {
        expect(getLinkTypeLabel(LinkType.MANGABAKA)).toBe('MangaBaka');
    });

    test('getMangaLinkTypes includes MANGABAKA', () => {
        expect(getMangaLinkTypes()).toContain(LinkType.MANGABAKA);
    });

    test('getLinkTypesByArtifactType(MANGA) includes MANGABAKA', () => {
        expect(getLinkTypesByArtifactType(ArtifactType.MANGA)).toContain(LinkType.MANGABAKA);
    });

    test('MANGABAKA is not offered for any other artifact type', () => {
        expect(getAnimeLinkTypes()).not.toContain(LinkType.MANGABAKA);
        expect(getGameLinkTypes()).not.toContain(LinkType.MANGABAKA);
        expect(getMovieLinkTypes()).not.toContain(LinkType.MANGABAKA);
        expect(getTvshowLinkTypes()).not.toContain(LinkType.MANGABAKA);
        expect(getLinkTypesByArtifactType(ArtifactType.ANIME)).not.toContain(LinkType.MANGABAKA);
        expect(getLinkTypesByArtifactType(ArtifactType.GAME)).not.toContain(LinkType.MANGABAKA);
        expect(getLinkTypesByArtifactType(ArtifactType.MOVIE)).not.toContain(LinkType.MANGABAKA);
        expect(getLinkTypesByArtifactType(ArtifactType.TVSHOW)).not.toContain(LinkType.MANGABAKA);
    });
});