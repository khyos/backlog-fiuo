import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { runDbQueriesParallel, getDbRow } from '../database';
import { UserRatingDB, type IUserRatingDB } from './UserRatingDB';
import { ArtifactDB } from './ArtifactDB';
import { UserDB } from './UserDB';
import { ArtifactType } from '$lib/model/Artifact';

describe('UserRatingDB', () => {
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM user_rating' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM user' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("artifact", "user")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema
        await ArtifactDB.createArtifactTable();
        await UserDB.createUserTable();
        await UserRatingDB.createUserRatingTable();
    });

    beforeEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('addRating', () => {
        test('should add a user rating to the database', async () => {
            // Create test artifact and user
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', 85);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            
            expect(rating).not.toBeNull();
            expect(rating?.artifactId).toBe(artifactId);
            expect(rating?.username).toBe('testuser');
            expect(rating?.rating).toBe(85);
        });

        test('should handle null rating values', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', null);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            
            expect(rating).not.toBeNull();
            expect(rating?.rating).toBeNull();
        });

        test('should handle extreme rating values', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            // Test with minimum and maximum values
            await UserRatingDB.addRating(artifactId, 'testuser', 0);
            
            let rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            expect(rating?.rating).toBe(0);

            // Clean up and test maximum
            await runDbQueriesParallel([{ query: 'DELETE FROM user_rating' }]);
            await UserRatingDB.addRating(artifactId, 'testuser', 100);
            
            rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            expect(rating?.rating).toBe(100);
        });

        test('should handle negative ratings', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', -1);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            expect(rating?.rating).toBe(-1);
        });

        test('should allow different users to rate the same artifact', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('user1', 'password123');
            await UserDB.signUp('user2', 'password456');

            await UserRatingDB.addRating(artifactId, 'user1', 85);
            await UserRatingDB.addRating(artifactId, 'user2', 75);

            const rating1 = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'user1']
            );
            const rating2 = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'user2']
            );

            expect(rating1?.rating).toBe(85);
            expect(rating2?.rating).toBe(75);
        });

        test('should allow same user to rate different artifacts', async () => {
            const artifact1Id = await ArtifactDB.createArtifact(
                'Test Game 1',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            const artifact2Id = await ArtifactDB.createArtifact(
                'Test Game 2',
                ArtifactType.GAME,
                '',
                new Date('2024-02-01'),
                90
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifact1Id, 'testuser', 85);
            await UserRatingDB.addRating(artifact2Id, 'testuser', 75);

            const rating1 = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifact1Id, 'testuser']
            );
            const rating2 = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifact2Id, 'testuser']
            );

            expect(rating1?.rating).toBe(85);
            expect(rating2?.rating).toBe(75);
        });

        test('should handle duplicate rating by throwing error', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', 85);

            // Try to add duplicate rating - should throw
            await expect(UserRatingDB.addRating(artifactId, 'testuser', 90))
                .rejects.toThrow();
        });

        test('should handle special characters in username', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            const specialUsername = 'test@user.com';
            await UserDB.signUp(specialUsername, 'password123');

            await UserRatingDB.addRating(artifactId, specialUsername, 85);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, specialUsername]
            );
            
            expect(rating?.username).toBe(specialUsername);
            expect(rating?.rating).toBe(85);
        });
    });

    describe('updateRating', () => {
        test('should update an existing rating', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', 85);
            await UserRatingDB.updateRating(artifactId, 'testuser', 90);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            
            expect(rating?.rating).toBe(90);
        });

        test('should create new rating if it does not exist', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            // Update a rating that doesn't exist yet
            await UserRatingDB.updateRating(artifactId, 'testuser', 85);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            
            expect(rating).not.toBeNull();
            expect(rating?.rating).toBe(85);
        });

        test('should update rating to null', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', 85);
            await UserRatingDB.updateRating(artifactId, 'testuser', null);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            
            expect(rating?.rating).toBeNull();
        });

        test('should update rating from null to a value', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', null);
            await UserRatingDB.updateRating(artifactId, 'testuser', 85);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            
            expect(rating?.rating).toBe(85);
        });

        test('should handle multiple updates', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', 70);
            await UserRatingDB.updateRating(artifactId, 'testuser', 80);
            await UserRatingDB.updateRating(artifactId, 'testuser', 90);
            await UserRatingDB.updateRating(artifactId, 'testuser', 85);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            
            expect(rating?.rating).toBe(85);
        });

        test('should not affect other user ratings when updating', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('user1', 'password123');
            await UserDB.signUp('user2', 'password456');

            await UserRatingDB.addRating(artifactId, 'user1', 85);
            await UserRatingDB.addRating(artifactId, 'user2', 75);
            
            await UserRatingDB.updateRating(artifactId, 'user1', 90);

            const rating1 = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'user1']
            );
            const rating2 = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'user2']
            );

            expect(rating1?.rating).toBe(90);
            expect(rating2?.rating).toBe(75); // Should remain unchanged
        });

        test('should not affect ratings for other artifacts when updating', async () => {
            const artifact1Id = await ArtifactDB.createArtifact(
                'Test Game 1',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            const artifact2Id = await ArtifactDB.createArtifact(
                'Test Game 2',
                ArtifactType.GAME,
                '',
                new Date('2024-02-01'),
                90
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifact1Id, 'testuser', 85);
            await UserRatingDB.addRating(artifact2Id, 'testuser', 75);
            
            await UserRatingDB.updateRating(artifact1Id, 'testuser', 90);

            const rating1 = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifact1Id, 'testuser']
            );
            const rating2 = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifact2Id, 'testuser']
            );

            expect(rating1?.rating).toBe(90);
            expect(rating2?.rating).toBe(75); // Should remain unchanged
        });

        test('should handle extreme values during update', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            await UserRatingDB.addRating(artifactId, 'testuser', 50);
            
            // Update to minimum value
            await UserRatingDB.updateRating(artifactId, 'testuser', 0);
            let rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            expect(rating?.rating).toBe(0);

            // Update to maximum value
            await UserRatingDB.updateRating(artifactId, 'testuser', 100);
            rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            expect(rating?.rating).toBe(100);

            // Update to negative value
            await UserRatingDB.updateRating(artifactId, 'testuser', -10);
            rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            expect(rating?.rating).toBe(-10);
        });
    });

    describe('Integration and edge cases', () => {
        test('should handle non-existent artifact ID', async () => {
            await UserDB.signUp('testuser', 'password123');

            // This should either succeed or handle gracefully
            await expect(UserRatingDB.addRating(999999, 'testuser', 85))
                .resolves.not.toThrow();
        });

        test('should handle non-existent username', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            // This should either succeed or handle gracefully
            await expect(UserRatingDB.addRating(artifactId, 'nonexistentuser', 85))
                .resolves.not.toThrow();
        });

        test('should handle very long usernames', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            const longUsername = 'a'.repeat(100);
            await UserDB.signUp(longUsername, 'password123');

            await UserRatingDB.addRating(artifactId, longUsername, 85);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, longUsername]
            );
            
            expect(rating?.username).toBe(longUsername);
            expect(rating?.rating).toBe(85);
        });

        test('should handle unicode characters in username', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            const unicodeUsername = 'テストユーザー';
            await UserDB.signUp(unicodeUsername, 'password123');

            await UserRatingDB.addRating(artifactId, unicodeUsername, 85);

            const rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, unicodeUsername]
            );
            
            expect(rating?.username).toBe(unicodeUsername);
            expect(rating?.rating).toBe(85);
        });

        test('should maintain data consistency across add and update operations', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );
            await UserDB.signUp('testuser', 'password123');

            // Add rating
            await UserRatingDB.addRating(artifactId, 'testuser', 85);
            
            // Verify it was added
            let rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            expect(rating?.rating).toBe(85);

            // Update rating
            await UserRatingDB.updateRating(artifactId, 'testuser', 90);
            
            // Verify it was updated
            rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']  
            );
            expect(rating?.rating).toBe(90);

            // Update to null
            await UserRatingDB.updateRating(artifactId, 'testuser', null);
            
            // Verify it was updated to null
            rating = await getDbRow<IUserRatingDB>(
                'SELECT * FROM user_rating WHERE artifactId = ? AND username = ?',
                [artifactId, 'testuser']
            );
            expect(rating?.rating).toBeNull();
        });
    });
});