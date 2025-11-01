import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { runDbQueriesParallel } from '../database';
import { RatingDB } from './RatingDB';
import { RatingType } from '$lib/model/Rating';
import { ArtifactDB } from './ArtifactDB';
import { ArtifactType } from '$lib/model/Artifact';

describe('RatingDB', () => {
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM rating' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("artifact")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema
        ArtifactDB.createArtifactTable();
        RatingDB.createRatingTable();
    });

    beforeEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('addRating', () => {
        test('should add a rating to the database', async () => {
            // Create a test artifact first
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 85);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(1);
            expect(ratings[0].type).toBe(RatingType.METACRITIC);
            expect(ratings[0].rating).toBe(85);
        });

        test('should allow adding multiple ratings for the same artifact', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 85);
            await RatingDB.addRating(artifactId, RatingType.STEAM, 92);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(2);
            
            const metacriticRating = ratings.find(rating => rating.type === RatingType.METACRITIC);
            const steamRating = ratings.find(rating => rating.type === RatingType.STEAM);
            
            expect(metacriticRating).toBeDefined();
            expect(metacriticRating?.rating).toBe(85);
            expect(steamRating).toBeDefined();
            expect(steamRating?.rating).toBe(92);
        });

        test('should handle null rating values', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, null);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(1);
            expect(ratings[0].type).toBe(RatingType.METACRITIC);
            expect(ratings[0].rating).toBeNull();
        });

        test('should handle duplicate rating type for same artifact by throwing error', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            // Add first rating
            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 85);
            
            // Try to add another rating of the same type - should throw
            await expect(RatingDB.addRating(artifactId, RatingType.METACRITIC, 90))
                .rejects.toThrow();
        });

        test('should handle extreme rating values', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            // Test minimum value
            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 0);
            // Test maximum value
            await RatingDB.addRating(artifactId, RatingType.STEAM, 100);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(2);
            
            const metacriticRating = ratings.find(rating => rating.type === RatingType.METACRITIC);
            const steamRating = ratings.find(rating => rating.type === RatingType.STEAM);
            
            expect(metacriticRating?.rating).toBe(0);
            expect(steamRating?.rating).toBe(100);
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

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 85);
            await RatingDB.updateRating(artifactId, RatingType.METACRITIC, 90);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(1);
            expect(ratings[0].type).toBe(RatingType.METACRITIC);
            expect(ratings[0].rating).toBe(90);
        });

        test('should create new rating if it does not exist', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            // Update a rating that doesn't exist yet
            await RatingDB.updateRating(artifactId, RatingType.METACRITIC, 85);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(1);
            expect(ratings[0].type).toBe(RatingType.METACRITIC);
            expect(ratings[0].rating).toBe(85);
        });

        test('should update rating to null', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 85);
            await RatingDB.updateRating(artifactId, RatingType.METACRITIC, null);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(1);
            expect(ratings[0].type).toBe(RatingType.METACRITIC);
            expect(ratings[0].rating).toBeNull();
        });

        test('should not affect other ratings when updating one', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 85);
            await RatingDB.addRating(artifactId, RatingType.STEAM, 92);
            
            await RatingDB.updateRating(artifactId, RatingType.METACRITIC, 90);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(2);
            
            const metacriticRating = ratings.find(rating => rating.type === RatingType.METACRITIC);
            const steamRating = ratings.find(rating => rating.type === RatingType.STEAM);
            
            expect(metacriticRating?.rating).toBe(90);
            expect(steamRating?.rating).toBe(92);
        });
    });

    describe('getRatings', () => {
        test('should return empty array for artifact with no ratings', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toEqual([]);
        });

        test('should return all ratings for an artifact', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 85);
            await RatingDB.addRating(artifactId, RatingType.STEAM, 92);
            await RatingDB.addRating(artifactId, RatingType.OPENCRITIC, 78);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(3);
            
            const ratingTypes = ratings.map(rating => rating.type);
            expect(ratingTypes).toContain(RatingType.METACRITIC);
            expect(ratingTypes).toContain(RatingType.STEAM);
            expect(ratingTypes).toContain(RatingType.OPENCRITIC);
        });

        test('should return empty array for non-existing artifact', async () => {
            const ratings = await RatingDB.getRatings(999999);
            expect(ratings).toEqual([]);
        });

        test('should return Rating objects with correct properties', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, 85);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(1);
            
            const rating = ratings[0];
            expect(rating).toHaveProperty('type');
            expect(rating).toHaveProperty('rating');
            expect(rating.type).toBe(RatingType.METACRITIC);
            expect(rating.rating).toBe(85);
        });

        test('should handle ratings with null values', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            await RatingDB.addRating(artifactId, RatingType.METACRITIC, null);
            await RatingDB.addRating(artifactId, RatingType.STEAM, 92);

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(2);
            
            const metacriticRating = ratings.find(rating => rating.type === RatingType.METACRITIC);
            const steamRating = ratings.find(rating => rating.type === RatingType.STEAM);
            
            expect(metacriticRating?.rating).toBeNull();
            expect(steamRating?.rating).toBe(92);
        });
    });

    describe('Rating types coverage', () => {
        test('should work with all rating types', async () => {
            const artifactId = await ArtifactDB.createArtifact(
                'Test Game',
                ArtifactType.GAME,
                '',
                new Date('2024-01-01'),
                120
            );

            // Test all rating types
            const ratingTypes = [
                RatingType.MAL,
                RatingType.METACRITIC,
                RatingType.OPENCRITIC,
                RatingType.ROTTEN_TOMATOES_AUDIENCE,
                RatingType.ROTTEN_TOMATOES_CRITICS,
                RatingType.SENSCRITIQUE,
                RatingType.STEAM
            ];

            for (let i = 0; i < ratingTypes.length; i++) {
                await RatingDB.addRating(artifactId, ratingTypes[i], 80 + i);
            }

            const ratings = await RatingDB.getRatings(artifactId);
            expect(ratings).toHaveLength(ratingTypes.length);
            
            for (let i = 0; i < ratingTypes.length; i++) {
                const rating = ratings.find(r => r.type === ratingTypes[i]);
                expect(rating).toBeDefined();
                expect(rating?.rating).toBe(80 + i);
            }
        });
    });
});