import { describe, expect, test, beforeEach } from 'vitest';
import { Anime, SERIALIZE_TYPE } from './Anime';
import { AnimeEpisode } from './AnimeEpisode';
import { ArtifactType } from '../Artifact';
import { Link, LinkType } from '../Link';
import { Genre } from '../Genre';
import { Rating, RatingType } from '../Rating';
import { Tag, TagType } from '../Tag';
import { UserArtifact, UserArtifactStatus } from '../UserArtifact';

describe('Anime', () => {
    let anime: Anime;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        anime = new Anime(1, 'Test Anime', ArtifactType.ANIME, currentDate, 300);
    });

    test('should create an anime with correct initial values', () => {
        expect(anime.id).toBe(1);
        expect(anime.title).toBe('Test Anime');
        expect(anime.type).toBe(ArtifactType.ANIME);
        expect(anime.releaseDate).toEqual(currentDate);
        expect(anime.duration).toBe(300);
        expect(anime.children).toEqual([]);
        expect(anime.childIndex).toBeNull();
        expect(anime.links).toEqual([]);
        expect(anime.genres).toEqual([]);
        expect(anime.ratings).toEqual([]);
        expect(anime.tags).toEqual([]);
        expect(anime.userInfo).toBeNull();
        expect(anime.studio).toBeUndefined();
        expect(anime.source).toBeUndefined();
        expect(anime.status).toBeUndefined();
    });

    test('should compute mean rating correctly', () => {
        anime.ratings = [
            new Rating(RatingType.MAL, 85),
            new Rating(RatingType.MAL, 75)
        ];

        expect(anime.meanRating).toBe(80);
    });

    test('should compute mean rating as null when no ratings', () => {
        anime.ratings = [];
        expect(anime.meanRating).toBeNull();
    });

    describe('computeLastAndNextOngoing', () => {
        let episode1: AnimeEpisode;
        let episode2: AnimeEpisode;
        let episode3: AnimeEpisode;

        beforeEach(() => {
            episode1 = new AnimeEpisode(2, 1, 'Episode 1', ArtifactType.ANIME_EPISODE, currentDate, 24);
            episode2 = new AnimeEpisode(3, 2, 'Episode 2', ArtifactType.ANIME_EPISODE, currentDate, 24);
            episode3 = new AnimeEpisode(4, 3, 'Episode 3', ArtifactType.ANIME_EPISODE, currentDate, 24);
            episode1.parent = anime;
            episode2.parent = anime;
            episode3.parent = anime;
            anime.children = [episode1, episode2, episode3];
        });

        test('should return next episode when none are finished', () => {
            const result = anime.computeLastAndNextOngoing();
            expect(result.last).toBeNull();
            expect(result.next).toBe(episode1);
        });

        test('should return last finished and next unfinished episodes', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = anime.computeLastAndNextOngoing();
            expect(result.last).toBe(episode1);
            expect(result.next).toBe(episode2);
        });

        test('should return last finished episode when all are finished', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            episode2.updateUserStatus(UserArtifactStatus.FINISHED);
            episode3.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = anime.computeLastAndNextOngoing();
            expect(result.last).toBe(episode3);
            expect(result.next).toBeNull();
        });

        test('should handle non-sequential finished episodes', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            episode3.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = anime.computeLastAndNextOngoing();
            expect(result.last).toBe(episode1);
            expect(result.next).toBe(episode2);
        });
    });

    test('should serialize to JSON', () => {
        const link = new Link(LinkType.MAL, 'https://example.com');
        const genre = new Genre(1, 'Action');
        const rating = new Rating(RatingType.MAL, 85);
        const tag = new Tag('tag1', TagType.DEFAULT);
        const userInfo = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8.5, null, null);
        const episode = new AnimeEpisode(2, 1, 'Episode 1', ArtifactType.ANIME_EPISODE, currentDate, 24);

        anime.links = [link];
        anime.genres = [genre];
        anime.ratings = [rating];
        anime.tags = [tag];
        anime.userInfo = userInfo;
        anime.children = [episode];
        anime.studio = 'Test Studio';
        anime.source = 'Manga';
        anime.status = 'Finished';

        const json = anime.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Anime',
            type: ArtifactType.ANIME,
            children: [episode.toJSON()],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 300,
            links: [link.toJSON()],
            genres: [genre.toJSON()],
            ratings: [rating.toJSON()],
            meanRating: 85,
            tags: [tag.toJSON()],
            userInfo: userInfo.toJSON(),
            studio: 'Test Studio',
            source: 'Manga',
            status: 'Finished'
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Anime',
            type: ArtifactType.ANIME,
            children: [{
                __type: 'AnimeEpisode',
                id: 2,
                title: 'Episode 1',
                type: ArtifactType.ANIME_EPISODE,
                children: [],
                childIndex: 1,
                releaseDate: currentDate.toISOString(),
                duration: 24,
                links: [],
                genres: [],
                ratings: [],
                meanRating: null,
                tags: [],
                userInfo: null
            }],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 300,
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
            },
            studio: 'Test Studio',
            source: 'Manga',
            status: 'Finished'
        };

        const data = Anime.fromJSON(json);

        expect(data).toBeInstanceOf(Anime);
        expect(data.id).toBe(1);
        expect(data.title).toBe('Test Anime');
        expect(data.type).toBe(ArtifactType.ANIME);
        expect(data.releaseDate).toEqual(currentDate);
        expect(data.duration).toBe(300);
        expect(data.children[0]).toBeInstanceOf(AnimeEpisode);
        expect(data.children[0].parent).toBe(data);
        expect(data.links[0]).toBeInstanceOf(Link);
        expect(data.genres[0]).toBeInstanceOf(Genre);
        expect(data.ratings[0]).toBeInstanceOf(Rating);
        expect(data.tags[0]).toBeInstanceOf(Tag);
        expect(data.userInfo).toBeInstanceOf(UserArtifact);
        expect(data.studio).toBe('Test Studio');
        expect(data.source).toBe('Manga');
        expect(data.status).toBe('Finished');
    });
});