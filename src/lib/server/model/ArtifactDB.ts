import type { Artifact, ArtifactType } from "$lib/model/Artifact";
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
}
