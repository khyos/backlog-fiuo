import { describe, expect, test, beforeEach } from 'vitest';
import { Game, SERIALIZE_TYPE } from './Game';
import { Platform } from './Platform';
import { ArtifactType } from '../Artifact';
import { Link, LinkType } from '../Link';
import { Genre } from '../Genre';
import { Rating, RatingType } from '../Rating';
import { Tag, TagType } from '../Tag';
import { UserArtifact, UserArtifactStatus } from '../UserArtifact';

describe('Game', () => {
    let game: Game;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        game = new Game(1, 'Test Game', ArtifactType.GAME, currentDate, 20);
    });

    test('should create a game with correct initial values', () => {
        expect(game.id).toBe(1);
        expect(game.title).toBe('Test Game');
        expect(game.type).toBe(ArtifactType.GAME);
        expect(game.releaseDate).toEqual(currentDate);
        expect(game.duration).toBe(20);
        expect(game.children).toEqual([]);
        expect(game.childIndex).toBeNull();
        expect(game.links).toEqual([]);
        expect(game.genres).toEqual([]);
        expect(game.ratings).toEqual([]);
        expect(game.tags).toEqual([]);
        expect(game.userInfo).toBeNull();
        expect(game.platforms).toEqual([]);
    });

    describe('computeMeanRating', () => {
        test('should return null when no ratings exist', () => {
            expect(game.meanRating).toBeNull();
        });

        test('should compute mean of Metacritic and OpenCritic ratings', () => {
            game.ratings = [
                new Rating(RatingType.METACRITIC, 80),
                new Rating(RatingType.OPENCRITIC, 90)
            ];

            expect(game.meanRating).toBe(85);
        });

        test('should use only Metacritic when OpenCritic is not available', () => {
            game.ratings = [
                new Rating(RatingType.METACRITIC, 80)
            ];

            expect(game.meanRating).toBe(80);
        });

        test('should use only OpenCritic when Metacritic is not available', () => {
            game.ratings = [
                new Rating(RatingType.OPENCRITIC, 90)
            ];

            expect(game.meanRating).toBe(90);
        });

        test('should compute weighted mean of SensCritique and Steam ratings', () => {
            game.ratings = [
                new Rating(RatingType.SENSCRITIQUE, 80),
                new Rating(RatingType.STEAM, 95) // Steam ratings are weighted at 0.2
            ];

            // (80 + 0.2 * 95) / 1.2 ≈ 82.5
            expect(game.meanRating).toBe(82.5);
        });

        test('should use only SensCritique when Steam is not available', () => {
            game.ratings = [
                new Rating(RatingType.SENSCRITIQUE, 80)
            ];

            expect(game.meanRating).toBe(80);
        });

        test('should use only Steam when SensCritique is not available', () => {
            game.ratings = [
                new Rating(RatingType.STEAM, 95)
            ];

            expect(game.meanRating).toBe(95);
        });

        test('should compute average of professional and user ratings', () => {
            game.ratings = [
                new Rating(RatingType.METACRITIC, 80),
                new Rating(RatingType.OPENCRITIC, 90),
                new Rating(RatingType.SENSCRITIQUE, 85),
                new Rating(RatingType.STEAM, 95)
            ];

            // First group: (80 + 90) / 2 = 85
            // Second group: (85 + 0.2 * 95) / 1.2 ≈ 86.66
            // Final: (85 + 86.66) / 2 ≈ 85.83
            expect(game.meanRating).toBeCloseTo(85.83, 2);
        });

        test('should ignore non-game rating sources', () => {
            game.ratings = [
                new Rating(RatingType.METACRITIC, 80),
                new Rating(RatingType.MAL, 90), // MAL should be ignored
                new Rating(RatingType.ROTTEN_TOMATOES_CRITICS, 85) // RT should be ignored
            ];

            expect(game.meanRating).toBe(80);
        });
    });

    test('should throw error when computing last and next ongoing', () => {
        expect(() => game.computeLastAndNextOngoing()).toThrow('Not Compatible with this Artifact');
    });

    test('should serialize to JSON', () => {
        const link = new Link(LinkType.STEAM, 'https://example.com');
        const genre = new Genre(1, 'Action');
        const rating = new Rating(RatingType.METACRITIC, 85);
        const tag = new Tag('tag1', TagType.DEFAULT);
        const userInfo = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8.5, null, null);
        const platform = new Platform(1, 'PlayStation 5');

        game.links = [link];
        game.genres = [genre];
        game.ratings = [rating];
        game.tags = [tag];
        game.userInfo = userInfo;
        game.platforms = [platform];

        const json = game.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Game',
            type: ArtifactType.GAME,
            children: [],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 20,
            links: [link.toJSON()],
            genres: [genre.toJSON()],
            ratings: [rating.toJSON()],
            meanRating: 85,
            tags: [tag.toJSON()],
            userInfo: userInfo.toJSON(),
            platforms: [platform.toJSON()]
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Game',
            type: ArtifactType.GAME,
            children: [],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 20,
            links: [{ 
                __type: 'Link',
                type: LinkType.STEAM,
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
            },
            platforms: [{
                __type: 'Platform',
                id: 1,
                title: 'PlayStation 5'
            }]
        };

        const data = Game.fromJSON(json);

        expect(data).toBeInstanceOf(Game);
        expect(data.id).toBe(1);
        expect(data.title).toBe('Test Game');
        expect(data.type).toBe(ArtifactType.GAME);
        expect(data.releaseDate).toEqual(currentDate);
        expect(data.duration).toBe(20);
        expect(data.links[0]).toBeInstanceOf(Link);
        expect(data.genres[0]).toBeInstanceOf(Genre);
        expect(data.ratings[0]).toBeInstanceOf(Rating);
        expect(data.tags[0]).toBeInstanceOf(Tag);
        expect(data.userInfo).toBeInstanceOf(UserArtifact);
        expect(data.platforms[0]).toBeInstanceOf(Platform);
        expect(data.platforms[0].title).toBe('PlayStation 5');
    });

    test('should handle missing platforms during deserialization', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Game',
            type: ArtifactType.GAME,
            children: [],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 20,
            links: [],
            genres: [],
            ratings: [],
            meanRating: null,
            tags: [],
            userInfo: null
        };

        const data = Game.fromJSON(json);
        expect(data.platforms).toEqual([]);
    });
});