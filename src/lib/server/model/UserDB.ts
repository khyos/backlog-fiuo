import { JWT_ACCESS_SECRET } from "$env/static/private";
import { User, UserRole } from "$lib/model/User";
import { db, execQuery } from "../database";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';

export class UserDB {
    static async getByUsername(username: string): Promise<User | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM user WHERE username = ?`, [username], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const user = new User(row.id, row.username, row.role);
                    resolve(user);
                }
            });
        });
    }

    static async signIn(username: string, password: string): Promise<string> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM user WHERE username = ?`, [username], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    reject(new Error("Invalid username"));
                } else {
                    const isValid = await bcrypt.compare(password, row.password);

                    if (!isValid) {
                        reject(new Error("Invalid password"));
                    }

                    resolve(jwt.sign({ id: row.username }, JWT_ACCESS_SECRET));
                }
            });
        });
    }

    static async signUp(username: string, password: string): Promise<void> {
        const existingUser = await UserDB.getByUsername(username);
        if (existingUser) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO user (username, password, role) VALUES (?, ?, ?)`, [username, hashedPassword, UserRole.USER], (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
        

    static createUserTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`);
    }
}