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
            { query: 'DELETE FROM subscription_service_type' },
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
        await SubscriptionServiceDB.createSubscriptionServiceTypeTable();
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
        test('should add a service with empty artifactTypes and return its id', async () => {
            const id = await SubscriptionServiceDB.addService('Netflix', []);
            expect(id).toBeGreaterThan(0);
        });

        test('should add a service scoped to a specific artifactType', async () => {
            const id = await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);
            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            expect(services.find(s => s.id === id)?.artifactTypes).toContain(ArtifactType.GAME);
        });
    });

    describe('deleteService', () => {
        test('should delete an existing service', async () => {
            const id = await SubscriptionServiceDB.addService('Netflix', []);
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
            await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(2);
            expect(services[0]).toBeInstanceOf(SubscriptionService);
        });

        test('should return only matching-type services when filtered by artifactType', async () => {
            await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('Crunchyroll', [ArtifactType.ANIME]);

            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            expect(services).toHaveLength(1);
            const names = services.map(s => s.name);
            expect(names).toContain('Game Pass');
            expect(names).not.toContain('Netflix');
            expect(names).not.toContain('Crunchyroll');
        });

        test('should return services ordered by name', async () => {
            await SubscriptionServiceDB.addService('Zzz Service', []);
            await SubscriptionServiceDB.addService('Aaa Service', []);
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
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
            expect(services[0]).toBeInstanceOf(SubscriptionService);
            expect(services[0].name).toBe('Netflix');
        });

        test('should not return services linked to other artifacts', async () => {
            const otherArtifactId = await ArtifactDB.createArtifact('Other Movie', ArtifactType.MOVIE, '', new Date('2024-01-01'), 90);
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.linkArtifactToService(otherArtifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(0);
        });
    });

    describe('linkArtifactToService', () => {
        test('should link an artifact to a service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
        });

        test('should be idempotent', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
        });
    });

    describe('unlinkArtifactFromService', () => {
        test('should remove the link between artifact and service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
            await SubscriptionServiceDB.unlinkArtifactFromService(artifactId, serviceId);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(0);
        });

        test('should be a no-op when link does not exist', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await expect(SubscriptionServiceDB.unlinkArtifactFromService(artifactId, serviceId)).resolves.not.toThrow();
        });
    });

    describe('syncArtifactSubscriptions', () => {
        test('should replace all artifact services with a new list', async () => {
            const id1 = await SubscriptionServiceDB.addService('Netflix', []);
            const id2 = await SubscriptionServiceDB.addService('Disney+', []);
            const id3 = await SubscriptionServiceDB.addService('Max', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, id1);

            const allServices = [
                new SubscriptionService(id1, 'Netflix', []),
                new SubscriptionService(id2, 'Disney+', []),
                new SubscriptionService(id3, 'Max', []),
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
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
            const allServices = [new SubscriptionService(serviceId, 'Netflix', [])];

            await SubscriptionServiceDB.syncArtifactSubscriptions(artifactId, [], allServices);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(0);
        });

        test('should match service names case-insensitively', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            const allServices = [new SubscriptionService(serviceId, 'Netflix', [])];
            await SubscriptionServiceDB.syncArtifactSubscriptions(artifactId, ['NETFLIX'], allServices);

            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
        });

        test('should ignore unknown service names', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            const allServices = [new SubscriptionService(serviceId, 'Netflix', [])];
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
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(1);
            expect(services[0]).toBeInstanceOf(SubscriptionService);
            expect(services[0].name).toBe('Netflix');
        });

        test('should not return subscriptions from another user', async () => {
            await UserDB.signUp('otheruser', 'password456');
            const otherUser = await UserDB.getByUsername('otheruser');
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.addUserSubscription(otherUser!.id, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(0);
        });
    });

    describe('addUserSubscription', () => {
        test('should subscribe a user to a service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(1);
        });

        test('should be idempotent', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(1);
        });
    });

    describe('removeUserSubscription', () => {
        test('should unsubscribe a user from a service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);
            await SubscriptionServiceDB.removeUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(0);
        });

        test('should be a no-op when subscription does not exist', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await expect(SubscriptionServiceDB.removeUserSubscription(userId, serviceId)).resolves.not.toThrow();
        });
    });

    describe('getAvailableSubscriptionsForUser', () => {
        test('should return services available for the user and linked to the artifact', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getAvailableSubscriptionsForUser(userId, artifactId);
            expect(services).toHaveLength(1);
            expect(services[0].name).toBe('Netflix');
        });

        test('should return empty when artifact is not linked to any service', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.addUserSubscription(userId, serviceId);

            const services = await SubscriptionServiceDB.getAvailableSubscriptionsForUser(userId, artifactId);
            expect(services).toHaveLength(0);
        });

        test('should return empty when user has no matching subscription', async () => {
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
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
            const serviceId1 = await SubscriptionServiceDB.addService('Netflix', []);
            const serviceId2 = await SubscriptionServiceDB.addService('Disney+', []);
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
            const serviceId = await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);

            const result = await SubscriptionServiceDB.getAvailableSubscriptionsForUserBatch(userId, [artifactId]);
            expect(result.size).toBe(0);
        });
    });

    // Contract: seedPredefinedServices() is idempotent — calling it N times yields the same 12 rows
    describe('seedPredefinedServices uniqueness contract', () => {
        test('calling seedPredefinedServices twice produces exactly 12 rows, not 24', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            await SubscriptionServiceDB.seedPredefinedServices();
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(12);
        });

        test('calling seedPredefinedServices three times still produces exactly 12 rows', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            await SubscriptionServiceDB.seedPredefinedServices();
            await SubscriptionServiceDB.seedPredefinedServices();
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(12);
        });
    });

    // Contract: getAllServices(artifactType?) returns exactly one row per service name, in name order
    describe('getAllServices uniqueness and ordering contract', () => {
        test('returns exactly one row per service name — no duplicates', async () => {
            await SubscriptionServiceDB.addService('Alpha', []);
            await SubscriptionServiceDB.addService('Beta', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('Gamma', [ArtifactType.MOVIE]);
            const services = await SubscriptionServiceDB.getAllServices();
            const seen = new Set<string>();
            for (const s of services) {
                expect(seen.has(s.name)).toBe(false);
                seen.add(s.name);
            }
        });

        test('results are in ascending name order', async () => {
            await SubscriptionServiceDB.addService('Zebra', []);
            await SubscriptionServiceDB.addService('Mango', []);
            await SubscriptionServiceDB.addService('Apple', []);
            const services = await SubscriptionServiceDB.getAllServices();
            const names = services.map(s => s.name);
            const sorted = [...names].sort((a, b) => a.localeCompare(b));
            expect(names).toEqual(sorted);
        });

        test('getAllServices with no argument returns all services regardless of artifactTypes', async () => {
            await SubscriptionServiceDB.addService('Universal', []);
            await SubscriptionServiceDB.addService('GameOnly', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('AnimeOnly', [ArtifactType.ANIME]);
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(3);
        });
    });

    // Contract: getAllServices(ArtifactType.GAME) returns rows where artifactTypes includes 'game'
    describe('getAllServices filter contract', () => {
        test('filtered by GAME returns only game-type services', async () => {
            await SubscriptionServiceDB.addService('Universal', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.addService('GameOnly', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('AnimeOnly', [ArtifactType.ANIME]);
            await SubscriptionServiceDB.addService('MovieOnly', [ArtifactType.MOVIE]);

            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            for (const s of services) {
                expect(s.artifactTypes).toContain(ArtifactType.GAME);
            }
            const names = services.map(s => s.name);
            expect(names).toContain('GameOnly');
            expect(names).not.toContain('Universal');
            expect(names).not.toContain('AnimeOnly');
            expect(names).not.toContain('MovieOnly');
        });

        test('filtered by GAME excludes services scoped to other artifact types', async () => {
            await SubscriptionServiceDB.addService('Crunchyroll', [ArtifactType.ANIME]);
            await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE]);

            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            expect(services).toHaveLength(0);
        });

        test('filtered results are also in name order', async () => {
            await SubscriptionServiceDB.addService('Zzz', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('Aaa', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('Mmm', [ArtifactType.GAME]);

            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            const names = services.map(s => s.name);
            const sorted = [...names].sort((a, b) => a.localeCompare(b));
            expect(names).toEqual(sorted);
        });
    });

    // Contract: after seedPredefinedServices runs twice, FK references in junction tables are not dangling
    describe('seedPredefinedServices FK integrity contract', () => {
        test('artifact_subscription serviceId references remain valid after seed runs twice', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            // Link artifact to the first seeded service
            const servicesBefore = await SubscriptionServiceDB.getAllServices();
            const firstService = servicesBefore[0];
            await SubscriptionServiceDB.linkArtifactToService(artifactId, firstService.id);

            // Seed again — must not break the FK reference
            await SubscriptionServiceDB.seedPredefinedServices();

            const servicesAfter = await SubscriptionServiceDB.getAllServices();
            const linkedServices = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            // The service the artifact was linked to must still exist in subscription_service
            const linkedIds = linkedServices.map(s => s.id);
            const allIds = servicesAfter.map(s => s.id);
            for (const id of linkedIds) {
                expect(allIds).toContain(id);
            }
        });

        test('user_subscription serviceId references remain valid after seed runs twice', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            const servicesBefore = await SubscriptionServiceDB.getAllServices();
            const firstService = servicesBefore[0];
            await SubscriptionServiceDB.addUserSubscription(userId, firstService.id);

            // Seed again — must not break the FK reference
            await SubscriptionServiceDB.seedPredefinedServices();

            const servicesAfter = await SubscriptionServiceDB.getAllServices();
            const userSubs = await SubscriptionServiceDB.getUserSubscriptions(userId);
            const userSubIds = userSubs.map(s => s.id);
            const allIds = servicesAfter.map(s => s.id);
            for (const id of userSubIds) {
                expect(allIds).toContain(id);
            }
        });
    });

    // Contract: duplicate name inserts are rejected or ignored — no duplicates created
    describe('duplicate name insert contract', () => {
        test('adding the same name twice does not create a duplicate row', async () => {
            await SubscriptionServiceDB.addService('Netflix', []);
            // Second insert — must either throw or be silently ignored
            try {
                await SubscriptionServiceDB.addService('Netflix', []);
            } catch {
                // Acceptable: DB rejected the duplicate
            }
            const services = await SubscriptionServiceDB.getAllServices();
            const netflixRows = services.filter(s => s.name === 'Netflix');
            expect(netflixRows).toHaveLength(1);
        });

        test('adding the same name with same type twice does not create a duplicate type row', async () => {
            await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);
            try {
                await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);
            } catch {
                // Acceptable: DB rejected the duplicate
            }
            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            const gamePassRows = services.filter(s => s.name === 'Game Pass');
            expect(gamePassRows).toHaveLength(1);
        });
    });

    // Contract: getAllServices() returns services with artifactTypes arrays populated (not undefined/null)
    describe('getAllServices artifactTypes shape contract', () => {
        test('each service returned by getAllServices has an artifactTypes array (not undefined)', async () => {
            await SubscriptionServiceDB.addService('Universal', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.addService('GameOnly', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('Empty', []);
            const services = await SubscriptionServiceDB.getAllServices();
            for (const s of services) {
                expect(Array.isArray(s.artifactTypes)).toBe(true);
            }
        });

        test('artifactTypes contents match what was passed to addService', async () => {
            await SubscriptionServiceDB.addService('ComboService', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            const services = await SubscriptionServiceDB.getAllServices();
            const combo = services.find(s => s.name === 'ComboService');
            expect(combo).toBeDefined();
            expect(combo!.artifactTypes).toContain(ArtifactType.MOVIE);
            expect(combo!.artifactTypes).toContain(ArtifactType.TVSHOW);
            expect(combo!.artifactTypes).toHaveLength(2);
        });
    });

    // Contract: getAllServices(ArtifactType.MOVIE) returns only services whose artifactTypes includes 'movie'
    describe('getAllServices MOVIE filter contract', () => {
        test('filtered by MOVIE returns only movie-type services', async () => {
            await SubscriptionServiceDB.addService('StreamingService', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.addService('GameOnly', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('MovieOnly', [ArtifactType.MOVIE]);
            await SubscriptionServiceDB.addService('AnimeOnly', [ArtifactType.ANIME]);

            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            for (const s of services) {
                expect(s.artifactTypes).toContain(ArtifactType.MOVIE);
            }
            const names = services.map(s => s.name);
            expect(names).toContain('StreamingService');
            expect(names).toContain('MovieOnly');
            expect(names).not.toContain('GameOnly');
            expect(names).not.toContain('AnimeOnly');
        });

        test('filtered by MOVIE excludes game-only and anime-only services', async () => {
            await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addService('Crunchyroll', [ArtifactType.ANIME]);

            const services = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            expect(services).toHaveLength(0);
        });
    });

    // Contract: a service with multiple types appears in the results for each of those types
    describe('multi-type service cross-filter contract', () => {
        test('a MOVIE+TVSHOW service appears in getAllServices(MOVIE) results', async () => {
            await SubscriptionServiceDB.addService('Combo', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            const movieServices = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            expect(movieServices.map(s => s.name)).toContain('Combo');
        });

        test('a MOVIE+TVSHOW service appears in getAllServices(TVSHOW) results', async () => {
            await SubscriptionServiceDB.addService('Combo', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            const tvshowServices = await SubscriptionServiceDB.getAllServices(ArtifactType.TVSHOW);
            expect(tvshowServices.map(s => s.name)).toContain('Combo');
        });

        test('a GAME-only service does NOT appear in getAllServices(MOVIE) results', async () => {
            await SubscriptionServiceDB.addService('GamePass', [ArtifactType.GAME]);
            const movieServices = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            expect(movieServices.map(s => s.name)).not.toContain('GamePass');
        });
    });

    // Contract: predefined streaming services have artifactTypes containing MOVIE and TVSHOW
    describe('predefined services artifactType contract', () => {
        const STREAMING_SERVICES = ['Netflix', 'Disney+', 'Amazon Prime Video', 'Apple TV+', 'Max', 'Hulu'];
        const GAME_SERVICES = ['Game Pass', 'PlayStation Plus Extra', 'EA Play', 'Apple Arcade', 'Nintendo Switch Online'];

        test('predefined streaming services all include MOVIE in their artifactTypes', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            const movieServices = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            const movieNames = movieServices.map(s => s.name);
            for (const name of STREAMING_SERVICES) {
                expect(movieNames).toContain(name);
            }
        });

        test('predefined streaming services all include TVSHOW in their artifactTypes', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            const tvshowServices = await SubscriptionServiceDB.getAllServices(ArtifactType.TVSHOW);
            const tvshowNames = tvshowServices.map(s => s.name);
            for (const name of STREAMING_SERVICES) {
                expect(tvshowNames).toContain(name);
            }
        });

        test('predefined game services all include GAME in their artifactTypes', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            const gameServices = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            const gameNames = gameServices.map(s => s.name);
            for (const name of GAME_SERVICES) {
                expect(gameNames).toContain(name);
            }
        });

        test('predefined game services do NOT appear in getAllServices(MOVIE) results', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            const movieServices = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            const movieNames = movieServices.map(s => s.name);
            for (const name of GAME_SERVICES) {
                expect(movieNames).not.toContain(name);
            }
        });

        test('predefined streaming services do NOT appear in getAllServices(GAME) results', async () => {
            await SubscriptionServiceDB.seedPredefinedServices();
            const gameServices = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            const gameNames = gameServices.map(s => s.name);
            for (const name of STREAMING_SERVICES) {
                expect(gameNames).not.toContain(name);
            }
        });
    });

    // Standards tests: implementation-specific paths for migrateAddUniqueConstraint()
    describe('migrateAddUniqueConstraint', () => {
        test('is idempotent on a database without the legacy artifactType column — runs without error', async () => {
            await SubscriptionServiceDB.addService('Netflix', []);
            await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);

            // Should complete without throwing — early-exit guard fires because no artifactType column
            await expect(SubscriptionServiceDB.migrateAddUniqueConstraint()).resolves.not.toThrow();

            // Data must be unchanged
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(2);
        });

        test('migration on empty subscription_service table runs without error', async () => {
            await expect(SubscriptionServiceDB.migrateAddUniqueConstraint()).resolves.not.toThrow();
        });

        test('createSubscriptionServiceTable called twice does not error — IF NOT EXISTS is honoured', async () => {
            await expect(SubscriptionServiceDB.createSubscriptionServiceTable()).resolves.not.toThrow();
        });
    });

    // Contract: migrateToMultiType is idempotent
    describe('migrateToMultiType', () => {
        test('runs without error on a database with no legacy artifactType column', async () => {
            await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await expect(SubscriptionServiceDB.migrateToMultiType()).resolves.not.toThrow();
        });

        test('is idempotent — calling it twice produces the same result', async () => {
            await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.migrateToMultiType();
            await SubscriptionServiceDB.migrateToMultiType();
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(1);
            expect(services[0].artifactTypes).toContain(ArtifactType.MOVIE);
            expect(services[0].artifactTypes).toContain(ArtifactType.TVSHOW);
        });
    });

    // ─── Standards tests: implementation-specific paths ──────────────────────

    describe('addService with empty artifactTypes — filtering behaviour', () => {
        test('service with no types is absent from getAllServices filtered by any artifactType', async () => {
            const id = await SubscriptionServiceDB.addService('TypelessService', []);
            const byGame = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            const byMovie = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            const byAnime = await SubscriptionServiceDB.getAllServices(ArtifactType.ANIME);
            expect(byGame.find(s => s.id === id)).toBeUndefined();
            expect(byMovie.find(s => s.id === id)).toBeUndefined();
            expect(byAnime.find(s => s.id === id)).toBeUndefined();
        });

        test('service with no types appears in unfiltered getAllServices with empty artifactTypes array', async () => {
            const id = await SubscriptionServiceDB.addService('TypelessService', []);
            const all = await SubscriptionServiceDB.getAllServices();
            const found = all.find(s => s.id === id);
            expect(found).toBeDefined();
            expect(found!.artifactTypes).toEqual([]);
        });
    });

    describe('addService with multiple types — artifactTypes population on returned objects', () => {
        test('service added with two types appears under both when filtered', async () => {
            const id = await SubscriptionServiceDB.addService('Multi', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            const byMovie = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            const byTvshow = await SubscriptionServiceDB.getAllServices(ArtifactType.TVSHOW);
            expect(byMovie.find(s => s.id === id)).toBeDefined();
            expect(byTvshow.find(s => s.id === id)).toBeDefined();
        });

        test('getAllServices returns the full artifactTypes array for a multi-type service', async () => {
            const id = await SubscriptionServiceDB.addService('Multi', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            const all = await SubscriptionServiceDB.getAllServices();
            const found = all.find(s => s.id === id)!;
            expect(found.artifactTypes).toHaveLength(2);
            expect(found.artifactTypes).toContain(ArtifactType.MOVIE);
            expect(found.artifactTypes).toContain(ArtifactType.TVSHOW);
        });
    });

    describe('getServicesForArtifact — artifactTypes populated on returned objects', () => {
        test('returned services have their artifactTypes array populated', async () => {
            const id = await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, id);
            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services).toHaveLength(1);
            expect(services[0].artifactTypes).toContain(ArtifactType.MOVIE);
            expect(services[0].artifactTypes).toContain(ArtifactType.TVSHOW);
        });

        test('service with no types returns empty artifactTypes array via getServicesForArtifact', async () => {
            const id = await SubscriptionServiceDB.addService('TypelessService', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, id);
            const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
            expect(services[0].artifactTypes).toEqual([]);
        });
    });

    describe('getUserSubscriptions — artifactTypes populated on returned objects', () => {
        test('returned services have their artifactTypes array populated', async () => {
            const id = await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);
            await SubscriptionServiceDB.addUserSubscription(userId, id);
            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services).toHaveLength(1);
            expect(services[0].artifactTypes).toContain(ArtifactType.GAME);
        });

        test('multi-type service in user subscriptions has all types populated', async () => {
            const id = await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.addUserSubscription(userId, id);
            const services = await SubscriptionServiceDB.getUserSubscriptions(userId);
            expect(services[0].artifactTypes).toHaveLength(2);
            expect(services[0].artifactTypes).toContain(ArtifactType.MOVIE);
            expect(services[0].artifactTypes).toContain(ArtifactType.TVSHOW);
        });
    });

    describe('getAvailableSubscriptionsForUser — artifactTypes populated on returned objects', () => {
        test('returned services have their artifactTypes array populated', async () => {
            const id = await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, id);
            await SubscriptionServiceDB.addUserSubscription(userId, id);
            const services = await SubscriptionServiceDB.getAvailableSubscriptionsForUser(userId, artifactId);
            expect(services).toHaveLength(1);
            expect(services[0].artifactTypes).toContain(ArtifactType.MOVIE);
            expect(services[0].artifactTypes).toContain(ArtifactType.TVSHOW);
        });

        test('service with no types returns empty artifactTypes on available subscriptions', async () => {
            const id = await SubscriptionServiceDB.addService('TypelessService', []);
            await SubscriptionServiceDB.linkArtifactToService(artifactId, id);
            await SubscriptionServiceDB.addUserSubscription(userId, id);
            const services = await SubscriptionServiceDB.getAvailableSubscriptionsForUser(userId, artifactId);
            expect(services[0].artifactTypes).toEqual([]);
        });
    });

    describe('deleteService — cascade to subscription_service_type', () => {
        test('deleting a service removes its type rows so it no longer appears in filtered queries', async () => {
            const id = await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.deleteService(id);
            const byMovie = await SubscriptionServiceDB.getAllServices(ArtifactType.MOVIE);
            const byTvshow = await SubscriptionServiceDB.getAllServices(ArtifactType.TVSHOW);
            expect(byMovie.find(s => s.id === id)).toBeUndefined();
            expect(byTvshow.find(s => s.id === id)).toBeUndefined();
        });

        test('deleting a service with no types does not error and removes it from unfiltered results', async () => {
            const id = await SubscriptionServiceDB.addService('TypelessService', []);
            await expect(SubscriptionServiceDB.deleteService(id)).resolves.not.toThrow();
            const all = await SubscriptionServiceDB.getAllServices();
            expect(all.find(s => s.id === id)).toBeUndefined();
        });

        test('other services retain their type rows after a different service is deleted', async () => {
            const id1 = await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE]);
            const id2 = await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);
            await SubscriptionServiceDB.deleteService(id1);
            const byGame = await SubscriptionServiceDB.getAllServices(ArtifactType.GAME);
            expect(byGame.find(s => s.id === id2)).toBeDefined();
        });
    });

    describe('migrateToMultiType — idempotency and fresh DB no-op', () => {
        test('calling migrateToMultiType on a fresh DB (no legacy column, type table already has rows) is a no-op', async () => {
            // Add services through the current API so the type table already has rows
            await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);
            await SubscriptionServiceDB.addService('Game Pass', [ArtifactType.GAME]);

            // migrateToMultiType should fire the COUNT > 0 idempotency guard and return early
            await SubscriptionServiceDB.migrateToMultiType();

            // Data and type associations must be unchanged
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(2);
            const netflix = services.find(s => s.name === 'Netflix')!;
            expect(netflix.artifactTypes).toHaveLength(2);
            expect(netflix.artifactTypes).toContain(ArtifactType.MOVIE);
            expect(netflix.artifactTypes).toContain(ArtifactType.TVSHOW);
        });

        test('calling migrateToMultiType twice on a fresh DB keeps row count stable', async () => {
            await SubscriptionServiceDB.addService('Netflix', [ArtifactType.MOVIE, ArtifactType.TVSHOW]);

            // Both calls are idempotent no-ops because type table already has rows
            await SubscriptionServiceDB.migrateToMultiType();
            await SubscriptionServiceDB.migrateToMultiType();

            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(1);
            const netflix = services[0];
            expect(netflix.artifactTypes).toHaveLength(2);
        });

        test('calling migrateToMultiType on a completely empty DB completes without error and leaves no data', async () => {
            // subscription_service_type has 0 rows AND subscription_service has 0 rows
            // The idempotency guard fires (count == 0), then hasArtifactTypeColumn is false,
            // so the data-copy branch is skipped entirely, but the table recreate still runs.
            await expect(SubscriptionServiceDB.migrateToMultiType()).resolves.not.toThrow();
            const services = await SubscriptionServiceDB.getAllServices();
            expect(services).toHaveLength(0);
        });
    });
});
