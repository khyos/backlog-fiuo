import { ArtifactType, type IArtifactDB } from "$lib/model/Artifact";
import { AuthorizationStatus } from "$lib/model/AuthorizationStatus";
import { Backlog, BacklogOrder, BacklogRankingType, BacklogType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { UserRights, type User } from "$lib/model/User";
import { getDbRow, getDbRows, runDbInsert, runDbQuery } from "../database";
import { AnimeDB } from "./anime/AnimeDB";
import { BacklogItemDB } from "./BacklogItemDB";
import { GameDB } from "./game/GameDB";
import { MovieDB } from "./movie/MovieDB";
import { TvshowDB } from "./tvshow/TvshowDB";

export interface IBacklogDB {
    id: number;
    userId: number;
    type: BacklogType;
    rankingType: BacklogRankingType;
    title: string;
    artifactType: ArtifactType;
}

export interface IBacklogItemDB {
    backlogId: number;
    artifactId: number;
    dateAdded: number;
    duration: number;
    elo: number;
    rank: number;
    releaseDate: string;
    title: string;
    type: ArtifactType;
}

export class BacklogDB {
    static async createBacklog(userId: number, title: string, type: BacklogType, artifactType: ArtifactType, rankingType: BacklogRankingType): Promise<Backlog | null> {
        if (await BacklogDB.doesBacklogPerTypeExist(userId, type, artifactType)) {
            return null;
        }
        
        const backlogId = await runDbInsert(`INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (?, ?, ?, ?)`, [userId, title, artifactType, rankingType]);
        return new Backlog(backlogId, userId, type, rankingType, title, artifactType);
    }
    
    static async getBacklogById(id: number): Promise<Backlog | null> {
        const row = await getDbRow<IBacklogDB>(`SELECT * FROM backlog WHERE id = ?`, [id]);
        if (!row) {
            return null;
        }
        return new Backlog(row.id, row.userId, row.type, row.rankingType, row.title, row.artifactType);
    }

    static async getBacklogByIdWithItems(id: number): Promise<Backlog | null> {
        const backlog = await BacklogDB.getBacklogById(id);
        if (!backlog) {
            return null;
        }
        backlog.backlogItems = await BacklogDB.getBacklogItems(backlog.id, backlog.artifactType, backlog.rankingType);
        return backlog;
    }

    static async getBacklogs(userId: number, page: number, pageSize: number, artifactType: string | null, search: string = ''): Promise<Backlog[]> {
        const baseQuery = `SELECT * FROM backlog WHERE userId = ?`;
        const searchQuery = search ? ` AND LOWER(title) LIKE ?` : "";
        const artifactQuery = artifactType ? ` AND artifactType = ?` : "";
        const orderQuery = search
            ? ` ORDER BY (LOWER(title) = ?) DESC, length(title) ASC`
            : ` ORDER BY id ASC`;
        const limitOffsetQuery = ` LIMIT ? OFFSET ?`;
        const query = baseQuery + searchQuery + artifactQuery + orderQuery + limitOffsetQuery;

        const params = [
            userId,
            ...(search ? [`%${search.toLowerCase()}%`] : []),
            ...(artifactType ? [artifactType] : []),
            ...(search ? [search.toLowerCase()] : []),
            pageSize,
            page * pageSize
        ];
        const rows = await getDbRows<IBacklogDB>(query, params);
        return rows.map((row) => new Backlog(row.id, row.userId, row.type, row.rankingType, row.title, row.artifactType));
    }

    static async getBacklogMaxRank(backlogId: number): Promise<number> {
        const row = await getDbRow<{ maxRank: number }>(`SELECT MAX(rank) as maxRank FROM backlog_items WHERE backlogId = ?`, [backlogId]);
        return row?.maxRank || 0;
    }

    static async doesBacklogPerTypeExist(userId: number, type: BacklogType, artifactType: ArtifactType): Promise<boolean> {
        if (type === BacklogType.STANDARD) {
            return false;
        }
        const row = await getDbRow<IBacklogDB>(`SELECT * FROM backlog WHERE userId = ? AND type = ? AND artifactType = ?`, [userId, type, artifactType]);
        return row != null;
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
        if (artifactType === ArtifactType.ANIME) {
            backlogItems = await AnimeDB.getBacklogItems(backlogId, rankingType, finalBacklogOrder);
        } else if (artifactType === ArtifactType.GAME) {
            backlogItems = await GameDB.getBacklogItems(backlogId, rankingType, finalBacklogOrder);
        } else if (artifactType === ArtifactType.MOVIE){
            backlogItems = await MovieDB.getBacklogItems(backlogId, rankingType, finalBacklogOrder);
        } else if (artifactType === ArtifactType.TVSHOW){
            backlogItems = await TvshowDB.getBacklogItems(backlogId, rankingType, finalBacklogOrder);
        }
        return backlogItems;
    }

    static async hasBacklogItem(backlogId: number, artifactId: number): Promise<boolean> {
        const row = await getDbRow<IBacklogItemDB>(`SELECT * FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId]);
        return row != null;
    }

    static async addBacklogItem(backlogId: number, artifactId: number, rank: number): Promise<number> {
        return await runDbInsert(`INSERT INTO backlog_items (backlogId, artifactId, rank) VALUES (?, ?, ?)`, [backlogId, artifactId, rank]);
    }

    static async deleteBacklogItem(backlogId: number, artifactId: number): Promise<void> {
        const row = await getDbRow<IBacklogItemDB>(`SELECT * FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId]);
        if (row) {
            await runDbQuery(`DELETE FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId]);
            await runDbQuery(`DELETE FROM backlog_item_tag WHERE backlogId = ? AND artifactId = ?`, [backlogId, artifactId]);
            await runDbQuery(`UPDATE backlog_items SET rank = rank - 1 WHERE backlogId = ? AND rank > ?`, [backlogId, row.rank]);
        }
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

    static async moveBacklogItem(backlogId: number, srcRank: number, targetRank: number): Promise<void> {
        const row = await getDbRow<IBacklogItemDB>(`SELECT * FROM backlog_items WHERE backlogId = ? AND rank = ?`, [backlogId, srcRank]);
        if (row) {
            if (srcRank < targetRank) {
                await runDbQuery(`UPDATE backlog_items SET rank = rank - 1 WHERE backlogId = ? AND rank > ? AND rank <= ?`, [backlogId, srcRank, targetRank]);
            } else {
                await runDbQuery(`UPDATE backlog_items SET rank = rank + 1 WHERE backlogId = ? AND rank >= ? AND rank < ?`, [backlogId, targetRank, srcRank]);
            }
            await runDbQuery(`UPDATE backlog_items SET rank = ? WHERE backlogId = ? AND artifactId = ?`, [targetRank, backlogId, row.artifactId]);
        }
    }

    static async eloFight(backlogId: number, winnerArtifactId: number, loserArtifactId: number): Promise<void> {
        const winnerRow = await getDbRow<IBacklogItemDB>(`SELECT * FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, winnerArtifactId]);
        const loserRow = await getDbRow<IBacklogItemDB>(`SELECT * FROM backlog_items WHERE backlogId = ? AND artifactId = ?`, [backlogId, loserArtifactId]);
        
        if (winnerRow && loserRow) {
            const winnerElo = winnerRow.elo;
            const loserElo = loserRow.elo;
            const winnerExpected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
            const loserExpected = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
            const winnerNewElo = winnerElo + Math.round(32 * (1 - winnerExpected));
            const loserNewElo = loserElo + Math.round(32 * (0 - loserExpected));
            
            await runDbQuery(`UPDATE backlog_items SET elo = ? WHERE backlogId = ? AND artifactId = ?`, [winnerNewElo, backlogId, winnerArtifactId]);
            await runDbQuery(`UPDATE backlog_items SET elo = ? WHERE backlogId = ? AND artifactId = ?`, [loserNewElo, backlogId, loserArtifactId]);
        }
    }

    static async deleteBacklog(id: number): Promise<void> {
        await runDbQuery(`DELETE FROM backlog WHERE id = ?`, [id]);
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

    static async getCurrentBacklogIdForUser(userId: number, artifactType: ArtifactType): Promise<number | null> {
        const row = await getDbRow<IBacklogDB>(`SELECT * FROM backlog WHERE userId = ? AND type = ? AND artifactType = ?`, [userId, BacklogType.CURRENT, artifactType]);
        return row ? row.id : null;
    }

    static async createCurrentBacklogForUser(userId: number, artifactType: ArtifactType): Promise<number> {
        const backlogId = await runDbInsert(`INSERT INTO backlog (userId, title, type, artifactType, rankingType) VALUES (?, 'Current Backlog', ?, ?, 'elo')`, [userId, BacklogType.CURRENT, artifactType]);
        return backlogId;
    }

    static async getFutureBacklogIdForUser(userId: number, artifactType: ArtifactType): Promise<number | null> {
        const row = await getDbRow<IBacklogDB>(`SELECT * FROM backlog WHERE userId = ? AND type = ? AND artifactType = ?`, [userId, BacklogType.FUTURE, artifactType]);
        return row ? row.id : null;
    }

    static async createFutureBacklogForUser(userId: number, artifactType: ArtifactType): Promise<number> {
        const backlogId = await runDbInsert(`INSERT INTO backlog (userId, title, type, artifactType, rankingType) VALUES (?, 'Future Backlog', ?, ?, 'elo')`, [userId, BacklogType.FUTURE, artifactType]);
        return backlogId;
    }

    static async getCurrentSuggestedArtifacts(
        userId: number,
        artifactType: ArtifactType,
        backlogId: number,
        limit: number = 10
    ): Promise<IArtifactDB[]> {
        const currentDate = Math.floor(Date.now());

        const query = `
            SELECT DISTINCT artifact.*
            FROM artifact
            JOIN user_artifact ON artifact.id = user_artifact.artifactId
            WHERE artifact.type = ?
                AND user_artifact.userId = ?
                AND user_artifact.status = 'wishlist'
                AND CAST(artifact.releaseDate AS INTEGER) <= ?
                AND artifact.id NOT IN (
                    SELECT artifactId
                    FROM backlog_items
                    WHERE backlogId = ?
                )
            ORDER BY artifact.releaseDate DESC
            LIMIT ?
        `;

        return await getDbRows<IArtifactDB>(query, [artifactType, userId, currentDate, backlogId, limit]);
    }

    static async getFutureSuggestedArtifacts(
        userId: number,
        artifactType: ArtifactType,
        backlogId: number,
        limit: number = 10
    ): Promise<IArtifactDB[]> {
        const currentDate = Math.floor(Date.now());

        const query = `
            SELECT DISTINCT artifact.*
            FROM artifact
            JOIN user_artifact ON artifact.id = user_artifact.artifactId
            WHERE artifact.type = ?
                AND user_artifact.userId = ?
                AND user_artifact.status = 'wishlist'
                AND CAST(artifact.releaseDate AS INTEGER) > ?
                AND artifact.id NOT IN (
                    SELECT artifactId
                    FROM backlog_items
                    WHERE backlogId = ?
                )
            ORDER BY artifact.releaseDate ASC
            LIMIT ?
        `;

        return await getDbRows<IArtifactDB>(query, [artifactType, userId, currentDate, backlogId, limit]);
    }

    static async createBacklogTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS backlog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            type TEXT NOT NULL DEFAULT 'standard',
            rankingType TEXT NOT NULL,
            title TEXT NOT NULL,
            artifactType TEXT NOT NULL
        )`);
    }

    static async createBacklogItemsTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS backlog_items (
            backlogId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            dateAdded TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            rank INTEGER NOT NULL,
            elo INTERGER NOT NULL DEFAULT 1200,
            PRIMARY KEY (backlogId, artifactId)
        )`);
    }

    static async createBacklogItemTagTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS backlog_item_tag (
            backlogId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            tagId TEXT NOT NULL,
            PRIMARY KEY (backlogId, artifactId, tagId)
        )`);
    }
}