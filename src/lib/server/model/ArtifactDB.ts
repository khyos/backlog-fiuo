import type { IArtifactDB, ArtifactType, Artifact } from "$lib/model/Artifact";
import { SERIALIZE_TYPE, UserArtifact, UserArtifactStatus, type IUserArtifactDB } from "$lib/model/UserArtifact";
import { UserList } from "$lib/model/UserList";
import { type IUserListItemDB } from "$lib/model/UserListItem";
import { artifactFromJSON } from "$lib/services/ArtifactService";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { Genre } from "$lib/model/Genre";
import { db, execQuery } from "../database";
import type { IBacklogItemDB } from "./BacklogDB";

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
        return await new Promise((resolve, reject) => {
            db.all(query, params, async (error, rows: IArtifactDB[]) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve([]);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    static async getArtifactById(id: number): Promise<IArtifactDB | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM artifact WHERE id = ?`, [id], (error, row: IArtifactDB) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    static async getChildrenByParentId(parentId: number): Promise<IArtifactDB[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM artifact WHERE parent_artifact_id = ? ORDER BY child_index ASC`, [parentId], (error, rows: IArtifactDB[]) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // ========================================
    // Genre Methods
    // ========================================
    static async getGenreDefinitions(genreTableName: string): Promise<Genre[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM ${genreTableName} ORDER BY title`, async (error, rows: IGenreDB[]) => {
                if (error) {
                    reject(error);
                } else {
                    const genres: Genre[] = rows.map((row: IGenreDB) => {
                        return new Genre(row.id, row.title);
                    });
                    resolve(genres);
                }
            });
        });
    }

    static async addGenreDefinition(genreId: number, title: string, genreTableName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT OR IGNORE INTO ${genreTableName} (id, title) VALUES (?, ?)`, [genreId, title], function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    static async getAssignedGenres(artifactId: number, genreTableName: string, genreMapTableName: string): Promise<Genre[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT ${genreTableName}.id as id, title FROM ${genreMapTableName}
                    INNER JOIN ${genreTableName} ON ${genreMapTableName}.genreId = ${genreTableName}.id
                    WHERE artifactId = ?`, [artifactId], async (error, rows: IGenreDB[]) => {
                if (error) {
                    reject(error);
                } else {
                    const genres: Genre[] = rows.map((row: IGenreDB) => {
                        return new Genre(row.id, row.title);
                    });
                    resolve(genres);
                }
            });
        });
    }

    static async assignGenre(artifactId: number, genreId: number, genreMapTableName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT OR IGNORE INTO ${genreMapTableName} (artifactId, genreId) VALUES (?, ?)`, [artifactId, genreId], function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
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
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM ${genreMapTableName} WHERE artifactId = ? AND genreId = ?`, [artifactId, genreId], function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
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
        return await new Promise((resolve, reject) => {
            db.all(query, params, async (error, rows: IUserListItemDB[]) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    const userList = new UserList(userId, artifactType, []);
                    resolve(userList);
                } else {
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
                    const userList = new UserList(userId, artifactType, userListItems);
                    resolve(userList);
                }
            });
        });
    }

    static async getUserOngoingList(userId: number, artifactType: ArtifactType): Promise<UserList> {
        const query = `SELECT *
                       FROM artifact
                       INNER JOIN user_artifact ON artifact.id = user_artifact.artifactId
                       WHERE artifact.type = ? AND user_artifact.userId = ? AND user_artifact.status = 'ongoing'`;
        const params = [artifactType, userId];
        return await new Promise((resolve, reject) => {
            db.all(query, params, async (error, rows: IUserListItemDB[]) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    const userList = new UserList(userId, artifactType, []);
                    resolve(userList);
                } else {
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
                    const userList = new UserList(userId, artifactType, userListItems);
                    resolve(userList);
                }
            });
        });
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

        return await new Promise((resolve, reject) => {
            db.all(query, [artifactType, userId], async (error, rows: IArtifactDB[]) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve([]);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    static async getUserInfo(userId: number, artifactId: number): Promise<UserArtifact | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM user_artifact WHERE userId = ? AND artifactId = ?`, [userId, artifactId], async (error, row: IUserArtifactDB) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const userArtifact = new UserArtifact(
                        row.userId,
                        row.artifactId,
                        row.status,
                        row.score,
                        row.startDate ? new Date(row.startDate) : null,
                        row.endDate ? new Date(row.endDate) : null
                    );
                    resolve(userArtifact);
                }
            });
        });
    }

    static async getUserInfos(userId: number, artifactIds: number[]): Promise<UserArtifact[]> {
        return await new Promise((resolve, reject) => {
            const questionMarks = new Array(artifactIds.length).fill('?').join(',');
            db.all(`SELECT * FROM user_artifact WHERE userId = ? AND artifactId IN (${questionMarks})`, [userId, ...artifactIds], async (error, rows: IUserArtifactDB[]) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve([]);
                } else {
                    const userArtifacts = rows.map(
                        row => new UserArtifact(
                            row.userId,
                            row.artifactId,
                            row.status,
                            row.score,
                            row.startDate ? new Date(row.startDate) : null,
                            row.endDate ? new Date(row.endDate) : null
                        ));
                    resolve(userArtifacts);
                }
            });
        });
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

        return await new Promise((resolve, reject) => {
            db.all(`SELECT *, CAST(strftime('%s', dateAdded) AS INTEGER) AS dateAdded${rank}
                    FROM backlog_items
                    INNER JOIN artifact ON backlog_items.artifactId = artifact.id
                    WHERE backlogId = ?
                    ORDER BY ${sqlOrder}`, [backlogId], async (error, rows: IBacklogItemDB[]) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
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
        return await new Promise((resolve, reject) => {
            const query = `INSERT INTO artifact (title, description, type, releaseDate, duration) VALUES (?, ?, ?, ?, ?)`;
            const params = [title, description, artifactType, releaseDate.getTime().toString(), duration];

            db.run(query, params, function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve(this.lastID);
                }
            });
        });
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
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET title = ?, releaseDate = ?, duration = ? WHERE id = ?`, 
                [title, releaseDate.getTime().toString(), duration, id], function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    static async updateArtifactWithIndex(
        id: number,
        childIndex: number,
        title: string,
        releaseDate: Date = new Date(7258118400000),
        duration: number = 0
    ): Promise<void> {
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET child_index = ?, title = ?, releaseDate = ?, duration = ? WHERE id = ?`, 
                [childIndex, title, releaseDate.getTime().toString(), duration, id], function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    static async updateDuration(artifactId: number, duration: number = 0) {
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET duration = ? WHERE id = ?`, [duration, artifactId], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve(null);
                }
            });
        });
    }

    static async setUserScore(userId: number, artifactId: number, score: number): Promise<void> {
        const userInfo = await ArtifactDB.getUserInfo(userId, artifactId);
        return await new Promise((resolve, reject) => {
            if (userInfo) {
                db.run(`UPDATE user_artifact SET score = ? WHERE userId = ? AND artifactId = ?`, [score, userId, artifactId], async function (error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else {
                db.run(`INSERT INTO user_artifact (userId, artifactId, score) VALUES (?, ?, ?)`, [userId, artifactId, score], async function (error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            }
        });
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

        return await new Promise((resolve, reject) => {
            if (artifactIdsToCreate.length > 0) {
                const placeholders = artifactIdsToCreate.map(() => "(?, ?, ?)").join(", ");
                const values = artifactIdsToCreate.flatMap(artifactId => [userId, artifactId, status]);
                db.run(`INSERT INTO user_artifact (userId, artifactId, status) VALUES ${placeholders}`, values, async function (error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            }
            if (artifactIdsToUpdate.length > 0) {
                const questionMarks = new Array(artifactIdsToUpdate.length).fill('?').join(',');
                db.run(`UPDATE user_artifact SET status = ? WHERE userId = ? AND artifactId IN (${questionMarks})`, [status, userId, ...artifactIdsToUpdate], async function (error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            }
        });
    }

    static async setUserDate(userId: number, artifactId: number, date: string | null, startEnd: 'start' | 'end' | 'both'): Promise<void> {
        const userInfo = await ArtifactDB.getUserInfo(userId, artifactId);
        return await new Promise((resolve, reject) => {
            let query: string | null = null;
            let params: (string | null | number)[] = [];
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
                }

                if (query) {
                    db.run(query, params, async function (error) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    reject(new Error('no query'));
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
                }

                if (query) {
                    db.run(query, params, async function (error) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    reject(new Error('no query'));
                }
            }
        });
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
        await db.run(`DELETE FROM artifact WHERE id IN (${questionMarks})`, artifactIdsToDelete);
        await db.run(`DELETE FROM user_artifact WHERE artifactId IN (${questionMarks})`, [artifactIdsToDelete]);
        await db.run(`DELETE FROM ${genreMapTableName} WHERE artifactId = ?`, [id]);
        await db.run(`DELETE FROM rating WHERE artifactId = ?`, [id]);
        await db.run(`DELETE FROM link WHERE artifactId = ?`, [id]);
        await db.run(`DELETE FROM backlog_items WHERE artifactId = ?`, [id]);
        await db.run(`DELETE FROM backlog_item_tag WHERE artifactId = ?`, [id]);
    }

    static async deleteChildArtifact(artifactId: number): Promise<void> {
        await db.run(`DELETE FROM artifact WHERE id = ?`, [artifactId]);
        await db.run(`DELETE FROM user_artifact WHERE artifactId = ?`, [artifactId]);
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

        return await new Promise((resolve, reject) => {
            const questionMarks = new Array(parents.length).fill('?').join(',');
            const parentIds = parents.map(getParentId);
            const parentsMap = new Map<number, T>();
            
            parents.forEach(parent => {
                parentsMap.set(getParentId(parent), parent);
            });

            db.all(`SELECT * FROM artifact WHERE parent_artifact_id IN (${questionMarks}) ORDER BY child_index`, 
                parentIds, async (error, rows: IArtifactDB[]) => {
                if (error) {
                    reject(error);
                } else {
                    for (const row of rows) {
                        const child = createChildFunction(row);
                        if (row.parent_artifact_id) {
                            const parent = parentsMap.get(row.parent_artifact_id);
                            if (parent) {
                                addChildToParent(parent, child);
                            }
                        }
                    }
                    resolve();
                }
            });
        });
    }

    // ========================================
    // Table Creation Methods
    // ========================================
    static createArtifactTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS artifact (
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

    static createUserArtifactTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS user_artifact (
            userId INTEGER NOT NULL,
            artifactId INTEGER NOT NULL,
            score INTERGER,
            startDate TIMESTAMP,
            endDate TIMESTAMP,
            PRIMARY KEY (userId, artifactId)
        )`);
    }

    static createGenreTable(genreTableName: string): void {
        execQuery(`CREATE TABLE IF NOT EXISTS ${genreTableName} (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL
        )`);
    }

    static createGenreMapTable(genreMapTableName: string): void {
        execQuery(`CREATE TABLE IF NOT EXISTS ${genreMapTableName} (
            artifactId INTEGER NOT NULL,
            genreId INTEGER NOT NULL,
            PRIMARY KEY (artifactId, genreId),
            FOREIGN KEY (artifactId) REFERENCES artifact(id),
            FOREIGN KEY (genreId) REFERENCES ${genreMapTableName.split('_')[0]}_genre(id)
        )`);
    }
}
