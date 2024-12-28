import type { ArtifactType } from "$lib/model/Artifact";
import { UserArtifact } from "$lib/model/UserArtifact";
import { db, execQuery } from "../database";

export class ArtifactDB {
    static async getArtifacts(artifactType: ArtifactType, page: number, pageSize: number, search: string = ''): Promise<any[]> {
        const query = search
            ? `SELECT * FROM artifact WHERE type = ? AND LOWER(title) LIKE ? ORDER BY (LOWER(title) = ?) desc, length(title) ASC LIMIT ? OFFSET ?`
            : `SELECT * FROM artifact WHERE type = ? ORDER BY id ASC LIMIT ? OFFSET ?`;
        const params = search
            ? [artifactType, `%${search.toLowerCase()}%`, search.toLowerCase(), pageSize, page * pageSize]
            : [artifactType, pageSize, page * pageSize];
        return await new Promise((resolve, reject) => {
            db.all(query, params, async (error, rows: any) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve([]);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    static async getUserInfo(userId: number, artifactId: number): Promise<UserArtifact | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM user_artifact WHERE userId = ? AND artifactId = ?`, [userId, artifactId], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const userArtifact = new UserArtifact(row.userId, row.artifactId, row.score, row.startDate, row.endDate);
                    resolve(userArtifact);
                }
            });
        });
    }

    static async setUserScore(userId: number, artifactId: number, score: number): Promise<void> {
        const userInfo = await ArtifactDB.getUserInfo(userId, artifactId);
        return await new Promise((resolve, reject) => {
            if (userInfo) {
                db.run(`UPDATE user_artifact SET score = ? WHERE userId = ? AND artifactId = ?`, [score, userId, artifactId], async function (error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else {
                db.run(`INSERT INTO user_artifact (userId, artifactId, score) VALUES (?, ?, ?)`, [userId, artifactId, score], async function (error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            }
        });
    }

    static createArtifactTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS artifact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            duration INTEGER,
            releaseDate TEXT
        )`);
    }

    static createUserArtifactTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS user_artifact (
            userId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            score INTERGER,
            startDate TIMESTAMP,
            endDate TIMESTAMP,
            PRIMARY KEY (userId, artifactId)
        )`);
    }
}
