import { Rating, type IRatingDB } from "$lib/model/Rating";
import { getDbRow, getDbRows, runDbQuery } from "../database";

export class RatingDB {
    static async addRating(artifactId: number, type: string, rating: number | null): Promise<void> {
        return await runDbQuery(`INSERT INTO rating (artifactId, type, rating) VALUES (?, ?, ?)`, [artifactId, type, rating]);
    }

    static async updateRating(artifactId: number, type: string, rating: number | null): Promise<void> {
        const row = await getDbRow<IRatingDB>(`SELECT * FROM rating WHERE artifactId = ? AND type = ?`, [artifactId, type]);
        if (!row) {
            await RatingDB.addRating(artifactId, type, rating);
        } else {
            await runDbQuery(`UPDATE rating SET rating = ? WHERE artifactId = ? AND type = ?`, [rating, artifactId, type]);
        }
    }

    static async getRatings(artifactId: number): Promise<Rating[]> {
        const rows = await getDbRows<IRatingDB>(`SELECT * FROM rating WHERE artifactId = ?`, [artifactId]);
        return rows.map(row => new Rating(row.type, row.rating));
    }

    static async createRatingTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS rating (
            artifactId INTEGER NOT NULL,
            type TEXT NOT NULL,
            rating INTEGER,
            PRIMARY KEY (artifactId, type)
        )`);
    }
}