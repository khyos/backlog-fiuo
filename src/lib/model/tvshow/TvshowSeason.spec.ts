import { describe, expect, test, beforeEach } from 'vitest';
import { TvshowSeason, SERIALIZE_TYPE } from './TvshowSeason';
import { TvshowEpisode } from './TvshowEpisode';
import { Tvshow } from './Tvshow';
import { ArtifactType } from '../Artifact';
import { Link, LinkType } from '../Link';
import { Genre } from '../Genre';
import { Rating, RatingType } from '../Rating';
import { Tag, TagType } from '../Tag';
import { UserArtifact, UserArtifactStatus } from '../UserArtifact';

describe('TvshowSeason', () => {
    let season: TvshowSeason;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        season = new TvshowSeason(1, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, currentDate, 450);
    });

    test('should create a TV show season with correct initial values', () => {
        expect(season.id).toBe(1);
        expect(season.childIndex).toBe(1);
        expect(season.title).toBe('Season 1');
        expect(season.type).toBe(ArtifactType.TVSHOW_SEASON);
        expect(season.releaseDate).toEqual(currentDate);
        expect(season.duration).toBe(450);
        expect(season.parent).toBeNull();
        expect(season.children).toEqual([]);
        expect(season.links).toEqual([]);
        expect(season.genres).toEqual([]);
        expect(season.ratings).toEqual([]);
        expect(season.tags).toEqual([]);
        expect(season.userInfo).toBeNull();
    });

    test('should format season numbering correctly', () => {
        expect(season.numbering).toBe('S01');
        
        season = new TvshowSeason(2, 12, 'Season 12', ArtifactType.TVSHOW_SEASON, currentDate, 450);
        expect(season.numbering).toBe('S12');

        season = new TvshowSeason(3, null, 'Special Season', ArtifactType.TVSHOW_SEASON, currentDate, 450);
        expect(season.numbering).toBeNull();
    });

    test('should always return null for mean rating', () => {
        expect(season.meanRating).toBeNull();

        season.ratings = [
            new Rating(RatingType.METACRITIC, 85),
            new Rating(RatingType.METACRITIC, 75)
        ];

        expect(season.meanRating).toBeNull();
    });

    describe('computeLastAndNextOngoing', () => {
        let episode1: TvshowEpisode;
        let episode2: TvshowEpisode;
        let episode3: TvshowEpisode;

        beforeEach(() => {
            episode1 = new TvshowEpisode(2, 1, 'Episode 1', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
            episode2 = new TvshowEpisode(3, 2, 'Episode 2', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
            episode3 = new TvshowEpisode(4, 3, 'Episode 3', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
            episode1.parent = season;
            episode2.parent = season;
            episode3.parent = season;
            season.children = [episode1, episode2, episode3];
        });

        test('should return next episode when none are finished', () => {
            const result = season.computeLastAndNextOngoing();
            expect(result.last).toBeNull();
            expect(result.next).toBe(episode1);
        });

        test('should return last finished and next unfinished episodes', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = season.computeLastAndNextOngoing();
            expect(result.last).toBe(episode1);
            expect(result.next).toBe(episode2);
        });

        test('should return last finished episode when all are finished', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            episode2.updateUserStatus(UserArtifactStatus.FINISHED);
            episode3.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = season.computeLastAndNextOngoing();
            expect(result.last).toBe(episode3);
            expect(result.next).toBeNull();
        });

        test('should handle non-sequential finished episodes', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            episode3.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = season.computeLastAndNextOngoing();
            expect(result.last).toBe(episode1);
            expect(result.next).toBe(episode2);
        });
    });

    test('should serialize to JSON', () => {
        const tvshow = new Tvshow(2, 'Test Show', ArtifactType.TVSHOW, currentDate, 900);
        const episode = new TvshowEpisode(3, 1, 'Episode 1', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
        const link = new Link(LinkType.TMDB, 'https://example.com');
        const genre = new Genre(1, 'Drama');
        const rating = new Rating(RatingType.METACRITIC, 85);
        const tag = new Tag('tag1', TagType.DEFAULT);
        const userInfo = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8.5, null, null);

        season.parent = tvshow;
        episode.parent = season;
        season.children = [episode];
        season.links = [link];
        season.genres = [genre];
        season.ratings = [rating];
        season.tags = [tag];
        season.userInfo = userInfo;

        const json = season.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Season 1',
            type: ArtifactType.TVSHOW_SEASON,
            children: [episode.toJSON()],
            childIndex: 1,
            releaseDate: currentDate.toISOString(),
            duration: 450,
            links: [link.toJSON()],
            genres: [genre.toJSON()],
            ratings: [rating.toJSON()],
            meanRating: null,
            tags: [tag.toJSON()],
            userInfo: userInfo.toJSON()
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Season 1',
            type: ArtifactType.TVSHOW_SEASON,
            children: [{
                __type: 'TvshowEpisode',
                id: 2,
                title: 'Episode 1',
                type: ArtifactType.TVSHOW_EPISODE,
                children: [],
                childIndex: 1,
                releaseDate: currentDate.toISOString(),
                duration: 45,
                links: [],
                genres: [],
                ratings: [],
                meanRating: null,
                tags: [],
                userInfo: null
            }],
            childIndex: 1,
            releaseDate: currentDate.toISOString(),
            duration: 450,
            links: [{ 
                __type: 'Link',
                type: LinkType.TMDB,
                url: 'https://example.com'
            }],
            genres: [{ 
                __type: 'Genre',
                id: 1,
                title: 'Drama'
            }],
            ratings: [{ 
                __type: 'Rating',
                type: RatingType.METACRITIC,
                rating: 85
            }],
            meanRating: null,
            tags: [{ 
                __type: 'Tag',
                id: 'tag1',
                type: TagType.DEFAULT
            }],
            userInfo: {
                __type: 'UserArtifact',
                id: 1,
                userId: 1,
                artifactId: 1,
                status: UserArtifactStatus.FINISHED,
                score: 8.5,
                startDate: null,
                endDate: null
            }
        };

        const data = TvshowSeason.fromJSON(json);

        expect(data).toBeInstanceOf(TvshowSeason);
        expect(data.id).toBe(1);
        expect(data.title).toBe('Season 1');
        expect(data.type).toBe(ArtifactType.TVSHOW_SEASON);
        expect(data.childIndex).toBe(1);
        expect(data.releaseDate).toEqual(currentDate);
        expect(data.duration).toBe(450);
        expect(data.children[0]).toBeInstanceOf(TvshowEpisode);
        expect(data.children[0].parent).toBe(data);
        expect(data.ratings[0]).toBeInstanceOf(Rating);
        expect(data.userInfo).toBeInstanceOf(UserArtifact);
    });
});