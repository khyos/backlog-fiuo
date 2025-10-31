import type { IRatingDB } from "$lib/model/Rating";
import { db, execQuery } from "../database";

export class UserRatingDB {
    static addRating(artifactId: number, username: string, rating: number | null) {
        db.run(`INSERT INTO user_rating (artifactId, username, rating) VALUES (?, ?, ?)`, [artifactId, username, rating]);
    }

    static async updateRating(artifactId: number, username: string, rating: number | null): Promise<null> {
        return await new Promise((resolve) => {
            db.get(`SELECT * FROM rating WHERE artifactId = ? AND username = ?`, [artifactId, username], async (error, row: IRatingDB) => {
                if (error || !row) {
                    UserRatingDB.addRating(artifactId, username, rating);
                } else {
                    db.run(`UPDATE rating SET rating = ? WHERE artifactId = ? AND username = ?`, [rating, artifactId, username]);
                }
                resolve(null);
            });
        });
    }

    static createUserRatingTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS user_rating (
            artifactId INTEGER NOT NULL,
            username TEXT NOT NULL,
            rating INTEGER,
            PRIMARY KEY (artifactId, username)
        )`);
    }
}