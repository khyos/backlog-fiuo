import { ArtifactType } from "$lib/model/Artifact";
import { AuthorizationStatus } from "$lib/model/AuthorizationStatus";
import { Backlog, BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
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
    static async createBacklog(userId: number, title: string, artifactType: ArtifactType, rankingType: BacklogRankingType): Promise<Backlog | null> {
        const backlogId = await runDbInsert(`INSERT INTO backlog (userId, title, artifactType, rankingType) VALUES (?, ?, ?, ?)`, [userId, title, artifactType, rankingType]);
        return new Backlog(backlogId, userId, rankingType, title, artifactType);
    }
    
    static async getBacklogById(id: number): Promise<Backlog | null> {
        const row = await getDbRow<IBacklogDB>(`SELECT * FROM backlog WHERE id = ?`, [id]);
        if (!row) {
            return null;
        }
        return new Backlog(row.id, row.userId, row.rankingType, row.title, row.artifactType);
    }

    static async getBacklogByIdWithItems(id: number): Promise<Backlog | null> {
        const backlog = await BacklogDB.getBacklogById(id);
        if (!backlog) {
            return null;
        }
        backlog.backlogItems = await BacklogDB.getBacklogItems(backlog.id, backlog.artifactType, backlog.rankingType);
        return backlog;
    }

    static async getVirtualWishlistBacklog(userId: number, artifactType: ArtifactType): Promise<Backlog | null> {
        const rankingType = await BacklogDB.getUserWishlistRankingType(userId, artifactType);
        
        // If using RANK mode, normalize ranks to ensure no gaps and proper incremental ordering
        if (rankingType === BacklogRankingType.RANK) {
            await BacklogDB.normalizeWishlistRanks(userId, artifactType);
        }
        
        const backlog = new Backlog(-1, userId, rankingType, `${artifactType} Wishlist`, artifactType);
        backlog.backlogItems = await BacklogDB.getVirtualWishlistItems(userId, artifactType, rankingType);
        return backlog;
    }

    static async getVirtualFutureBacklog(userId: number, artifactType: ArtifactType): Promise<Backlog | null> {
        const backlog = new Backlog(-2, userId, BacklogRankingType.WISHLIST, `${artifactType} Future`, artifactType);
        backlog.backlogItems = await BacklogDB.getVirtualFutureItems(userId, artifactType);
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
        return rows.map((row) => new Backlog(row.id, row.userId, row.rankingType, row.title, row.artifactType));
    }

    static async getBacklogMaxRank(backlogId: number): Promise<number> {
        const row = await getDbRow<{ maxRank: number }>(`SELECT MAX(rank) as maxRank FROM backlog_items WHERE backlogId = ?`, [backlogId]);
        return row?.maxRank || 0;
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

    static async getVirtualWishlistItems(userId: number, artifactType: ArtifactType, rankingType?: BacklogRankingType): Promise<BacklogItem[]> {
        const effectiveRankingType = rankingType || BacklogRankingType.ELO;
        
        let finalBacklogOrder: BacklogOrder;
        switch (effectiveRankingType) {
            case BacklogRankingType.ELO:
                finalBacklogOrder = BacklogOrder.ELO;
                break;
            case BacklogRankingType.RANK:
                finalBacklogOrder = BacklogOrder.RANK;
                break;
            default:
                finalBacklogOrder = BacklogOrder.ELO;
        }
        
        let backlogItems: BacklogItem[] = [];
        if (artifactType === ArtifactType.ANIME) {
            backlogItems = await AnimeDB.getVirtualWishlistItems(userId, finalBacklogOrder);
        } else if (artifactType === ArtifactType.GAME) {
            backlogItems = await GameDB.getVirtualWishlistItems(userId, finalBacklogOrder);
        } else if (artifactType === ArtifactType.MOVIE){
            backlogItems = await MovieDB.getVirtualWishlistItems(userId, finalBacklogOrder);
        } else if (artifactType === ArtifactType.TVSHOW){
            backlogItems = await TvshowDB.getVirtualWishlistItems(userId, finalBacklogOrder);
        }
        return backlogItems;
    }

    static async getVirtualFutureItems(userId: number, artifactType: ArtifactType): Promise<BacklogItem[]> {
        let backlogItems: BacklogItem[] = [];
        if (artifactType === ArtifactType.ANIME) {
            backlogItems = await AnimeDB.getVirtualFutureItems(userId);
        } else if (artifactType === ArtifactType.GAME) {
            backlogItems = await GameDB.getVirtualFutureItems(userId);
        } else if (artifactType === ArtifactType.MOVIE){
            backlogItems = await MovieDB.getVirtualFutureItems(userId);
        } else if (artifactType === ArtifactType.TVSHOW){
            backlogItems = await TvshowDB.getVirtualFutureItems(userId);
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

    static async eloFightVirtualWishlist(userId: number, winnerArtifactId: number, loserArtifactId: number): Promise<void> {
        // First ensure both artifacts have wishlist elo records
        await BacklogDB.ensureWishlistEloRecord(userId, winnerArtifactId);
        await BacklogDB.ensureWishlistEloRecord(userId, loserArtifactId);
        
        const winnerRow = await getDbRow<{elo: number}>(`SELECT elo FROM user_artifact_wishlist_elo WHERE userId = ? AND artifactId = ?`, [userId, winnerArtifactId]);
        const loserRow = await getDbRow<{elo: number}>(`SELECT elo FROM user_artifact_wishlist_elo WHERE userId = ? AND artifactId = ?`, [userId, loserArtifactId]);
        
        if (winnerRow && loserRow) {
            const winnerElo = winnerRow.elo;
            const loserElo = loserRow.elo;
            const winnerExpected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
            const loserExpected = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
            const winnerNewElo = winnerElo + Math.round(32 * (1 - winnerExpected));
            const loserNewElo = loserElo + Math.round(32 * (0 - loserExpected));
            
            await runDbQuery(`UPDATE user_artifact_wishlist_elo SET elo = ? WHERE userId = ? AND artifactId = ?`, [winnerNewElo, userId, winnerArtifactId]);
            await runDbQuery(`UPDATE user_artifact_wishlist_elo SET elo = ? WHERE userId = ? AND artifactId = ?`, [loserNewElo, userId, loserArtifactId]);
        }
    }

    static async ensureWishlistEloRecord(userId: number, artifactId: number): Promise<void> {
        const exists = await getDbRow<{count: number}>(`SELECT COUNT(*) as count FROM user_artifact_wishlist_elo WHERE userId = ? AND artifactId = ?`, [userId, artifactId]);
        if (!exists || exists.count === 0) {
            await runDbQuery(`INSERT OR IGNORE INTO user_artifact_wishlist_elo (userId, artifactId, elo, dateAdded) VALUES (?, ?, 1200, CURRENT_TIMESTAMP)`, [userId, artifactId]);
        }
    }

    static async getUserWishlistRankingType(userId: number, artifactType: ArtifactType): Promise<BacklogRankingType> {
        const row = await getDbRow<{rankingType: BacklogRankingType}>(`SELECT rankingType FROM user_wishlist_preferences WHERE userId = ? AND artifactType = ?`, [userId, artifactType]);
        return row?.rankingType || BacklogRankingType.ELO; // Default to ELO for backwards compatibility
    }

    static async setUserWishlistRankingType(userId: number, artifactType: ArtifactType, rankingType: BacklogRankingType): Promise<void> {
        const oldRankingType = await BacklogDB.getUserWishlistRankingType(userId, artifactType);
        await runDbQuery(`INSERT OR REPLACE INTO user_wishlist_preferences (userId, artifactType, rankingType) VALUES (?, ?, ?)`, [userId, artifactType, rankingType]);
        
        // If switching to RANK mode, initialize ranks based on current ELO order
        if (rankingType === BacklogRankingType.RANK && oldRankingType !== BacklogRankingType.RANK) {
            await BacklogDB.initializeWishlistRanksFromElo(userId, artifactType);
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

    static async canEditVirtualWishlistBacklog(user: User, userId: number): Promise<AuthorizationStatus> {
        if (!user.hasRight(UserRights.EDIT_BACKLOG)) {
            return new AuthorizationStatus(403, "Not authorized");
        }
        if (user.id !== userId) {
            return new AuthorizationStatus(404, "Not authorized");
        }
        return new AuthorizationStatus(200, "OK");
    }


    static async createBacklogTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS backlog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
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

    static async createWishlistEloTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS user_artifact_wishlist_elo (
            userId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            elo INTEGER NOT NULL DEFAULT 1200,
            dateAdded TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (userId, artifactId)
        )`);
    }

    static async createUserWishlistPreferencesTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS user_wishlist_preferences (
            userId INTEGER NOT NULL,
            artifactType TEXT NOT NULL,
            rankingType TEXT NOT NULL,
            PRIMARY KEY (userId, artifactType)
        )`);
    }

    static async createWishlistRankTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS user_artifact_wishlist_rank (
            userId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            rank INTEGER NOT NULL,
            dateAdded TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (userId, artifactId)
        )`);
    }

    static async ensureWishlistRankRecord(userId: number, artifactId: number): Promise<void> {
        const exists = await getDbRow<{count: number}>(`SELECT COUNT(*) as count FROM user_artifact_wishlist_rank WHERE userId = ? AND artifactId = ?`, [userId, artifactId]);
        if (!exists || exists.count === 0) {
            await runDbQuery(`INSERT OR IGNORE INTO user_artifact_wishlist_rank (userId, artifactId, rank, dateAdded) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`, [userId, artifactId, 999999]);
        }
    }

    static async initializeWishlistRanksFromElo(userId: number, artifactType: ArtifactType): Promise<void> {
        // Get all wishlist items ordered by ELO and assign sequential ranks
        // Only include released items (same filter as getVirtualWishlistItems)
        const wishlistItems = await getDbRows<{artifactId: number, elo: number}>(`
            SELECT ua.artifactId, COALESCE(elo_table.elo, 1200) as elo
            FROM user_artifact ua
            INNER JOIN artifact a ON ua.artifactId = a.id
            LEFT JOIN user_artifact_wishlist_elo elo_table ON ua.artifactId = elo_table.artifactId AND ua.userId = elo_table.userId
            WHERE ua.userId = ? AND ua.status = 'wishlist' AND a.type = ?
            AND CAST(a.releaseDate AS INTEGER) <= CAST(strftime('%s', 'now') AS INTEGER) * 1000
            ORDER BY COALESCE(elo_table.elo, 1200) DESC, ua.startDate ASC
        `, [userId, artifactType]);
        
        // Clear existing ranks for this user and artifact type (only for released items)
        await runDbQuery(`
            DELETE FROM user_artifact_wishlist_rank 
            WHERE userId = ? AND artifactId IN (
                SELECT ua.artifactId FROM user_artifact ua
                INNER JOIN artifact a ON ua.artifactId = a.id
                WHERE ua.userId = ? AND ua.status = 'wishlist' AND a.type = ?
                AND CAST(a.releaseDate AS INTEGER) <= CAST(strftime('%s', 'now') AS INTEGER) * 1000
            )
        `, [userId, userId, artifactType]);
        
        // Insert new sequential ranks (always distinct: 1, 2, 3, 4...)
        // Even if multiple items have the same ELO, they get different ranks in RANK mode
        for (let i = 0; i < wishlistItems.length; i++) {
            const item = wishlistItems[i];
            await runDbQuery(`
                INSERT INTO user_artifact_wishlist_rank (userId, artifactId, rank, dateAdded) 
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [userId, item.artifactId, i + 1]);
        }
    }

    static async moveWishlistItem(userId: number, artifactType: ArtifactType, srcRank: number, targetRank: number): Promise<void> {
        // Get the artifactId of the item at srcRank
        const srcItem = await getDbRow<{artifactId: number}>(`
            SELECT wr.artifactId 
            FROM user_artifact_wishlist_rank wr
            INNER JOIN user_artifact ua ON wr.artifactId = ua.artifactId AND wr.userId = ua.userId
            INNER JOIN artifact a ON ua.artifactId = a.id
            WHERE wr.userId = ? AND wr.rank = ? AND ua.status = 'wishlist' AND a.type = ?
        `, [userId, srcRank, artifactType]);

        if (!srcItem) {
            throw new Error('Source item not found');
        }

        const artifactId = srcItem.artifactId;

        // Update ranks: move items between srcRank and targetRank
        if (srcRank < targetRank) {
            // Moving down: decrease rank of items between srcRank+1 and targetRank
            await runDbQuery(`
                UPDATE user_artifact_wishlist_rank 
                SET rank = rank - 1 
                WHERE userId = ? AND rank > ? AND rank <= ?
                AND artifactId IN (
                    SELECT ua.artifactId FROM user_artifact ua
                    INNER JOIN artifact a ON ua.artifactId = a.id
                    WHERE ua.userId = ? AND ua.status = 'wishlist' AND a.type = ?
                )
            `, [userId, srcRank, targetRank, userId, artifactType]);
        } else {
            // Moving up: increase rank of items between targetRank and srcRank-1
            await runDbQuery(`
                UPDATE user_artifact_wishlist_rank 
                SET rank = rank + 1 
                WHERE userId = ? AND rank >= ? AND rank < ?
                AND artifactId IN (
                    SELECT ua.artifactId FROM user_artifact ua
                    INNER JOIN artifact a ON ua.artifactId = a.id
                    WHERE ua.userId = ? AND ua.status = 'wishlist' AND a.type = ?
                )
            `, [userId, targetRank, srcRank, userId, artifactType]);
        }

        // Set the moved item to its new rank
        await runDbQuery(`UPDATE user_artifact_wishlist_rank SET rank = ? WHERE userId = ? AND artifactId = ?`, [targetRank, userId, artifactId]);
    }

    static async normalizeWishlistRanks(userId: number, artifactType: ArtifactType): Promise<void> {
        // Get all current wishlist items with their existing ranks, ordered by current rank then ELO
        const wishlistItems = await getDbRows<{artifactId: number, currentRank: number}>(`
            SELECT wr.artifactId, wr.rank as currentRank
            FROM user_artifact ua
            INNER JOIN artifact a ON ua.artifactId = a.id
            LEFT JOIN user_artifact_wishlist_rank wr ON ua.artifactId = wr.artifactId AND ua.userId = wr.userId
            LEFT JOIN user_artifact_wishlist_elo elo_table ON ua.artifactId = elo_table.artifactId AND ua.userId = elo_table.userId
            WHERE ua.userId = ? AND ua.status = 'wishlist' AND a.type = ?
            AND CAST(a.releaseDate AS INTEGER) <= CAST(strftime('%s', 'now') AS INTEGER) * 1000
            ORDER BY wr.rank ASC, COALESCE(elo_table.elo, 1200) DESC, ua.startDate ASC
        `, [userId, artifactType]);

        if (wishlistItems.length === 0) {
            return;
        }

        // Clear existing ranks for this user and artifact type (only for released items)
        await runDbQuery(`
            DELETE FROM user_artifact_wishlist_rank 
            WHERE userId = ? AND artifactId IN (
                SELECT ua.artifactId FROM user_artifact ua
                INNER JOIN artifact a ON ua.artifactId = a.id
                WHERE ua.userId = ? AND ua.status = 'wishlist' AND a.type = ?
                AND CAST(a.releaseDate AS INTEGER) <= CAST(strftime('%s', 'now') AS INTEGER) * 1000
            )
        `, [userId, userId, artifactType]);
        
        // Insert new sequential ranks (1, 2, 3, 4...) preserving the current order
        for (let i = 0; i < wishlistItems.length; i++) {
            const item = wishlistItems[i];
            if (item.artifactId) {
                await runDbQuery(`
                    INSERT INTO user_artifact_wishlist_rank (userId, artifactId, rank, dateAdded) 
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                `, [userId, item.artifactId, i + 1]);
            }
        }
    }
}