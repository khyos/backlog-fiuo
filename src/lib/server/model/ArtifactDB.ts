import type { IArtifactDB, ArtifactType, Artifact } from "$lib/model/Artifact";
import { SERIALIZE_TYPE, UserArtifact, UserArtifactStatus, type IUserArtifactDB } from "$lib/model/UserArtifact";
import { UserList } from "$lib/model/UserList";
import { type IUserListItemDB } from "$lib/model/UserListItem";
import { artifactFromJSON } from "$lib/services/ArtifactService";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { Genre } from "$lib/model/Genre";
import { runDbQueries, runDbQuery, getDbRow, getDbRows, runDbInsert } from "../database";
import { type IBacklogItemDB } from "./BacklogDB";

export interface IGenreDB {
    id: number;
    title: string;
}

export class ArtifactDB {
    // ========================================
    // Basic Getters
    // ========================================
    static async getArtifacts(artifactType: ArtifactType, page: number, pageSize: number, search: string = ''): Promise<IArtifactDB[]> {
        const query = search
            ? `SELECT * FROM artifact WHERE type = ? AND LOWER(title) LIKE ? ORDER BY (LOWER(title) = ?) desc, length(title) ASC LIMIT ? OFFSET ?`
            : `SELECT * FROM artifact WHERE type = ? ORDER BY id ASC LIMIT ? OFFSET ?`;
        const params = search
            ? [artifactType, `%${search.toLowerCase()}%`, search.toLowerCase(), pageSize, page * pageSize]
            : [artifactType, pageSize, page * pageSize];
        return await getDbRows<IArtifactDB>(query, params);
    }

    static async getArtifactById(id: number): Promise<IArtifactDB | null> {
        return await getDbRow<IArtifactDB>(`SELECT * FROM artifact WHERE id = ?`, [id]);
    }

    static async getChildrenByParentId(parentId: number): Promise<IArtifactDB[]> {
        return await getDbRows<IArtifactDB>(`SELECT * FROM artifact WHERE parent_artifact_id = ? ORDER BY child_index ASC`, [parentId]);
    }

    // ========================================
    // Genre Methods
    // ========================================
    static async getGenreDefinitions(genreTableName: string): Promise<Genre[]> {
        const rows = await getDbRows<IGenreDB>(`SELECT * FROM ${genreTableName} ORDER BY title`);
        return rows.map((row: IGenreDB) => new Genre(row.id, row.title));
    }

    static async addGenreDefinition(genreId: number, title: string, genreTableName: string): Promise<void> {
        return await runDbQuery(`INSERT OR IGNORE INTO ${genreTableName} (id, title) VALUES (?, ?)`, [genreId, title]);
    }

    static async getAssignedGenres(artifactId: number, genreTableName: string, genreMapTableName: string): Promise<Genre[]> {
        const rows = await getDbRows<IGenreDB>(`SELECT ${genreTableName}.id as id, title FROM ${genreMapTableName}
                    INNER JOIN ${genreTableName} ON ${genreMapTableName}.genreId = ${genreTableName}.id
                    WHERE artifactId = ?`, [artifactId]);
        return rows.map((row: IGenreDB) => new Genre(row.id, row.title));
    }

    static async assignGenre(artifactId: number, genreId: number, genreMapTableName: string): Promise<void> {
        return await runDbQuery(`INSERT OR IGNORE INTO ${genreMapTableName} (artifactId, genreId) VALUES (?, ?)`, [artifactId, genreId]);
    }

    static async updateAssignedGenres(
        artifactId: number,
        genreIds: number[],
        getGenresMethod: (artifactId: number) => Promise<Genre[]>,
        genreMapTableName: string
    ): Promise<void> {
        const existingGenres = await getGenresMethod(artifactId);
        const existingGenreIds = existingGenres.map(genre => genre.id);

        const genresToRemove = existingGenreIds.filter(id => !genreIds.includes(id));
        for (const genreId of genresToRemove) {
            await ArtifactDB.unassignGenre(artifactId, genreId, genreMapTableName);
        }

        const genresToAdd = genreIds.filter(id => !existingGenreIds.includes(id));
        for (const genreId of genresToAdd) {
            await ArtifactDB.assignGenre(artifactId, genreId, genreMapTableName);
        }
    }

    static async unassignGenre(artifactId: number, genreId: number, genreMapTableName: string): Promise<void> {
        return await runDbQuery(`DELETE FROM ${genreMapTableName} WHERE artifactId = ? AND genreId = ?`, [artifactId, genreId]);
    }

    // ========================================
    // User-related Methods
    // ========================================
    static async getUserList(userId: number, artifactType: ArtifactType): Promise<UserList> {
        const query = `SELECT *
                       FROM artifact
                       INNER JOIN user_artifact ON artifact.id = user_artifact.artifactId
                       WHERE artifact.type = ? AND user_artifact.userId = ?`;
        const params = [artifactType, userId];
        const rows = await getDbRows<IUserListItemDB>(query, params);
        
        const userListItems = rows.map((row) => {
            return artifactFromJSON(artifactType, {
                __type: 'Artifact',
                id: row.id,
                title: row.title,
                type: row.type,
                duration: row.duration,
                releaseDate: new Date(parseInt(row.releaseDate, 10)).toString(),
                links: [],
                genres: [],
                ratings: [],
                meanRating: null,
                tags: [],
                children: [],
                childIndex: null,
                userInfo: {
                    __type: SERIALIZE_TYPE,
                    userId: userId,
                    artifactId: row.id,
                    status: row.status,
                    score: row.score,
                    startDate: row.startDate,
                    endDate: row.endDate
                }
            });
        });
        return new UserList(userId, artifactType, userListItems);
    }

    static async getUserOngoingList(userId: number, artifactType: ArtifactType): Promise<UserList> {
        const query = `SELECT *
                       FROM artifact
                       INNER JOIN user_artifact ON artifact.id = user_artifact.artifactId
                       WHERE artifact.type = ? AND user_artifact.userId = ? AND user_artifact.status = 'ongoing'`;
        const params = [artifactType, userId];
        const rows = await getDbRows<IUserListItemDB>(query, params);
        
        const userListItems = rows.map((row) => {
            return artifactFromJSON(artifactType, {
                __type: 'Artifact',
                id: row.id,
                title: row.title,
                type: row.type,
                duration: row.duration,
                releaseDate: new Date(parseInt(row.releaseDate, 10)).toString(),
                links: [],
                genres: [],
                ratings: [],
                meanRating: null,
                tags: [],
                children: [],
                childIndex: null,
                userInfo: {
                    __type: SERIALIZE_TYPE,
                    userId: userId,
                    artifactId: row.id,
                    status: row.status,
                    score: row.score,
                    startDate: row.startDate,
                    endDate: row.endDate
                }
            });
        });
        return new UserList(userId, artifactType, userListItems);
    }

    static async getUserOngoingArtifacts(
        userId: number, 
        artifactType: ArtifactType, 
        fetchOnhold: boolean = false
    ): Promise<IArtifactDB[]> {
        const statusCondition = fetchOnhold
            ? `AND (user_artifact.status = 'ongoing' OR user_artifact.status = 'onhold')`
            : `AND user_artifact.status = 'ongoing'`;
        
        const query = `
            SELECT 
                artifact.*
            FROM 
                artifact
            JOIN 
                user_artifact ON artifact.id = user_artifact.artifactId
            WHERE 
                artifact.type = ?
                AND user_artifact.userId = ?
                ${statusCondition}
        `;

        return await getDbRows<IArtifactDB>(query, [artifactType, userId]);
    }

    static async getUserInfo(userId: number, artifactId: number): Promise<UserArtifact | null> {
        const row = await getDbRow<IUserArtifactDB>(`SELECT * FROM user_artifact WHERE userId = ? AND artifactId = ?`, [userId, artifactId]);
        if (!row) {
            return null;
        }
        return new UserArtifact(
            row.userId,
            row.artifactId,
            row.status,
            row.score,
            row.startDate ? new Date(row.startDate) : null,
            row.endDate ? new Date(row.endDate) : null
        );
    }

    static async getUserInfos(userId: number, artifactIds: number[]): Promise<UserArtifact[]> {
        const questionMarks = new Array(artifactIds.length).fill('?').join(',');
        const rows = await getDbRows<IUserArtifactDB>(`SELECT * FROM user_artifact WHERE userId = ? AND artifactId IN (${questionMarks})`, [userId, ...artifactIds]);
        return rows.map(row => new UserArtifact(
            row.userId,
            row.artifactId,
            row.status,
            row.score,
            row.startDate ? new Date(row.startDate) : null,
            row.endDate ? new Date(row.endDate) : null
        ));
    }

    static async getBacklogItems(
        backlogId: number,
        rankingType: BacklogRankingType,
        backlogOrder: BacklogOrder
    ): Promise<IBacklogItemDB[]> {
        let rank = '';
        if (rankingType === BacklogRankingType.ELO) {
            rank = ', RANK() OVER (ORDER BY elo DESC) AS rank';
        } else if (rankingType === BacklogRankingType.WISHLIST) {
            rank = ', RANK() OVER (ORDER BY releaseDate ASC) AS rank';
        }

        let sqlOrder = 'rank ASC, dateAdded ASC';
        if (backlogOrder === BacklogOrder.ELO) {
            sqlOrder = 'elo DESC, dateAdded ASC';
        } else if (backlogOrder === BacklogOrder.DATE_ADDED) {
            sqlOrder = 'dateAdded ASC';
        } else if (backlogOrder === BacklogOrder.DATE_RELEASE) {
            sqlOrder = 'releaseDate ASC';
        }

        return await getDbRows<IBacklogItemDB>(`SELECT *, CAST(strftime('%s', dateAdded) AS INTEGER) AS dateAdded${rank}
                FROM backlog_items
                INNER JOIN artifact ON backlog_items.artifactId = artifact.id
                WHERE backlogId = ?
                ORDER BY ${sqlOrder}`, [backlogId]);
    }
    
    // ========================================
    // Create Operations
    // ========================================
    static async createArtifact(
        title: string,
        artifactType: ArtifactType,
        description: string = '',
        releaseDate: Date = new Date(),
        duration: number = 0
    ): Promise<number> {
        const query = `INSERT INTO artifact (title, description, type, releaseDate, duration) VALUES (?, ?, ?, ?, ?)`;
        const params = [title, description, artifactType, releaseDate.getTime().toString(), duration];
        return await runDbInsert(query, params);
    }

    // ========================================
    // Update Operations
    // ========================================
    static async updateArtifact(
        id: number,
        title: string,
        releaseDate: Date = new Date(7258118400000),
        duration: number = 0
    ): Promise<void> {
        return await runDbQuery(`UPDATE artifact SET title = ?, releaseDate = ?, duration = ? WHERE id = ?`, 
            [title, releaseDate.getTime().toString(), duration, id]);
    }

    static async updateArtifactWithIndex(
        id: number,
        childIndex: number,
        title: string,
        releaseDate: Date = new Date(7258118400000),
        duration: number = 0
    ): Promise<void> {
        return await runDbQuery(`UPDATE artifact SET child_index = ?, title = ?, releaseDate = ?, duration = ? WHERE id = ?`, 
            [childIndex, title, releaseDate.getTime().toString(), duration, id]);
    }

    static async updateDuration(artifactId: number, duration: number = 0): Promise<void> {
        return await runDbQuery(`UPDATE artifact SET duration = ? WHERE id = ?`, [duration, artifactId]);
    }

    static async setUserScore(userId: number, artifactId: number, score: number): Promise<void> {
        const userInfo = await ArtifactDB.getUserInfo(userId, artifactId);
        if (userInfo) {
            await runDbQuery(`UPDATE user_artifact SET score = ? WHERE userId = ? AND artifactId = ?`, [score, userId, artifactId]);
        } else {
            await runDbQuery(`INSERT INTO user_artifact (userId, artifactId, score) VALUES (?, ?, ?)`, [userId, artifactId, score]);
        }
    }

    static async setUserStatus(userId: number, artifactIds: number[], status: UserArtifactStatus | null): Promise<void> {
        const userInfos = await ArtifactDB.getUserInfos(userId, artifactIds);
        const existingArtifactIds = userInfos.map(userInfo => userInfo.artifactId);
        const artifactIdsToCreate: number[] = [];
        const artifactIdsToUpdate: number[] = [];
        for (const artifactId of artifactIds) {
            if (existingArtifactIds.includes(artifactId)) {
                artifactIdsToUpdate.push(artifactId);
            } else {
                artifactIdsToCreate.push(artifactId);
            }
        }

        if (artifactIdsToCreate.length > 0) {
            const placeholders = artifactIdsToCreate.map(() => "(?, ?, ?)").join(", ");
            const values = artifactIdsToCreate.flatMap(artifactId => [userId, artifactId, status]);
            await runDbQuery(`INSERT INTO user_artifact (userId, artifactId, status) VALUES ${placeholders}`, values);
        }
        if (artifactIdsToUpdate.length > 0) {
            const questionMarks = new Array(artifactIdsToUpdate.length).fill('?').join(',');
            await runDbQuery(`UPDATE user_artifact SET status = ? WHERE userId = ? AND artifactId IN (${questionMarks})`, [status, userId, ...artifactIdsToUpdate]);
        }

        /*
        // Handle wishlist rank management
        if (status === UserArtifactStatus.WISHLIST) {
            // If setting status to wishlist, ensure proper rank records for new items
            for (const artifactId of artifactIdsToCreate) {
                await BacklogDB.ensureWishlistRankRecord(userId, artifactId);
            }
            for (const artifactId of artifactIdsToUpdate) {
                await BacklogDB.ensureWishlistRankRecord(userId, artifactId);
            }
        }
        */
    }

    static async setUserDate(userId: number, artifactId: number, date: string | null, startEnd: 'start' | 'end' | 'both'): Promise<void> {
        const userInfo = await ArtifactDB.getUserInfo(userId, artifactId);
        let query: string;
        let params: (string | null | number)[];
        
        if (userInfo) {
            if (startEnd === 'start') {
                query = `UPDATE user_artifact SET startDate = ? WHERE userId = ? AND artifactId = ?`;
                params = [date, userId, artifactId];
            } else if (startEnd === 'end') {
                query = `UPDATE user_artifact SET endDate = ? WHERE userId = ? AND artifactId = ?`;
                params = [date, userId, artifactId];
            } else if (startEnd === 'both') {
                query = `UPDATE user_artifact SET startDate = ?, endDate = ? WHERE userId = ? AND artifactId = ?`;
                params = [date, date, userId, artifactId];
            } else {
                throw new Error('Invalid startEnd parameter');
            }
        } else {
            if (startEnd === 'start') {
                query = `INSERT INTO user_artifact (userId, artifactId, startDate) VALUES (?, ?, ?)`;
                params = [userId, artifactId, date];
            } else if (startEnd === 'end') {
                query = `INSERT INTO user_artifact (userId, artifactId, endDate) VALUES (?, ?, ?)`;
                params = [userId, artifactId, date];
            } else if (startEnd === 'both') {
                query = `INSERT INTO user_artifact (userId, artifactId, startDate, endDate) VALUES (?, ?, ?, ?)`;
                params = [userId, artifactId, date, date];
            } else {
                throw new Error('Invalid startEnd parameter');
            }
        }
        
        await runDbQuery(query, params);
    }

    // ========================================
    // Delete Operations
    // ========================================
    static async deleteArtifactAndChildren(
        artifact: Artifact,
        genreMapTableName: string
    ): Promise<void> {
        const id = artifact.id;
        const artifactIdsToDelete = artifact.getArtifactIds();
        const questionMarks = new Array(artifactIdsToDelete.length).fill('?').join(',');
        await runDbQueries([
            {
                query: `DELETE FROM artifact WHERE id IN (${questionMarks})`,
                params: artifactIdsToDelete
            },
            {
                query: `DELETE FROM user_artifact WHERE artifactId IN (${questionMarks})`,
                params: artifactIdsToDelete
            },
            {
                query: `DELETE FROM ${genreMapTableName} WHERE artifactId = ?`,
                params: [id]
            },
            {
                query: `DELETE FROM rating WHERE artifactId = ?`,
                params: [id]
            },
            {
                query: `DELETE FROM link WHERE artifactId = ?`,
                params: [id]
            },
            {
                query: `DELETE FROM backlog_items WHERE artifactId = ?`,
                params: [id]
            },
            {
                query: `DELETE FROM backlog_item_tag WHERE artifactId = ?`,
                params: [id]
            }
        ]);
    }

    static async deleteChildArtifact(artifactId: number): Promise<void> {
        await runDbQueries([
            {
                query: `DELETE FROM artifact WHERE id = ?`,
                params: [artifactId]
            },
            {
                query: `DELETE FROM user_artifact WHERE artifactId = ?`,
                params: [artifactId]
            }
        ]);
    }

    // ========================================
    // Utility Methods
    // ========================================
    static async fetchChildren<T, C>(
        parents: T[],
        createChildFunction: (row: IArtifactDB) => C,
        getParentId: (parent: T) => number,
        addChildToParent: (parent: T, child: C) => void
    ): Promise<void> {
        if (parents.length === 0) return;

        const questionMarks = new Array(parents.length).fill('?').join(',');
        const parentIds = parents.map(getParentId);
        const parentsMap = new Map<number, T>();
        
        parents.forEach(parent => {
            parentsMap.set(getParentId(parent), parent);
        });

        const rows = await getDbRows<IArtifactDB>(`SELECT * FROM artifact WHERE parent_artifact_id IN (${questionMarks}) ORDER BY child_index`, parentIds);
        
        for (const row of rows) {
            const child = createChildFunction(row);
            if (row.parent_artifact_id) {
                const parent = parentsMap.get(row.parent_artifact_id);
                if (parent) {
                    addChildToParent(parent, child);
                }
            }
        }
    }

    // ========================================
    // Table Creation Methods
    // ========================================
    static async createArtifactTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS artifact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            parent_artifact_id INTEGER,
            child_index INTEGER,
            duration INTEGER,
            releaseDate TEXT,
            FOREIGN KEY (parent_artifact_id) REFERENCES artifact_new(id)
        )`);
    }

    static async createUserArtifactTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS user_artifact (
            userId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            status TEXT,
            score INTEGER,
            startDate TIMESTAMP,
            endDate TIMESTAMP,
            PRIMARY KEY (userId, artifactId)
        )`);
    }

    static async createGenreTable(genreTableName: string) {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS ${genreTableName} (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL
        )`);
    }

    static async createGenreMapTable(genreMapTableName: string) {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS ${genreMapTableName} (
            artifactId INTEGER NOT NULL,
            genreId INTEGER NOT NULL,
            PRIMARY KEY (artifactId, genreId),
            FOREIGN KEY (artifactId) REFERENCES artifact(id),
            FOREIGN KEY (genreId) REFERENCES ${genreMapTableName.split('_')[0]}_genre(id)
        )`);
    }
}
