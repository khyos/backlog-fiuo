import { describe, expect, test, beforeEach } from 'vitest';
import { TvshowEpisode, SERIALIZE_TYPE } from './TvshowEpisode';
import { TvshowSeason } from './TvshowSeason';
import { ArtifactType } from '../Artifact';
import { Link, LinkType } from '../Link';
import { Genre } from '../Genre';
import { Rating, RatingType } from '../Rating';
import { Tag, TagType } from '../Tag';
import { UserArtifact, UserArtifactStatus } from '../UserArtifact';

describe('TvshowEpisode', () => {
    let episode: TvshowEpisode;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        episode = new TvshowEpisode(1, 1, 'Pilot', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
    });

    test('should create a TV show episode with correct initial values', () => {
        expect(episode.id).toBe(1);
        expect(episode.childIndex).toBe(1);
        expect(episode.title).toBe('Pilot');
        expect(episode.type).toBe(ArtifactType.TVSHOW_EPISODE);
        expect(episode.releaseDate).toEqual(currentDate);
        expect(episode.duration).toBe(45);
        expect(episode.parent).toBeNull();
        expect(episode.children).toEqual([]);
        expect(episode.links).toEqual([]);
        expect(episode.genres).toEqual([]);
        expect(episode.ratings).toEqual([]);
        expect(episode.tags).toEqual([]);
        expect(episode.userInfo).toBeNull();
    });

    describe('numbering', () => {
        test('should format episode numbering without parent', () => {
            expect(episode.numbering).toBe('E01');
            
            episode = new TvshowEpisode(2, 12, 'Episode 12', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
            expect(episode.numbering).toBe('E12');
        });

        test('should format episode numbering with parent season', () => {
            const season = new TvshowSeason(2, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, currentDate, 450);
            episode.parent = season;
            
            expect(episode.numbering).toBe('S01E01');
        });

        test('should return null when childIndex is null', () => {
            episode = new TvshowEpisode(3, null, 'Special', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
            expect(episode.numbering).toBeNull();
        });
    });

    test('should always return null for mean rating', () => {
        expect(episode.meanRating).toBeNull();

        episode.ratings = [
            new Rating(RatingType.METACRITIC, 85),
            new Rating(RatingType.METACRITIC, 75)
        ];

        expect(episode.meanRating).toBeNull();
    });

    test('should throw error when computing last and next ongoing', () => {
        expect(() => episode.computeLastAndNextOngoing()).toThrow('Not Compatible with this Artifact');
    });

    test('should serialize to JSON', () => {
        const link = new Link(LinkType.TMDB, 'https://example.com');
        const genre = new Genre(1, 'Drama');
        const rating = new Rating(RatingType.METACRITIC, 85);
        const tag = new Tag('tag1', TagType.DEFAULT);
        const userInfo = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8.5, null, null);

        episode.links = [link];
        episode.genres = [genre];
        episode.ratings = [rating];
        episode.tags = [tag];
        episode.userInfo = userInfo;

        const json = episode.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Pilot',
            type: ArtifactType.TVSHOW_EPISODE,
            children: [],
            childIndex: 1,
            releaseDate: currentDate.toISOString(),
            duration: 45,
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
            title: 'Pilot',
            type: ArtifactType.TVSHOW_EPISODE,
            children: [],
            childIndex: 1,
            releaseDate: currentDate.toISOString(),
            duration: 45,
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

        const data = TvshowEpisode.fromJSON(json);

        expect(data).toBeInstanceOf(TvshowEpisode);
        expect(data.id).toBe(1);
        expect(data.title).toBe('Pilot');
        expect(data.type).toBe(ArtifactType.TVSHOW_EPISODE);
        expect(data.childIndex).toBe(1);
        expect(data.releaseDate).toEqual(currentDate);
        expect(data.duration).toBe(45);
        expect(data.ratings[0]).toBeInstanceOf(Rating);
        expect(data.userInfo).toBeInstanceOf(UserArtifact);
    });
});