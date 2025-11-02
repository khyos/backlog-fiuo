import { describe, expect, test } from 'vitest';
import { UserList, UserListOrder, SERIALIZE_TYPE, type IUserList } from './UserList';
import { ArtifactType } from './Artifact';
import { Movie } from './movie/Movie';

describe('UserList', () => {
    const currentDate = new Date('2025-01-01');
    const movie1 = new Movie(1, 'Test Movie 1', ArtifactType.MOVIE, currentDate, 120);
    const movie2 = new Movie(2, 'Test Movie 2', ArtifactType.MOVIE, currentDate, 130);

    test('should create a user list with correct initial values', () => {
        const userList = new UserList(1, ArtifactType.MOVIE, [movie1, movie2]);
        
        expect(userList.userId).toBe(1);
        expect(userList.artifactType).toBe(ArtifactType.MOVIE);
        expect(userList.artifacts).toEqual([movie1, movie2]);
    });

    test('should serialize to JSON', () => {
        const userList = new UserList(1, ArtifactType.MOVIE, [movie1, movie2]);
        const json = userList.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            userId: 1,
            artifactType: ArtifactType.MOVIE,
            artifacts: [movie1.toJSON(), movie2.toJSON()]
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            userId: 1,
            artifactType: ArtifactType.MOVIE,
            artifacts: [
                {
                    __type: 'Movie',
                    id: 1,
                    title: 'Test Movie 1',
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
                {
                    __type: 'Movie',
                    id: 2,
                    title: 'Test Movie 2',
                    type: ArtifactType.MOVIE,
                    children: [],
                    childIndex: null,
                    releaseDate: currentDate.toISOString(),
                    duration: 130,
                    links: [],
                    genres: [],
                    ratings: [],
                    meanRating: null,
                    tags: [],
                    userInfo: null
                }
            ]
        };

        const userList = UserList.fromJSON(json);

        expect(userList).toBeInstanceOf(UserList);
        expect(userList.userId).toBe(1);
        expect(userList.artifactType).toBe(ArtifactType.MOVIE);
        expect(userList.artifacts).toHaveLength(2);
        expect(userList.artifacts[0]).toBeInstanceOf(Movie);
        expect(userList.artifacts[0].title).toBe('Test Movie 1');
        expect(userList.artifacts[1]).toBeInstanceOf(Movie);
        expect(userList.artifacts[1].title).toBe('Test Movie 2');
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            userId: 1,
            artifactType: ArtifactType.MOVIE,
            artifacts: []
        };

        expect(() => UserList.fromJSON(json as IUserList)).toThrow('Invalid Type');
    });

    test('UserListOrder should have DATE_RELEASE value', () => {
        expect(UserListOrder.DATE_RELEASE).toBe('dateRelease');
    });
});