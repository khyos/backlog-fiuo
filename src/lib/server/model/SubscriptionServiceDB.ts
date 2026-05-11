import { ArtifactType } from "$lib/model/Artifact";
import { SubscriptionService, type ISubscriptionServiceDB } from "$lib/model/SubscriptionService";
import { getDbRows, runDbInsert, runDbQuery } from "$lib/server/database";

// Predefined subscription services seeded on DB initialization
const PREDEFINED_SERVICES: { name: string; artifactType: ArtifactType | null }[] = [
    // Streaming (movies, TV shows, anime)
    { name: 'Netflix', artifactType: null },
    { name: 'Disney+', artifactType: null },
    { name: 'Amazon Prime Video', artifactType: null },
    { name: 'Apple TV+', artifactType: null },
    { name: 'Max', artifactType: null },
    { name: 'Hulu', artifactType: null },
    { name: 'Crunchyroll', artifactType: ArtifactType.ANIME },
    // Gaming
    { name: 'Game Pass', artifactType: ArtifactType.GAME },
    { name: 'PlayStation Plus Extra', artifactType: ArtifactType.GAME },
    { name: 'EA Play', artifactType: ArtifactType.GAME },
    { name: 'Apple Arcade', artifactType: ArtifactType.GAME },
    { name: 'Nintendo Switch Online', artifactType: ArtifactType.GAME },
];

export class SubscriptionServiceDB {
    static async createSubscriptionServiceTable(): Promise<void> {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS subscription_service (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            artifactType TEXT
        )`);
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
                `INSERT OR IGNORE INTO subscription_service (name, artifactType) VALUES (?, ?)`,
                [service.name, service.artifactType ?? null]
            );
        }
    }

    static async getAllServices(artifactType?: ArtifactType): Promise<SubscriptionService[]> {
        let rows: ISubscriptionServiceDB[];
        if (artifactType) {
            rows = await getDbRows<ISubscriptionServiceDB>(
                `SELECT * FROM subscription_service WHERE artifactType IS NULL OR artifactType = ? ORDER BY name`,
                [artifactType]
            );
        } else {
            rows = await getDbRows<ISubscriptionServiceDB>(
                `SELECT * FROM subscription_service ORDER BY name`
            );
        }
        return rows.map(r => new SubscriptionService(r.id, r.name, r.artifactType));
    }

    static async addService(name: string, artifactType: ArtifactType | null): Promise<number> {
        return await runDbInsert(
            `INSERT INTO subscription_service (name, artifactType) VALUES (?, ?)`,
            [name, artifactType ?? null]
        );
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
        return rows.map(r => new SubscriptionService(r.id, r.name, r.artifactType));
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
        return rows.map(r => new SubscriptionService(r.id, r.name, r.artifactType));
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
        return rows.map(r => new SubscriptionService(r.id, r.name, r.artifactType));
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
        const result = new Map<number, SubscriptionService[]>();
        for (const r of rows) {
            if (!result.has(r.artifactId)) result.set(r.artifactId, []);
            result.get(r.artifactId)!.push(new SubscriptionService(r.id, r.name, r.artifactType));
        }
        return result;
    }
}
