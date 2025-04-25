import type { IArtifactDB, ArtifactType } from "$lib/model/Artifact";
import { SERIALIZE_TYPE, UserArtifact, UserArtifactStatus, type IUserArtifactDB } from "$lib/model/UserArtifact";
import { UserList } from "$lib/model/UserList";
import { type IUserListItemDB } from "$lib/model/UserListItem";
import { artifactFromJSON } from "$lib/services/ArtifactService";
import { db, execQuery } from "../database";

export class ArtifactDB {
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
}
