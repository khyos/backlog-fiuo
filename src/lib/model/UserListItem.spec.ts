import { describe, expect, test } from 'vitest';
import { UserListItem, SERIALIZE_TYPE, type IUserListItem } from './UserListItem';
import { Movie } from './movie/Movie';
import { ArtifactType } from './Artifact';
import { UserArtifact, UserArtifactStatus } from './UserArtifact';
import { Game } from './game/Game';
import { Tvshow } from './tvshow/Tvshow';

describe('UserListItem', () => {
    const currentDate = new Date('2025-01-01');
    const movie = new Movie(1, 'Test Movie', ArtifactType.MOVIE, currentDate, 120);
    const userArtifact = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8.5, currentDate, currentDate);

    test('should create a user list item with correct initial values', () => {
        const userListItem = new UserListItem(movie, userArtifact);
        
        expect(userListItem.artifact).toBe(movie);
        expect(userListItem.userArtifact).toBe(userArtifact);
    });

    test('should serialize to JSON', () => {
        const userListItem = new UserListItem(movie, userArtifact);
        const json = userListItem.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            artifact: movie.toJSON(),
            userArtifact: userArtifact.toJSON()
        });
    });

    test('should deserialize movie from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            artifact: {
                __type: 'Movie',
                id: 1,
                title: 'Test Movie',
                type: ArtifactType.MOVIE,
                children: [],
                childIndex: null,
                releaseDate: currentDate.toISOString(),
                duration: 120,
                links: [],
                genres: [],
                ratings: [],
                meanRating: null,
                tags: [],
                userInfo: null
            },
            userArtifact: {
                __type: 'UserArtifact',
                userId: 1,
                artifactId: 1,
                status: UserArtifactStatus.FINISHED,
                score: 8.5,
                startDate: currentDate.toISOString(),
                endDate: currentDate.toISOString()
            }
        };

        const userListItem = UserListItem.fromJSON(json);

        expect(userListItem).toBeInstanceOf(UserListItem);
        expect(userListItem.artifact).toBeInstanceOf(Movie);
        expect(userListItem.artifact.title).toBe('Test Movie');
        expect(userListItem.userArtifact).toBeInstanceOf(UserArtifact);
        expect(userListItem.userArtifact.status).toBe(UserArtifactStatus.FINISHED);
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            artifact: movie.toJSON(),
            userArtifact: userArtifact.toJSON()
        };

        expect(() => UserListItem.fromJSON(json as IUserListItem)).toThrow('Invalid Type');
    });

    test('should throw error when deserializing invalid artifact type', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            artifact: {
                __type: 'InvalidType',
                id: 1,
                title: 'Test',
                type: 'INVALID',
                children: [],
                childIndex: null,
                releaseDate: currentDate.toISOString(),
                duration: 120,
                links: [],
                genres: [],
                ratings: [],
                meanRating: null,
                tags: [],
                userInfo: null
            },
            userArtifact: userArtifact.toJSON()
        };

        expect(() => UserListItem.fromJSON(json as IUserListItem)).toThrow('Invalid Artifact Type');
    });

    test('should deserialize different artifact types', () => {
        const game = new Game(2, 'Test Game', ArtifactType.GAME, currentDate, 120);
        const tvshow = new Tvshow(3, 'Test Show', ArtifactType.TVSHOW, currentDate, 120);

        const gameItem = new UserListItem(game, userArtifact);
        const tvshowItem = new UserListItem(tvshow, userArtifact);

        const gameJson = gameItem.toJSON();
        const tvshowJson = tvshowItem.toJSON();

        const deserializedGameItem = UserListItem.fromJSON(gameJson);
        const deserializedTvshowItem = UserListItem.fromJSON(tvshowJson);

        expect(deserializedGameItem.artifact).toBeInstanceOf(Game);
        expect(deserializedTvshowItem.artifact).toBeInstanceOf(Tvshow);
    });
});