import { Link, LinkType, type ILinkDB } from "$lib/model/Link";
import { getDbRow, getDbRows, runDbQuery } from "$lib/server/database";

export class LinkDB {
    static async addLink(artifactId: number, type: string, url: string): Promise<void> {
        return await runDbQuery(`INSERT INTO link (artifactId, type, url) VALUES (?, ?, ?)`, [artifactId, type, url]);
    }

    static async updateLink(artifactId: number, type: string, url: string): Promise<void> {
        return await runDbQuery(`UPDATE link SET url = ? WHERE artifactId = ?  AND type = ?`, [url, artifactId, type]);
    }

    static async exists(type: LinkType, url: string): Promise<boolean> {
        const row = await getDbRow<ILinkDB>(`SELECT * FROM link WHERE type = ? AND url = ?`, [type, url]);
        return !!row;
    }

    static async getLinks(artifactId: number): Promise<Link[]> {
        const rows = await getDbRows<ILinkDB>(`SELECT * FROM link WHERE artifactId = ?`, [artifactId]);
        return rows.map(row => new Link(row.type, row.url));
    }

    static async getLinksMultiple(type: LinkType, artifactIds: number[]): Promise<Record<string, string>> {
        const questionMarks = new Array(artifactIds.length).fill('?').join(',');
        const rows = await getDbRows<ILinkDB>(`SELECT * FROM link WHERE type = ? AND artifactId IN (${questionMarks})`, [type, ...artifactIds]);
        const links: Record<number, string> = {};
        for (const row of rows) {
            links[row.artifactId] = row.url;
        }
        return links;
    }

    static async createLinkTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS link (
            artifactId INTEGER NOT NULL,
            type TEXT NOT NULL,
            url TEXT,
            PRIMARY KEY (artifactId, type)
        )`);
    }
}