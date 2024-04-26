import { ArtifactType } from "$lib/model/Artifact";
import { AuthorizationStatus } from "$lib/model/AuthorizationStatus";
import { Backlog } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { UserRights, type User } from "$lib/model/User";
import { db, execQuery } from "../database";
import { GameDB } from "./game/GameDB";
import { MovieDB } from "./movie/MovieDB";

export class BacklogDB {
    static async createBacklog(userId: number, title: string, artifactType: ArtifactType): Promise<Backlog | null> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO backlog (userId, title, artifactType) VALUES (?, ?, ?)`, [userId, title, artifactType], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const backlogId = this.lastID;
                    resolve(new Backlog(backlogId, userId, title, artifactType));
                }
            });
        });
    }
    
    static async getBacklogById(id: number): Promise<Backlog | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM backlog WHERE id = ?`, [id], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const backlog = new Backlog(row.id, row.userId, row.title, row.artifactType);
                    backlog.backlogItems = await BacklogDB.getBacklogItems(row.id as number, row.artifactType);
                    resolve(backlog);
                }
            });
        });
    }

    static async getBacklogs(userId: number, page: number, pageSize: number): Promise<Backlog[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM backlog WHERE userId = ? ORDER BY id ASC LIMIT ? OFFSET ?`, [userId, pageSize, page * pageSize], async (error, rows: any) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve([]);
                } else {
                    const backlogs: Backlog[] = rows.map((row: any) => new Backlog(row.id, row.userId, row.title, row.artifactType)); 
                    resolve(backlogs);
                }
            });
        });
    }

    static async getBacklogMaxRank(backlogId: number): Promise<number> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT MAX(rank) as maxRank FROM backlog_items WHERE backlogId = ?`, [backlogId], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(row.maxRank || 0);
                }
            });
        });
    }

    static async getBacklogItems(backlogId: number, artifactType: ArtifactType): Promise<BacklogItem[]> {
        if (artifactType === ArtifactType.GAME) {
            return await GameDB.getBacklogItems(backlogId);
        } else if (artifactType === ArtifactType.MOVIE){
            return await MovieDB.getBacklogItems(backlogId);
        }
        return [];
    }

    static addBacklogItem(backlogId: number, artifactId: number, rank: number): Promise<number> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO backlog_items (backlogId, artifactId, rank) VALUES (?, ?, ?)`, [backlogId, artifactId, rank], function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    static async deleteBacklogItem(backlogId: number, artifactId: number): Promise<void> {
        await db.get(`SELECT * FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId], function (error, row: any) {
            db.run(`DELETE FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId]);
            db.run(`DELETE FROM backlog_item_tag WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId]);
            db.run(`UPDATE backlog_items SET rank = rank - 1 WHERE backlogId = ? AND rank > ?`, [backlogId, row.rank]);
        });
    }

    static async moveBacklogItem(backlogId: number, srcRank: number, targetRank: number) {
        await db.get(`SELECT * FROM backlog_items WHERE backlogId = ? AND rank = ?`, [backlogId, srcRank], function (error, row: any) {
            if (!error && row) {
                if (srcRank < targetRank) {
                    db.run(`UPDATE backlog_items SET rank = rank - 1 WHERE backlogId = ? AND rank > ? AND rank <= ?`, [backlogId, srcRank, targetRank]);
                } else {
                    db.run(`UPDATE backlog_items SET rank = rank + 1 WHERE backlogId = ? AND rank >= ? AND rank < ?`, [backlogId, targetRank, srcRank]);
                }
                db.run(`UPDATE backlog_items SET rank = ? WHERE backlogId = ? AND artifactId = ?`, [targetRank, backlogId, row.artifactId]);
            }
        });
       
    }

    static deleteBacklog(id: number) {
        db.run(`DELETE FROM backlog WHERE id = ?`, [id]);
    }

    static async canEditBacklog(user: User, backlogId: number): Promise<AuthorizationStatus> {
        if (!user.hasRight(UserRights.EDIT_BACKLOG)) {
            return new AuthorizationStatus(403, "Not authorized");
        }
        const backlog = await BacklogDB.getBacklogById(backlogId);
        if (!backlog) {
            return new AuthorizationStatus(404, "Not authorized");
        }
        if (backlog.userId !== user.id) {
            return new AuthorizationStatus(404, "Not authorized");
        }
        return new AuthorizationStatus(200, "OK");
    }


    static createBacklogTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS backlog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            title TEXT NOT NULL,
            artifactType TEXT NOT NULL
        )`);
    }

    static createBacklogItemsTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS backlog_items (
            backlogId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            rank INTEGER NOT NULL,
            PRIMARY KEY (backlogId, artifactId)
        )`);
    }

    static createBacklogItemTagTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS backlog_item_tag (
            backlogId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            tagId TEXT NOT NULL,
            PRIMARY KEY (backlogId, artifactId, tagId)
        )`);
    }
}