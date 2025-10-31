import { describe, expect, test, beforeEach } from 'vitest';
import { AnimeEpisode, SERIALIZE_TYPE } from './AnimeEpisode';
import { ArtifactType } from '../Artifact';
import { Link, LinkType } from '../Link';
import { Genre } from '../Genre';
import { Rating, RatingType } from '../Rating';
import { Tag, TagType } from '../Tag';
import { UserArtifact, UserArtifactStatus } from '../UserArtifact';

describe('AnimeEpisode', () => {
    let episode: AnimeEpisode;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        episode = new AnimeEpisode(1, 1, 'Episode 1', ArtifactType.ANIME_EPISODE, currentDate, 24);
    });

    test('should create an anime episode with correct initial values', () => {
        expect(episode.id).toBe(1);
        expect(episode.childIndex).toBe(1);
        expect(episode.title).toBe('Episode 1');
        expect(episode.type).toBe(ArtifactType.ANIME_EPISODE);
        expect(episode.releaseDate).toEqual(currentDate);
        expect(episode.duration).toBe(24);
        expect(episode.parent).toBeNull();
        expect(episode.children).toEqual([]);
        expect(episode.links).toEqual([]);
        expect(episode.genres).toEqual([]);
        expect(episode.ratings).toEqual([]);
        expect(episode.tags).toEqual([]);
        expect(episode.userInfo).toBeNull();
    });

    test('should format episode numbering correctly', () => {
        expect(episode.numbering).toBe('E01');
        
        episode = new AnimeEpisode(2, 12, 'Episode 12', ArtifactType.ANIME_EPISODE, currentDate, 24);
        expect(episode.numbering).toBe('E12');

        episode = new AnimeEpisode(3, null, 'Special', ArtifactType.ANIME_EPISODE, currentDate, 24);
        expect(episode.numbering).toBeNull();
    });

    test('should always return null for mean rating', () => {
        expect(episode.meanRating).toBeNull();

        episode.ratings = [
            new Rating(RatingType.MAL, 85),
            new Rating(RatingType.MAL, 75)
        ];

        expect(episode.meanRating).toBeNull();
    });

    test('should throw error when computing last and next ongoing', () => {
        expect(() => episode.computeLastAndNextOngoing()).toThrow('Not Compatible with this Artifact');
    });

    test('should serialize to JSON', () => {
        const link = new Link(LinkType.MAL, 'https://example.com');
        const genre = new Genre(1, 'Action');
        const rating = new Rating(RatingType.MAL, 85);
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
            title: 'Episode 1',
            type: ArtifactType.ANIME_EPISODE,
            children: [],
            childIndex: 1,
            releaseDate: currentDate.toISOString(),
            duration: 24,
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
            title: 'Episode 1',
            type: ArtifactType.ANIME_EPISODE,
            children: [],
            childIndex: 1,
            releaseDate: currentDate.toISOString(),
            duration: 24,
            links: [{ 
                __type: 'Link',
                type: LinkType.MAL,
                url: 'https://example.com'
            }],
            genres: [{ 
                __type: 'Genre',
                id: 1,
                title: 'Action'
            }],
            ratings: [{ 
                __type: 'Rating',
                type: RatingType.MAL,
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

        const data = AnimeEpisode.fromJSON(json);

        expect(data).toBeInstanceOf(AnimeEpisode);
        expect(data.id).toBe(1);
        expect(data.title).toBe('Episode 1');
        expect(data.type).toBe(ArtifactType.ANIME_EPISODE);
        expect(data.childIndex).toBe(1);
        expect(data.releaseDate).toEqual(currentDate);
        expect(data.duration).toBe(24);
        expect(data.links[0]).toBeInstanceOf(Link);
        expect(data.genres[0]).toBeInstanceOf(Genre);
        expect(data.ratings[0]).toBeInstanceOf(Rating);
        expect(data.tags[0]).toBeInstanceOf(Tag);
        expect(data.userInfo).toBeInstanceOf(UserArtifact);
    });
});