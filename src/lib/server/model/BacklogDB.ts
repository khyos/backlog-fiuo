import { ArtifactType } from "$lib/model/Artifact";
import { AuthorizationStatus } from "$lib/model/AuthorizationStatus";
import { Backlog, BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { UserRights, type User } from "$lib/model/User";
import { db, execQuery } from "../database";
import { BacklogItemDB } from "./BacklogItemDB";
import { GameDB } from "./game/GameDB";
import { MovieDB } from "./movie/MovieDB";

export class BacklogDB {
    static async createBacklog(userId: number, title: string, artifactType: ArtifactType, rankingType: BacklogRankingType): Promise<Backlog | null> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (?, ?, ?, ?)`, [userId, title, artifactType, rankingType], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const backlogId = this.lastID;
                    resolve(new Backlog(backlogId, userId, rankingType, title, artifactType));
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
                    const backlog = new Backlog(row.id, row.userId, row.rankingType, row.title, row.artifactType);
                    resolve(backlog);
                }
            });
        });
    }

    static async getBacklogByIdWithItems(id: number): Promise<Backlog | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM backlog WHERE id = ?`, [id], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const backlog = new Backlog(row.id, row.userId, row.rankingType, row.title, row.artifactType);
                    backlog.backlogItems = await BacklogDB.getBacklogItems(row.id as number, row.artifactType, row.rankingType);
                    resolve(backlog);
                }
            });
        });
    }

    static async getBacklogs(userId: number, page: number, pageSize: number, artifactType: string | null): Promise<Backlog[]> {
        let query = 'SELECT * FROM backlog WHERE userId = ? ORDER BY id ASC LIMIT ? OFFSET ?';
        let params: (string | number)[] = [userId, pageSize, page * pageSize];
        if (artifactType) {
            query = 'SELECT * FROM backlog WHERE userId = ? AND artifactType = ? ORDER BY id ASC LIMIT ? OFFSET ?';
            params = [userId, artifactType, pageSize, page * pageSize];
        }
        return await new Promise((resolve, reject) => {
            db.all(query, params, async (error, rows: any) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve([]);
                } else {
                    const backlogs: Backlog[] = rows.map((row: any) => new Backlog(row.id, row.userId, row.rankingType, row.title, row.artifactType)); 
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

    static async getBacklogItems(backlogId: number, artifactType: ArtifactType, rankingType: BacklogRankingType, backlogOrder?: BacklogOrder): Promise<BacklogItem[]> {
        let finalBacklogOrder = backlogOrder;
        if (!finalBacklogOrder) {
            switch (rankingType) {
                case BacklogRankingType.ELO:
                    finalBacklogOrder = BacklogOrder.ELO;
                    break;
                case BacklogRankingType.RANK:
                    finalBacklogOrder = BacklogOrder.RANK;
                    break;
                case BacklogRankingType.WISHLIST:
                    finalBacklogOrder = BacklogOrder.DATE_RELEASE;
                    break;
            }
        }
        
        let backlogItems: BacklogItem[] = [];
        if (artifactType === ArtifactType.GAME) {
            backlogItems = await GameDB.getBacklogItems(backlogId, rankingType, finalBacklogOrder);
        } else if (artifactType === ArtifactType.MOVIE){
            backlogItems = await MovieDB.getBacklogItems(backlogId, rankingType, finalBacklogOrder);
        }
        return backlogItems;
    }

    static async hasBacklogItem(backlogId: number, artifactId: number): Promise<boolean> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(row != null);
                }
            });
        });
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

    static async moveItemToOtherBacklog(fromBacklogId: number, toBacklogId: number, artifactId: number, keepTags: boolean) : Promise<void> {
        const fromBacklog = await this.getBacklogById(fromBacklogId);
        const toBacklog = await this.getBacklogById(toBacklogId);
        if (fromBacklog?.artifactType !== toBacklog?.artifactType) {
            throw new Error("Backlogs are not of the same type.");
        }
        const hasAlreadyArtifact = await this.hasBacklogItem(toBacklogId, artifactId);
        if (hasAlreadyArtifact) {
            throw new Error("Artifact already in target Backlog.");
        }
        const rank = await BacklogDB.getBacklogMaxRank(toBacklogId);
        await this.addBacklogItem(toBacklogId, artifactId, rank + 1);
        if (keepTags) {
            await BacklogItemDB.moveItemTagsToOtherBacklog(fromBacklogId, toBacklogId, artifactId);
        }
        await this.deleteBacklogItem(fromBacklogId, artifactId);
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

    static async eloFight(backlogId: number, winnerArtifactId: number, loserArtifactId: number) {
        await db.get(`SELECT * FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, winnerArtifactId], function (error, winnerRow: any) {
            db.get(`SELECT * FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, loserArtifactId], function (error2, loserRow: any) {
                if (!error && !error2 && winnerRow && loserRow) {
                    const winnerElo = winnerRow.elo;
                    const loserElo = loserRow.elo;
                    const winnerExpected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
                    const loserExpected = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
                    const winnerNewElo = winnerElo + Math.round(32 * (1 - winnerExpected));
                    const loserNewElo = loserElo + Math.round(32 * (0 - loserExpected));
                    db.run(`UPDATE backlog_items SET elo = ? WHERE backlogId = ? AND artifactId = ?`, [winnerNewElo, backlogId, winnerArtifactId]);
                    db.run(`UPDATE backlog_items SET elo = ? WHERE backlogId = ? AND artifactId = ?`, [loserNewElo, backlogId, loserArtifactId]);
                }
            });
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
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            artifactType TEXT NOT NULL
        )`);
    }

    static createBacklogItemsTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS backlog_items (
            backlogId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            dateAdded TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            rank INTEGER NOT NULL,
            elo INTERGER NOT NULL DEFAULT 1200,
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