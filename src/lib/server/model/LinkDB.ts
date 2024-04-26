import { Link } from "$lib/model/Link";
import { db, execQuery } from "$lib/server/database";

export class LinkDB {
    static addLink(artifactId: number, type: string, url: string) {
        db.run(`INSERT INTO link (artifactId, type, url) VALUES (?, ?, ?)`, [artifactId, type, url]);
    }

    static async exists(type: string, url: string): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM link WHERE type = ? AND url = ?`, [type, url], (error, row) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(!!row);
                }
            });
        });
    }

    static async getLinks(artifactId: number): Promise<Link[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM link
                    WHERE artifactId = ?`, [artifactId], async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const links: Link[] = [];
                    for (const row of rows) {
                        const link = new Link(row.type, row.url);
                        links.push(link);
                    }
                    resolve(links);
                }
            });
        });
    }

    static createLinkTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS link (
            artifactId INTEGER NOT NULL,
            type TEXT NOT NULL,
            url TEXT,
            PRIMARY KEY (artifactId, type)
        )`);
    }
}