import { execQuery, runDbInsert } from "$lib/server/database";

export class PlatformDB {
    static createPlatformTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS platform (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL
        )`);
    }

    static async addPlatform(platformId: number, title: string): Promise<void> {
        await runDbInsert(`INSERT OR IGNORE INTO platform (id, title) VALUES (?, ?)`, [platformId, title]);
    }
}