import { describe, expect, test } from 'vitest';
import { UserArtifact, UserArtifactStatus, SERIALIZE_TYPE } from './UserArtifact';

describe('UserArtifact', () => {
    const currentDate = new Date('2025-01-01');

    test('should create a user artifact with correct initial values', () => {
        const userArtifact = new UserArtifact(1, 100, UserArtifactStatus.ON_GOING, 8.5, currentDate, null);
        
        expect(userArtifact.userId).toBe(1);
        expect(userArtifact.artifactId).toBe(100);
        expect(userArtifact.status).toBe(UserArtifactStatus.ON_GOING);
        expect(userArtifact.score).toBe(8.5);
        expect(userArtifact.startDate).toEqual(currentDate);
        expect(userArtifact.endDate).toBeNull();
    });

    test('should handle null values', () => {
        const userArtifact = new UserArtifact(1, 100, null, null, null, null);
        
        expect(userArtifact.status).toBeNull();
        expect(userArtifact.score).toBeNull();
        expect(userArtifact.startDate).toBeNull();
        expect(userArtifact.endDate).toBeNull();
    });

    test('should serialize to JSON', () => {
        const userArtifact = new UserArtifact(1, 100, UserArtifactStatus.ON_GOING, 8.5, currentDate, null);
        const json = userArtifact.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            userId: 1,
            artifactId: 100,
            status: UserArtifactStatus.ON_GOING,
            score: 8.5,
            startDate: currentDate.toISOString(),
            endDate: null
        });
    });

    test('should serialize with null values', () => {
        const userArtifact = new UserArtifact(1, 100, null, null, null, null);
        const json = userArtifact.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            userId: 1,
            artifactId: 100,
            status: null,
            score: null,
            startDate: null,
            endDate: null
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            userId: 1,
            artifactId: 100,
            status: UserArtifactStatus.ON_GOING,
            score: 8.5,
            startDate: currentDate.toISOString(),
            endDate: null
        };

        const userArtifact = UserArtifact.fromJSON(json);

        expect(userArtifact).toBeInstanceOf(UserArtifact);
        expect(userArtifact.userId).toBe(1);
        expect(userArtifact.artifactId).toBe(100);
        expect(userArtifact.status).toBe(UserArtifactStatus.ON_GOING);
        expect(userArtifact.score).toBe(8.5);
        expect(userArtifact.startDate).toEqual(currentDate);
        expect(userArtifact.endDate).toBeNull();
    });

    test('should deserialize with null values', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            userId: 1,
            artifactId: 100,
            status: null,
            score: null,
            startDate: null,
            endDate: null
        };

        const userArtifact = UserArtifact.fromJSON(json);

        expect(userArtifact.status).toBeNull();
        expect(userArtifact.score).toBeNull();
        expect(userArtifact.startDate).toBeNull();
        expect(userArtifact.endDate).toBeNull();
    });
});