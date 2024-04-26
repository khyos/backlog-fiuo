import { Tag } from "$lib/model/Tag";
import { db } from "../database";

export class BacklogItemDB {
    static getTags(backlogId: number, artifactId: number): Promise<Tag[]> {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM backlog_item_tag
                    INNER JOIN tag ON backlog_item_tag.tagId = tag.id
                    WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId], (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const tags: Tag[] = rows.map(row => new Tag(row.tagId, row.title));
                    resolve(tags);
                }
            });
        });
    }

    static addTag(backlogId: number, artifactId: number, tagId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO backlog_item_tag (backlogId, artifactId, tagId) VALUES (?, ?, ?)`, [backlogId, artifactId, tagId], function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    static removeTag(backlogId: number, artifactId: number, tagId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM backlog_item_tag WHERE backlogId = ? AND artifactId = ? AND tagId = ?`, [backlogId, artifactId, tagId], function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}