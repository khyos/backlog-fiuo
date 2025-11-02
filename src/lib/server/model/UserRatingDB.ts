import { getDbRow, runDbQuery } from "../database";

export interface IUserRatingDB {
    artifactId: number;
    username: string;
    rating: number | null;
}

export class UserRatingDB {
    static async addRating(artifactId: number, username: string, rating: number | null): Promise<void> {
        await runDbQuery(`INSERT INTO user_rating (artifactId, username, rating) VALUES (?, ?, ?)`, [artifactId, username, rating]);
    }

    static async updateRating(artifactId: number, username: string, rating: number | null): Promise<void> {
        const row = await getDbRow<IUserRatingDB>(`SELECT * FROM user_rating WHERE artifactId = ? AND username = ?`, [artifactId, username]);
        if (!row) {
            await UserRatingDB.addRating(artifactId, username, rating);
        } else {
            await runDbQuery(`UPDATE user_rating SET rating = ? WHERE artifactId = ? AND username = ?`, [rating, artifactId, username]);
        }
    }

    static async createUserRatingTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS user_rating (
            artifactId INTEGER NOT NULL,
            username TEXT NOT NULL,
            rating INTEGER,
            PRIMARY KEY (artifactId, username)
        )`);
    }
}