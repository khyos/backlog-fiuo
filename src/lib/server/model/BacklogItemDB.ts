import { Tag, TagType } from "$lib/model/Tag";
import { getDbRows, runDbQuery } from "../database";

export class BacklogItemDB {
    static async getTags(backlogId: number, artifactType: string, artifactId: number): Promise<Tag[]> {
        const rows = await getDbRows<{ tagId: string; tagType: TagType; }>(`SELECT tag.id AS tagId, tag.type AS tagType FROM backlog_item_tag
                INNER JOIN tag ON backlog_item_tag.tagId = tag.id
                WHERE backlogId = ? AND artifactId = ? AND artifactType = ?`, [backlogId, artifactId, artifactType]);
        return rows.map(row => new Tag(row.tagId, row.tagType));
    }

    static async addTag(backlogId: number, artifactId: number, tagId: string): Promise<void> {
        await runDbQuery(`INSERT INTO backlog_item_tag (backlogId, artifactId, tagId) VALUES (?, ?, ?)`, [backlogId, artifactId, tagId]);
    }

    static async removeTag(backlogId: number, artifactId: number, tagId: string): Promise<void> {
        await runDbQuery(`DELETE FROM backlog_item_tag WHERE backlogId = ? AND artifactId = ? AND tagId = ?`, [backlogId, artifactId, tagId]);
    }

    static async moveItemTagsToOtherBacklog(fromBacklogId: number, toBacklogId: number, artifactId: number): Promise<void> {
        await runDbQuery(`UPDATE backlog_item_tag SET backlogId = ? WHERE backlogId = ? AND artifactId = ?`, [toBacklogId, fromBacklogId, artifactId]);
    }
}