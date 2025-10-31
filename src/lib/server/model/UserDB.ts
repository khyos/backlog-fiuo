import { JWT_ACCESS_SECRET } from "$env/static/private";
import { User, UserRole } from "$lib/model/User";
import { getDbRow, runDbQuery } from "../database";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';

export interface UserInDB {
    id: number;
    username: string;
    password: string;
    role: UserRole;
}

export class UserDB {
    static async getByUsername(username: string): Promise<User | null> {
        const row = await getDbRow<UserInDB>(`SELECT * FROM user WHERE username = ?`, [username]);
        if (!row) {
            return null;
        }
        return new User(row.id, row.username, row.role);
    }

    static async signIn(username: string, password: string): Promise<string> {
        const row = await getDbRow<UserInDB>(`SELECT * FROM user WHERE username = ?`, [username]);
        if (!row) {
            throw new Error("Invalid username");
        }

        const isValid = await bcrypt.compare(password, row.password);
        if (!isValid) {
            throw new Error("Invalid password");
        }

        return jwt.sign({ id: row.username }, JWT_ACCESS_SECRET);
    }

    static async signUp(username: string, password: string): Promise<void> {
        const existingUser = await UserDB.getByUsername(username);
        if (existingUser) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await runDbQuery(`INSERT INTO user (username, password, role) VALUES (?, ?, ?)`, [username, hashedPassword, UserRole.USER]);
    }
        

    static async createUserTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`);
    }
}