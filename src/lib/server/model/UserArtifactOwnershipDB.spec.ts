import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { runDbQueries } from '../database';
import { UserArtifactOwnershipDB } from './UserArtifactOwnershipDB';
import { UserDB } from './UserDB';
import { ArtifactDB } from './ArtifactDB';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactOwnership } from '$lib/model/UserArtifactOwnership';

describe('UserArtifactOwnershipDB', () => {
    let userId: number;
    let artifactId: number;

    const cleanupTestData = async () => {
        await runDbQueries([
            { query: 'DELETE FROM user_artifact_ownership' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM user' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("user_artifact_ownership", "artifact", "user")' }
        ]);
    };

    beforeAll(async () => {
        await UserDB.createUserTable();
        await ArtifactDB.createArtifactTable();
        await UserArtifactOwnershipDB.createUserArtifactOwnershipTable();
    });

    beforeEach(async () => {
        await cleanupTestData();
        await UserDB.signUp('testuser', 'password123');
        const user = await UserDB.getByUsername('testuser');
        userId = user!.id;
        artifactId = await ArtifactDB.createArtifact('Test Game', ArtifactType.GAME, '', new Date('2024-01-01'), 0);
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('addOwnership', () => {
        test('should add ownership and return the new id', async () => {
            const id = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', 'Bought on sale');
            expect(id).toBeGreaterThan(0);
        });

        test('should add ownership with null note', async () => {
            const id = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'GOG', null);
            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(id).toBeGreaterThan(0);
            expect(ownerships[0].note).toBeNull();
        });

        test('should return different ids for different records', async () => {
            const id1 = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', null);
            const id2 = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'GOG', null);
            expect(id1).not.toBe(id2);
        });
    });

    describe('getOwnershipsForUser', () => {
        test('should return empty array when no ownership exists', async () => {
            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships).toEqual([]);
        });

        test('should return ownerships for user and artifact', async () => {
            await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', 'Gift');
            await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'GOG', null);

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships).toHaveLength(2);
            expect(ownerships[0]).toBeInstanceOf(UserArtifactOwnership);
            expect(ownerships.map(o => o.platform)).toContain('Steam');
            expect(ownerships.map(o => o.platform)).toContain('GOG');
        });

        test('should not return ownership from a different user', async () => {
            await UserDB.signUp('otheruser', 'password456');
            const otherUser = await UserDB.getByUsername('otheruser');
            await UserArtifactOwnershipDB.addOwnership(otherUser!.id, artifactId, 'Steam', null);

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships).toHaveLength(0);
        });

        test('should not return ownership for a different artifact', async () => {
            const otherArtifactId = await ArtifactDB.createArtifact('Other Game', ArtifactType.GAME, '', new Date('2024-01-01'), 0);
            await UserArtifactOwnershipDB.addOwnership(userId, otherArtifactId, 'Steam', null);

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships).toHaveLength(0);
        });
    });

    describe('getOwnershipsForUserBatch', () => {
        test('should return empty map for empty artifact array', async () => {
            const result = await UserArtifactOwnershipDB.getOwnershipsForUserBatch(userId, []);
            expect(result.size).toBe(0);
        });

        test('should return map grouped by artifactId', async () => {
            const artifactId2 = await ArtifactDB.createArtifact('Other Game', ArtifactType.GAME, '', new Date('2024-01-01'), 0);
            await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', null);
            await UserArtifactOwnershipDB.addOwnership(userId, artifactId2, 'GOG', 'Gift');

            const result = await UserArtifactOwnershipDB.getOwnershipsForUserBatch(userId, [artifactId, artifactId2]);
            expect(result.size).toBe(2);
            expect(result.get(artifactId)).toHaveLength(1);
            expect(result.get(artifactId2)).toHaveLength(1);
            expect(result.get(artifactId)![0].platform).toBe('Steam');
            expect(result.get(artifactId2)![0].platform).toBe('GOG');
        });

        test('should return empty map when user has no ownerships', async () => {
            const result = await UserArtifactOwnershipDB.getOwnershipsForUserBatch(userId, [artifactId]);
            expect(result.size).toBe(0);
        });
    });

    describe('updateOwnership', () => {
        test('should update platform and note', async () => {
            const id = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', 'Old note');
            await UserArtifactOwnershipDB.updateOwnership(id, userId, 'GOG', 'New note');

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships[0].platform).toBe('GOG');
            expect(ownerships[0].note).toBe('New note');
        });

        test('should update note to null', async () => {
            const id = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', 'Has note');
            await UserArtifactOwnershipDB.updateOwnership(id, userId, 'Steam', null);

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships[0].note).toBeNull();
        });

        test('should not update when userId does not match', async () => {
            await UserDB.signUp('otheruser', 'password456');
            const otherUser = await UserDB.getByUsername('otheruser');
            const id = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', null);
            await UserArtifactOwnershipDB.updateOwnership(id, otherUser!.id, 'GOG', null);

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships[0].platform).toBe('Steam');
        });
    });

    describe('deleteOwnership', () => {
        test('should delete an ownership record', async () => {
            const id = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', null);
            await UserArtifactOwnershipDB.deleteOwnership(id, userId);

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships).toHaveLength(0);
        });

        test('should not delete ownership from a different user', async () => {
            await UserDB.signUp('otheruser', 'password456');
            const otherUser = await UserDB.getByUsername('otheruser');
            const id = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', null);
            await UserArtifactOwnershipDB.deleteOwnership(id, otherUser!.id);

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships).toHaveLength(1);
        });

        test('should not affect other ownership records', async () => {
            const id1 = await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'Steam', null);
            await UserArtifactOwnershipDB.addOwnership(userId, artifactId, 'GOG', null);
            await UserArtifactOwnershipDB.deleteOwnership(id1, userId);

            const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(userId, artifactId);
            expect(ownerships).toHaveLength(1);
            expect(ownerships[0].platform).toBe('GOG');
        });
    });
});
