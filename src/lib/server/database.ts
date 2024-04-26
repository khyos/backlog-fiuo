import { DB_PATH } from '$env/static/private';
import sqlite3 from 'sqlite3';

export const db = connectDatabase();

export function connectDatabase() {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Connected to the database.')
        }
    });
    return db;
}

export function createDatabase() {
    console.log(`Creating database at ./${DB_PATH}`);
    const db = new sqlite3.Database(`./${DB_PATH}`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Connected to the database.')
        }
    });
    return db;
}

export function execQuery(query: string) {
    try {
        const stmt = db.prepare(query);
        if (stmt) {
            stmt.run();
            stmt.finalize();
        }
    } catch (error) {
        console.error(error);
    }
}