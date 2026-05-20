import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { runDbQueries } from '../database';
import { SubscriptionServiceDB } from './SubscriptionServiceDB';
import { UserDB } from './UserDB';
import { ArtifactDB } from './ArtifactDB';
import { ArtifactType } from '$lib/model/Artifact';
import { SubscriptionService } from '$lib/model/SubscriptionService';

describe('SubscriptionServiceDB', () => {
    let userId: number;
    let artifactId: number;

    const cleanupTestData = async () => {
        await runDbQueries([
            { query: 'DELETE FROM artifact_subscription' },
            { query: 'DELETE FROM user_subscription' },
            { query: 'DELETE FROM subscription_service' },
            { query: 'DELETE FROM artifact' },
            { query: 'DELETE FROM user' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("subscription_service", "artifact", "user")' }
        ]);
    };

    beforeAll(async () => {
        await UserDB.createUserTable();
        await ArtifactDB.createArtifactTable();
        await SubscriptionServiceDB.createSubscriptionServiceTable();
        await SubscriptionServiceDB.createArtifactSubscriptionTable();
        await SubscriptionServiceDB.createUserSubscriptionTable();
    });

    beforeEach(async () => {
        await cleanupTestData();
        await UserDB.signUp('testuser', 'password123');
        const user = await UserDB.getByUsername('testuser');
        userId = user!.id;
        artifactId = await ArtifactDB.createArtifact('Test Movie', ArtifactType.MOVIE, '', new Date('2024-01-01'), 120);
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('addService', () => {
        test('should add a service with null artifactType and return its id', async () => {
            const id = await SubscriptionServiceDB.addService('Netflix', null);
            expect(id).toBeGreaterThan(0);
        });

        test('should add a service scoped to a specific artifactType', async () => {
            const id = await SubscriptionServiceDB.addService('Game Pass', ArtifactType.GAME);
            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            expect(services.find(s => s.id === id)?.artifactType).toBe(ArtifactType.GAME);
        });
    });

    describe('deleteService', () => {
        test('should delete an existing service', async () => {
            const id = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.deleteService(id);
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services.find(s => s.id === id)).toBeUndefined();
        });

        test('should be a no-op when deleting a non-existent service', async () => {
            await expect(SubscriptionServiceDB.deleteService(99999)).resolves.not.toThrow();
        });
    });

    describe('getAllServices', () => {
        test('should return empty array when no services exist', async () => {
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toEqual([]);
        });

        test('should return all services when no filter applied', async () => {
            await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.addService('Game Pass', ArtifactType.GAME);
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(2);
            expect(services[0]).toBeInstanceOf(SubscriptionService);
        });

        test('should return null-type and matching-type services when filtered by artifactType', async () => {
            await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.addService('Game Pass', ArtifactType.GAME);
            await SubscriptionServiceDB.addService('Crunchyroll', ArtifactType.ANIME);

            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            expect(services).toHaveLength(2);
            const names = services.map(s => s.name);
            expect(names).toContain('Netflix');
            expect(names).toContain('Game Pass');
            expect(names).not.toContain('Crunchyroll');
        });

        test('should return services ordered by name', async () => {
            await SubscriptionServiceDB.addService('Zzz Service', null);
            await SubscriptionServiceDB.addService('Aaa Service', null);
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services[0].name).toBe('Aaa Service');
            expect(services[1].name).toBe('Zzz Service');
        });
    });

    describe('seedPredefinedServices', () => {
        test('should insert 12 predefined services', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(12);
        });
    });

    describe('getServicesForArtifact', () => {
        test('should return empty array for artifact with no linked services', async () => {
            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toEqual([]);
        });

        test('should return linked services for an artifact', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
            expect(services[0]).toBeInstanceOf(SubscriptionService);
            expect(services[0].name).toBe('Netflix');
        });

        test('should not return services linked to other artifacts', async () => {
            const otherArtifactId = await ArtifactDB.createArtifact('Other Movie', ArtifactType.MOVIE, '', new Date('2024-01-01'), 90);
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(otherArtifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(0);
        });
    });

    describe('linkArtifactToService', () => {
        test('should link an artifact to a service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
        });

        test('should be idempotent', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
        });
    });

    describe('unlinkArtifactFromService', () => {
        test('should remove the link between artifact and service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
            await SubscriptionServiceDB.unlinkArtifactFromService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(0);
        });

        test('should be a no-op when link does not exist', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await expect(SubscriptionServiceDB.unlinkArtifactFromService(artifactId, serviceId)).resolves.not.toThrow();
        });
    });

    describe('syncArtifactSubscriptions', () => {
        test('should replace all artifact services with a new list', async () => {
            const id1 = await SubscriptionServiceDB.addService('Netflix', null);
            const id2 = await SubscriptionServiceDB.addService('Disney+', null);
            const id3 = await SubscriptionServiceDB.addService('Max', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, id1);

            const allServices = [
                new SubscriptionService(id1, 'Netflix', null),
                new SubscriptionService(id2, 'Disney+', null),
                new SubscriptionService(id3, 'Max', null),
            ];
            await SubscriptionServiceDB.syncArtifactSubscriptions(artifactId, ['Disney+', 'Max'], allServices);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(2);
            const names = services.map(s => s.name);
            expect(names).toContain('Disney+');
            expect(names).toContain('Max');
            expect(names).not.toContain('Netflix');
        });

        test('should remove all services when given an empty list', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
            const allServices = [new SubscriptionService(serviceId, 'Netflix', null)];

            await SubscriptionServiceDB.syncArtifactSubscriptions(artifactId, [], allServices);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(0);
        });

        test('should match service names case-insensitively', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            const allServices = [new SubscriptionService(serviceId, 'Netflix', null)];
            await SubscriptionServiceDB.syncArtifactSubscriptions(artifactId, ['NETFLIX'], allServices);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
        });

        test('should ignore unknown service names', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            const allServices = [new SubscriptionService(serviceId, 'Netflix', null)];
            await SubscriptionServiceDB.syncArtifactSubscriptions(artifactId, ['Unknown Service'], allServices);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(0);
        });
    });

    describe('getUserSubscriptions', () => {
        test('should return empty array for user with no subscriptions', async () => {
            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toEqual([]);
        });

        test('should return services the user is subscribed to', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(1);
            expect(services[0]).toBeInstanceOf(SubscriptionService);
            expect(services[0].name).toBe('Netflix');
        });

        test('should not return subscriptions from another user', async () => {
            await UserDB.signUp('otheruser', 'password456');
            const otherUser = await UserDB.getByUsername('otheruser');
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.addUserSubscription(otherUser!.id, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(0);
        });
    });

    describe('addUserSubscription', () => {
        test('should subscribe a user to a service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(1);
        });

        test('should be idempotent', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(1);
        });
    });

    describe('removeUserSubscription', () => {
        test('should unsubscribe a user from a service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);
            await SubscriptionServiceDB.removeUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(0);
        });

        test('should be a no-op when subscription does not exist', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await expect(SubscriptionServiceDB.removeUserSubscription(userId, serviceId)).resolves.not.toThrow();
        });
    });

    describe('getAvailableSubscriptionsForUser', () => {
        test('should return services available for the user and linked to the artifact', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getAvailableSubscriptionsForUser(userId, artifactId);
            expect(services).toHaveLength(1);
            expect(services[0].name).toBe('Netflix');
        });

        test('should return empty when artifact is not linked to any service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getAvailableSubscriptionsForUser(userId, artifactId);
            expect(services).toHaveLength(0);
        });

        test('should return empty when user has no matching subscription', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getAvailableSubscriptionsForUser(userId, artifactId);
            expect(services).toHaveLength(0);
        });
    });

    describe('getAvailableSubscriptionsForUserBatch', () => {
        test('should return empty map for empty artifact array', async () => {
            const result = await SubscriptionServiceDB.getAvailableSubscriptionsForUserBatch(userId, []);
            expect(result.size).toBe(0);
        });

        test('should return map of available services per artifact', async () => {
            const artifactId2 = await ArtifactDB.createArtifact('Other Movie', ArtifactType.MOVIE, '', new Date('2024-01-01'), 90);
            const serviceId1 = await SubscriptionServiceDB.addService('Netflix', null);
            const serviceId2 = await SubscriptionServiceDB.addService('Disney+', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId1);
            await SubscriptionServiceDB.linkArtifactToService(artifactId2, serviceId2);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId1);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId2);

            const result = await SubscriptionServiceDB.getAvailableSubscriptionsForUserBatch(userId, [artifactId, artifactId2]);
            expect(result.get(artifactId)).toHaveLength(1);
            expect(result.get(artifactId)![0].name).toBe('Netflix');
            expect(result.get(artifactId2)).toHaveLength(1);
            expect(result.get(artifactId2)![0].name).toBe('Disney+');
        });

        test('should only include services the user is subscribed to', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', null);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const result = await SubscriptionServiceDB.getAvailableSubscriptionsForUserBatch(userId, [artifactId]);
            expect(result.size).toBe(0);
        });
    });
});
