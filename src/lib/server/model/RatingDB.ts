import { Rating } from "$lib/model/Rating";
import { db, execQuery } from "../database";

export class RatingDB {
    static addRating(artifactId: number, type: string, rating: number | null) {
        db.run(`INSERT INTO rating (artifactId, type, rating) VALUES (?, ?, ?)`, [artifactId, type, rating]);
    }

    static updateRating(artifactId: number, type: string, rating: number | null) {
        db.run(`UPDATE rating SET rating = ? WHERE artifactId = ? AND type = ?`, [rating, artifactId, type]);
    }

    static async getRatings(artifactId: number): Promise<Rating[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM rating
                    WHERE artifactId = ?`, [artifactId], async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const ratings: Rating[] = [];
                    for (const row of rows) {
                        const rating = new Rating(row.type, row.rating);
                        ratings.push(rating);
                    }
                    resolve(ratings);
                }
            });
        });
    }

    static createRatingTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS rating (
            artifactId INTEGER NOT NULL,
            type TEXT NOT NULL,
            rating INTEGER,
            PRIMARY KEY (artifactId, type)
        )`);
    }
}