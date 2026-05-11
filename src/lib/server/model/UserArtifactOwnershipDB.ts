import { UserArtifactOwnership, type IUserArtifactOwnershipDB } from "$lib/model/UserArtifactOwnership";
import { getDbRows, runDbInsert, runDbQuery } from "$lib/server/database";

export class UserArtifactOwnershipDB {
    static async createUserArtifactOwnershipTable(): Promise<void> {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS user_artifact_ownership (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            platform TEXT NOT NULL,
            note TEXT,
            FOREIGN KEY (userId) REFERENCES user(id),
            FOREIGN KEY (artifactId) REFERENCES artifact(id)
        )`);
    }

    static async getOwnershipsForUser(userId: number, artifactId: number): Promise<UserArtifactOwnership[]> {
        const rows = await getDbRows<IUserArtifactOwnershipDB>(
            `SELECT * FROM user_artifact_ownership WHERE userId = ? AND artifactId = ? ORDER BY id`,
            [userId, artifactId]
        );
        return rows.map(r => new UserArtifactOwnership(r.id, r.userId, r.artifactId, r.platform, r.note));
    }

    static async getOwnershipsForUserBatch(userId: number, artifactIds: number[]): Promise<Map<number, UserArtifactOwnership[]>> {
        if (artifactIds.length === 0) return new Map();
        const questionMarks = artifactIds.map(() => '?').join(',');
        const rows = await getDbRows<IUserArtifactOwnershipDB>(
            `SELECT * FROM user_artifact_ownership WHERE userId = ? AND artifactId IN (${questionMarks}) ORDER BY artifactId, id`,
            [userId, ...artifactIds]
        );
        const result = new Map<number, UserArtifactOwnership[]>();
        for (const r of rows) {
            if (!result.has(r.artifactId)) result.set(r.artifactId, []);
            result.get(r.artifactId)!.push(new UserArtifactOwnership(r.id, r.userId, r.artifactId, r.platform, r.note));
        }
        return result;
    }

    static async addOwnership(userId: number, artifactId: number, platform: string, note: string | null): Promise<number> {
        return await runDbInsert(
            `INSERT INTO user_artifact_ownership (userId, artifactId, platform, note) VALUES (?, ?, ?, ?)`,
            [userId, artifactId, platform, note ?? null]
        );
    }

    static async updateOwnership(id: number, userId: number, platform: string, note: string | null): Promise<void> {
        await runDbQuery(
            `UPDATE user_artifact_ownership SET platform = ?, note = ? WHERE id = ? AND userId = ?`,
            [platform, note ?? null, id, userId]
        );
    }

    static async deleteOwnership(id: number, userId: number): Promise<void> {
        await runDbQuery(
            `DELETE FROM user_artifact_ownership WHERE id = ? AND userId = ?`,
            [id, userId]
        );
    }
}
