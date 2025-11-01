import sqlite3 from 'sqlite3';

type queryParam = string | number | null;

// Determine the database path based on environment
export async function getDbPath(): Promise<string> {
    // Check if we're in a test environment
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
        return './test-artifacts.db';
    }
    const { DB_PATH } = await import('$env/static/private');
    return DB_PATH;
}

export const db = await connectDatabase();

export async function connectDatabase() {
    const dbPath = await getDbPath();
    // For test environment, create database if it doesn't exist
    const mode = (process.env.VITEST || process.env.NODE_ENV === 'test') 
        ? sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE 
        : sqlite3.OPEN_READWRITE;
        
    const db = new sqlite3.Database(dbPath, mode, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log(`Connected to the database at ${dbPath}`)
        }
    });
    return db;
}

export async function createDatabase() {
    const dbPath = await getDbPath();
    console.log(`Creating database at ./${dbPath}`);
    const db = new sqlite3.Database(`./${dbPath}`, (err) => {
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

// Helper function for single insert that returns the lastID
export const runDbInsert = (query: string, params?: (queryParam)[]): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
        db.run(query, params || [], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
};

// Promisified database operations
export const runDbQuery = (query: string, params?: (queryParam)[]): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        db.run(query, params || [], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

export const runDbQueries = async (operations: Array<{ query: string; params?: (queryParam)[] }>): Promise<void> => {
    for (const op of operations) {
        await runDbQuery(op.query, op.params);
    }
};

export const runDbQueriesParallel = async (operations: Array<{ query: string; params?: (queryParam)[] }>): Promise<void> => {
    await Promise.all(operations.map(op => runDbQuery(op.query, op.params)));
}

export const getDbRow = <T>(query: string, params?: (queryParam)[]): Promise<T | null> => {
    return new Promise<T | null>((resolve, reject) => {
        db.get(query, params || [], (err, row) => {
            if (err) reject(err);
            else resolve((row as T) || null);
        });
    });
};

export const getDbRows = <T>(query: string, params?: (queryParam)[]): Promise<T[]> => {
    return new Promise<T[]>((resolve, reject) => {
        db.all(query, params || [], (err, rows) => {
            if (err) reject(err);
            else resolve((rows as T[]) || []);
        });
    });
};