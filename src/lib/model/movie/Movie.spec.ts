import { describe, expect, test, beforeEach } from 'vitest';
import { Movie, SERIALIZE_TYPE } from './Movie';
import { ArtifactType } from '../Artifact';
import { Link, LinkType } from '../Link';
import { Genre } from '../Genre';
import { Rating, RatingType } from '../Rating';
import { Tag, TagType } from '../Tag';
import { UserArtifact, UserArtifactStatus } from '../UserArtifact';

describe('Movie', () => {
    let movie: Movie;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        movie = new Movie(1, 'Test Movie', ArtifactType.MOVIE, currentDate, 120);
    });

    test('should create a movie with correct initial values', () => {
        expect(movie.id).toBe(1);
        expect(movie.title).toBe('Test Movie');
        expect(movie.type).toBe(ArtifactType.MOVIE);
        expect(movie.releaseDate).toEqual(currentDate);
        expect(movie.duration).toBe(120);
        expect(movie.children).toEqual([]);
        expect(movie.childIndex).toBeNull();
        expect(movie.links).toEqual([]);
        expect(movie.genres).toEqual([]);
        expect(movie.ratings).toEqual([]);
        expect(movie.tags).toEqual([]);
        expect(movie.userInfo).toBeNull();
    });

    test('should compute mean rating correctly', () => {
        movie.ratings = [
            new Rating(RatingType.METACRITIC, 85),
            new Rating(RatingType.METACRITIC, 75)
        ];

        expect(movie.meanRating).toBe(80);
    });

    test('should handle empty ratings array', () => {
        movie.ratings = [];
        expect(movie.meanRating).toBeNull();
    });

    test('should not support computeLastAndNextOngoing', () => {
        expect(() => movie.computeLastAndNextOngoing()).toThrow('Not Compatible with this Artifact');
    });

    test('should serialize to JSON', () => {
        const link = new Link(LinkType.TMDB, 'https://example.com');
        const genre = new Genre(1, 'Action');
        const rating = new Rating(RatingType.METACRITIC, 85);
        const tag = new Tag('tag1', TagType.DEFAULT);
        const userInfo = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8.5, null, null);

        movie.links = [link];
        movie.genres = [genre];
        movie.ratings = [rating];
        movie.tags = [tag];
        movie.userInfo = userInfo;

        const json = movie.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Movie',
            type: ArtifactType.MOVIE,
            children: [],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 120,
            links: [link.toJSON()],
            genres: [genre.toJSON()],
            ratings: [rating.toJSON()],
            meanRating: 85,
            tags: [tag.toJSON()],
            userInfo: userInfo.toJSON()
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Movie',
            type: ArtifactType.MOVIE,
            children: [],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 120,
            links: [{ 
                __type: 'Link',
                type: LinkType.TMDB,
                url: 'https://example.com'
            }],
            genres: [{ 
                __type: 'Genre',
                id: 1,
                title: 'Action'
            }],
            ratings: [{ 
                __type: 'Rating',
                type: RatingType.METACRITIC,
                rating: 85
            }],
            meanRating: 85,
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

        const data = Movie.fromJSON(json);

        expect(data).toBeInstanceOf(Movie);
        expect(data.id).toBe(1);
        expect(data.title).toBe('Test Movie');
        expect(data.type).toBe(ArtifactType.MOVIE);
        expect(data.releaseDate).toEqual(currentDate);
        expect(data.duration).toBe(120);
        expect(data.links[0]).toBeInstanceOf(Link);
        expect(data.genres[0]).toBeInstanceOf(Genre);
        expect(data.ratings[0]).toBeInstanceOf(Rating);
        expect(data.tags[0]).toBeInstanceOf(Tag);
        expect(data.userInfo).toBeInstanceOf(UserArtifact);
    });
});