import type { ArtifactType } from "$lib/model/Artifact";
import { Tag, TagType, type ITagDB } from "$lib/model/Tag";
import { getDbRows, runDbQuery } from "../database";

export class TagDB {
    static async getTags(artifactType: ArtifactType, page: number, pageSize: number, query: string): Promise<Tag[]> {
        const rows = await getDbRows<ITagDB>(`SELECT * FROM tag WHERE artifactType = ? AND id LIKE ? ORDER BY id LIMIT ? OFFSET ?`, [artifactType, `%${query}%`, pageSize, page * pageSize]);
        return rows.map((row) => new Tag(row.id, row.type));
    }

    static async createTag(tagId: string, artifactType: ArtifactType, type: TagType): Promise<Tag> {
        await runDbQuery(`INSERT OR IGNORE INTO tag (id, artifactType, type) VALUES (?, ?, ?)`, [tagId, artifactType, type]);
        return new Tag(tagId, type);
    }

    static async createTagTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS tag (
            id TEXT NOT NULL,
            artifactType TEXT NOT NULL,
            type TEXT NOT NULL,
            PRIMARY KEY (id, artifactType)
        )`);
    }
}