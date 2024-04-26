import { db, execQuery } from "$lib/server/database";

export class PlatformDB {
    static createPlatformTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS platform (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL
        )`);
    }

    static addPlatform(platformId: number, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO platform (id, title) VALUES (?, ?)`, [platformId, title], async function (error) {
                if (error) {
                    reject(error);
                }
            });
            resolve();
        });
    }
}