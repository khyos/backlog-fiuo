import type { ArtifactType } from "$lib/model/Artifact";
import { Tag, TagType, type ITagDB } from "$lib/model/Tag";
import { db, execQuery } from "../database";

export class TagDB {
    static getTags(artifactType: ArtifactType, page: number, pageSize: number, query: string) {
        return new Promise<Tag[]>((resolve, reject) => {
            db.all(`SELECT * FROM tag WHERE artifactType = ? AND id LIKE ? ORDER BY id LIMIT ? OFFSET ?`, [artifactType, `%${query}%`, pageSize, page * pageSize], (err, rows: ITagDB[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((row) => new Tag(row.id, row.type)));
                }
            });
        });
    }

    static async createTag(tagId: string, artifactType: ArtifactType, type: TagType): Promise<Tag> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO tag (id, artifactType, type) VALUES (?, ?, ?)`, [tagId, artifactType, type], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve(new Tag(tagId, type));
                }
            });
        });
    }

    static createTagTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS tag (
            id TEXT NOT NULL,
            artifactType TEXT NOT NULL,
            type TEXT NOT NULL,
            PRIMARY KEY (id, artifactType)
        )`);
    }
}