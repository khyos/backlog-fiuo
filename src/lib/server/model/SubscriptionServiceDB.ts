import { ArtifactType } from "#lib/model/Artifact";
import { SubscriptionService, type ISubscriptionServiceDB } from "#lib/model/SubscriptionService";
import { getDbRows, runDbInsert, runDbQuery } from "#lib/server/database";

// Predefined subscription services seeded on DB initialization
const PREDEFINED_SERVICES: { name: string; artifactTypes: ArtifactType[] }[] = [
    // Streaming (movies, TV shows)
    { name: 'Netflix', artifactTypes: [ArtifactType.MOVIE, ArtifactType.TVSHOW] },
    { name: 'Disney+', artifactTypes: [ArtifactType.MOVIE, ArtifactType.TVSHOW] },
    { name: 'Amazon Prime Video', artifactTypes: [ArtifactType.MOVIE, ArtifactType.TVSHOW] },
    { name: 'Apple TV+', artifactTypes: [ArtifactType.MOVIE, ArtifactType.TVSHOW] },
    { name: 'Max', artifactTypes: [ArtifactType.MOVIE, ArtifactType.TVSHOW] },
    { name: 'Hulu', artifactTypes: [ArtifactType.MOVIE, ArtifactType.TVSHOW] },
    { name: 'Crunchyroll', artifactTypes: [ArtifactType.ANIME] },
    // Gaming
    { name: 'Game Pass', artifactTypes: [ArtifactType.GAME] },
    { name: 'PlayStation Plus Extra', artifactTypes: [ArtifactType.GAME] },
    { name: 'EA Play', artifactTypes: [ArtifactType.GAME] },
    { name: 'Apple Arcade', artifactTypes: [ArtifactType.GAME] },
    { name: 'Nintendo Switch Online', artifactTypes: [ArtifactType.GAME] },
];

export class SubscriptionServiceDB {
    static async createSubscriptionServiceTable(): Promise<void> {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS subscription_service (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`);
    }

    static async createSubscriptionServiceTypeTable(): Promise<void> {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS subscription_service_type (
            serviceId INTEGER NOT NULL,
            artifactType TEXT NOT NULL,
            PRIMARY KEY (serviceId, artifactType),
            FOREIGN KEY (serviceId) REFERENCES subscription_service(id) ON DELETE CASCADE
        )`);
        await runDbQuery(
            `CREATE INDEX IF NOT EXISTS idx_sst_artifactType ON subscription_service_type(artifactType)`
        );
    }

    static async createArtifactSubscriptionTable(): Promise<void> {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS artifact_subscription (
            artifactId INTEGER NOT NULL,
            serviceId INTEGER NOT NULL,
            PRIMARY KEY (artifactId, serviceId),
            FOREIGN KEY (artifactId) REFERENCES artifact(id),
            FOREIGN KEY (serviceId) REFERENCES subscription_service(id)
        )`);
    }

    static async createUserSubscriptionTable(): Promise<void> {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS user_subscription (
            userId INTEGER NOT NULL,
            serviceId INTEGER NOT NULL,
            PRIMARY KEY (userId, serviceId),
            FOREIGN KEY (userId) REFERENCES user(id),
            FOREIGN KEY (serviceId) REFERENCES subscription_service(id)
        )`);
    }

    static async seedPredefinedServices(): Promise<void> {
        for (const service of PREDEFINED_SERVICES) {
            await runDbQuery(
                `INSERT OR IGNORE INTO subscription_service (name) VALUES (?)`,
                [service.name]
            );
            const rows = await getDbRows<{ id: number }>(
                `SELECT id FROM subscription_service WHERE name = ?`,
                [service.name]
            );
            const id = rows[0].id;
            for (const type of service.artifactTypes) {
                await runDbQuery(
                    `INSERT OR IGNORE INTO subscription_service_type (serviceId, artifactType) VALUES (?, ?)`,
                    [id, type]
                );
            }
        }
    }

    private static async fetchServiceTypes(serviceIds: number[]): Promise<Map<number, ArtifactType[]>> {
        if (serviceIds.length === 0) return new Map();
        const questionMarks = serviceIds.map(() => '?').join(',');
        const rows = await getDbRows<{ serviceId: number; artifactType: string }>(
            `SELECT serviceId, artifactType FROM subscription_service_type WHERE serviceId IN (${questionMarks})`,
            serviceIds
        );
        const validTypes = new Set<string>(Object.values(ArtifactType));
        const result = new Map<number, ArtifactType[]>();
        for (const row of rows) {
            if (!result.has(row.serviceId)) result.set(row.serviceId, []);
            if (validTypes.has(row.artifactType)) {
                result.get(row.serviceId)!.push(row.artifactType as ArtifactType);
            }
        }
        return result;
    }

    static async getAllServices(artifactType?: ArtifactType): Promise<SubscriptionService[]> {
        let rows: ISubscriptionServiceDB[];
        if (artifactType) {
            rows = await getDbRows<ISubscriptionServiceDB>(
                `SELECT ss.* FROM subscription_service ss WHERE EXISTS (
                    SELECT 1 FROM subscription_service_type WHERE serviceId = ss.id AND artifactType = ?
                ) ORDER BY ss.name`,
                [artifactType]
            );
        } else {
            rows = await getDbRows<ISubscriptionServiceDB>(
                `SELECT * FROM subscription_service ORDER BY name`
            );
        }
        const ids = rows.map(r => r.id);
        const typesMap = await SubscriptionServiceDB.fetchServiceTypes(ids);
        return rows.map(r => new SubscriptionService(r.id, r.name, typesMap.get(r.id) ?? []));
    }

    static async addService(name: string, artifactTypes: ArtifactType[]): Promise<number> {
        const id = await runDbInsert(
            `INSERT INTO subscription_service (name) VALUES (?)`,
            [name]
        );
        for (const type of artifactTypes) {
            await runDbQuery(
                `INSERT OR IGNORE INTO subscription_service_type (serviceId, artifactType) VALUES (?, ?)`,
                [id, type]
            );
        }
        return id;
    }

    static async deleteService(serviceId: number): Promise<void> {
        await runDbQuery(`DELETE FROM subscription_service WHERE id = ?`, [serviceId]);
    }

    // ─── Artifact–Service linking ───────────────────────────────────────────

    static async getServicesForArtifact(artifactId: number): Promise<SubscriptionService[]> {
        const rows = await getDbRows<ISubscriptionServiceDB>(
            `SELECT subscription_service.* FROM artifact_subscription
             INNER JOIN subscription_service ON artifact_subscription.serviceId = subscription_service.id
             WHERE artifact_subscription.artifactId = ?
             ORDER BY subscription_service.name`,
            [artifactId]
        );
        const ids = rows.map(r => r.id);
        const typesMap = await SubscriptionServiceDB.fetchServiceTypes(ids);
        return rows.map(r => new SubscriptionService(r.id, r.name, typesMap.get(r.id) ?? []));
    }

    static async linkArtifactToService(artifactId: number, serviceId: number): Promise<void> {
        await runDbQuery(
            `INSERT OR IGNORE INTO artifact_subscription (artifactId, serviceId) VALUES (?, ?)`,
            [artifactId, serviceId]
        );
    }

    static async unlinkArtifactFromService(artifactId: number, serviceId: number): Promise<void> {
        await runDbQuery(
            `DELETE FROM artifact_subscription WHERE artifactId = ? AND serviceId = ?`,
            [artifactId, serviceId]
        );
    }

    static async syncArtifactSubscriptions(
        artifactId: number,
        itadServiceNames: string[],
        allServices: SubscriptionService[]
    ): Promise<void> {
        await runDbQuery(`DELETE FROM artifact_subscription WHERE artifactId = ?`, [artifactId]);
        for (const name of itadServiceNames) {
            const service = allServices.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (service) {
                await runDbQuery(
                    `INSERT OR IGNORE INTO artifact_subscription (artifactId, serviceId) VALUES (?, ?)`,
                    [artifactId, service.id]
                );
            }
        }
    }

    // ─── User subscriptions ──────────────────────────────────────────────────

    static async getUserSubscriptions(userId: number): Promise<SubscriptionService[]> {
        const rows = await getDbRows<ISubscriptionServiceDB>(
            `SELECT subscription_service.* FROM user_subscription
             INNER JOIN subscription_service ON user_subscription.serviceId = subscription_service.id
             WHERE user_subscription.userId = ?
             ORDER BY subscription_service.name`,
            [userId]
        );
        const ids = rows.map(r => r.id);
        const typesMap = await SubscriptionServiceDB.fetchServiceTypes(ids);
        return rows.map(r => new SubscriptionService(r.id, r.name, typesMap.get(r.id) ?? []));
    }

    static async addUserSubscription(userId: number, serviceId: number): Promise<void> {
        await runDbQuery(
            `INSERT OR IGNORE INTO user_subscription (userId, serviceId) VALUES (?, ?)`,
            [userId, serviceId]
        );
    }

    static async removeUserSubscription(userId: number, serviceId: number): Promise<void> {
        await runDbQuery(
            `DELETE FROM user_subscription WHERE userId = ? AND serviceId = ?`,
            [userId, serviceId]
        );
    }

    /**
     * Returns the subscription services that both the user subscribes to
     * AND that have the given artifact listed.
     */
    static async getAvailableSubscriptionsForUser(userId: number, artifactId: number): Promise<SubscriptionService[]> {
        const rows = await getDbRows<ISubscriptionServiceDB>(
            `SELECT subscription_service.* FROM artifact_subscription
             INNER JOIN subscription_service ON artifact_subscription.serviceId = subscription_service.id
             INNER JOIN user_subscription ON user_subscription.serviceId = subscription_service.id
             WHERE artifact_subscription.artifactId = ? AND user_subscription.userId = ?
             ORDER BY subscription_service.name`,
            [artifactId, userId]
        );
        const ids = rows.map(r => r.id);
        const typesMap = await SubscriptionServiceDB.fetchServiceTypes(ids);
        return rows.map(r => new SubscriptionService(r.id, r.name, typesMap.get(r.id) ?? []));
    }

    static async getAvailableSubscriptionsForUserBatch(userId: number, artifactIds: number[]): Promise<Map<number, SubscriptionService[]>> {
        if (artifactIds.length === 0) return new Map();
        const questionMarks = artifactIds.map(() => '?').join(',');
        const rows = await getDbRows<ISubscriptionServiceDB & { artifactId: number }>(
            `SELECT subscription_service.*, artifact_subscription.artifactId FROM artifact_subscription
             INNER JOIN subscription_service ON artifact_subscription.serviceId = subscription_service.id
             INNER JOIN user_subscription ON user_subscription.serviceId = subscription_service.id
             WHERE artifact_subscription.artifactId IN (${questionMarks}) AND user_subscription.userId = ?
             ORDER BY artifact_subscription.artifactId, subscription_service.name`,
            [...artifactIds, userId]
        );
        const serviceIds = [...new Set(rows.map(r => r.id))];
        const typesMap = await SubscriptionServiceDB.fetchServiceTypes(serviceIds);
        const result = new Map<number, SubscriptionService[]>();
        for (const r of rows) {
            if (!result.has(r.artifactId)) result.set(r.artifactId, []);
            result.get(r.artifactId)!.push(new SubscriptionService(r.id, r.name, typesMap.get(r.id) ?? []));
        }
        return result;
    }
}
