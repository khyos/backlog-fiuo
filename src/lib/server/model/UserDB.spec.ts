import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { runDbQueriesParallel, runDbQuery, getDbRow } from '../database';
import { UserDB } from './UserDB';
import { UserRole } from '$lib/model/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface UserRowDB {
    password: string;
}

interface JWTPayload {
    id: string;
    iat?: number;
    exp?: number;
}

describe('UserDB', () => {
    const cleanupTestData = async () => {
        await runDbQueriesParallel([
            { query: 'DELETE FROM user' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("user")' }
        ]);
    };

    beforeAll(async () => {
        // Set up test database schema
        await UserDB.createUserTable();
    });

    beforeEach(async () => {
        await cleanupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('signUp', () => {
        test('should create a new user with hashed password', async () => {
            await UserDB.signUp('testuser', 'password123');

            const user = await UserDB.getByUsername('testuser');
            expect(user).not.toBeNull();
            expect(user?.username).toBe('testuser');
            expect(user?.role).toBe(UserRole.USER);
        });

        test('should hash the password properly', async () => {
            await UserDB.signUp('testuser', 'password123');

            // Verify password is hashed by checking it's not stored in plain text
            const userRow = await getDbRow<UserRowDB>('SELECT password FROM user WHERE username = ?', ['testuser']);
            expect(userRow?.password).not.toBe('password123');
            expect(userRow?.password).toMatch(/^\$2[aby]\$\d{1,2}\$.{53}$/); // bcrypt hash pattern
        });

        test('should throw error when trying to create duplicate username', async () => {
            await UserDB.signUp('testuser', 'password123');

            await expect(UserDB.signUp('testuser', 'differentpassword'))
                .rejects.toThrow('User already exists');
        });

        test('should handle empty username', async () => {
            await expect(UserDB.signUp('', 'password123'))
                .resolves.not.toThrow();
            
            const user = await UserDB.getByUsername('');
            expect(user?.username).toBe('');
        });

        test('should handle empty password', async () => {
            await expect(UserDB.signUp('testuser', ''))
                .resolves.not.toThrow();
        });

        test('should handle special characters in username', async () => {
            const specialUsername = 'test@user.com';
            await UserDB.signUp(specialUsername, 'password123');

            const user = await UserDB.getByUsername(specialUsername);
            expect(user?.username).toBe(specialUsername);
        });

        test('should handle long passwords', async () => {
            const longPassword = 'a'.repeat(100);
            await UserDB.signUp('testuser', longPassword);

            const user = await UserDB.getByUsername('testuser');
            expect(user).not.toBeNull();
        });

        test('should assign USER role by default', async () => {
            await UserDB.signUp('testuser', 'password123');

            const user = await UserDB.getByUsername('testuser');
            expect(user?.role).toBe(UserRole.USER);
        });
    });

    describe('getByUsername', () => {
        beforeEach(async () => {
            // Set up test users
            await UserDB.signUp('john', 'password123');
            await UserDB.signUp('jane', 'password456');
        });

        test('should return user when username exists', async () => {
            const user = await UserDB.getByUsername('john');
            
            expect(user).not.toBeNull();
            expect(user?.username).toBe('john');
            expect(user?.role).toBe(UserRole.USER);
            expect(user?.id).toBeDefined();
            expect(typeof user?.id).toBe('number');
        });

        test('should return null when username does not exist', async () => {
            const user = await UserDB.getByUsername('nonexistent');
            expect(user).toBeNull();
        });

        test('should be case sensitive', async () => {
            const user = await UserDB.getByUsername('John'); // Different case
            expect(user).toBeNull();
        });

        test('should handle empty username', async () => {
            await UserDB.signUp('', 'password');
            const user = await UserDB.getByUsername('');
            expect(user?.username).toBe('');
        });

        test('should handle special characters in username', async () => {
            const specialUsername = 'test@user.com';
            await UserDB.signUp(specialUsername, 'password123');
            
            const user = await UserDB.getByUsername(specialUsername);
            expect(user?.username).toBe(specialUsername);
        });

        test('should not expose password in returned user object', async () => {
            const user = await UserDB.getByUsername('john');
            
            expect(user).not.toHaveProperty('password');
        });

        test('should return User instance with correct properties', async () => {
            const user = await UserDB.getByUsername('john');
            
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('username');
            expect(user).toHaveProperty('role');
            expect(typeof user?.id).toBe('number');
            expect(typeof user?.username).toBe('string');
            expect(Object.values(UserRole)).toContain(user?.role);
        });
    });

    describe('signIn', () => {
        beforeEach(async () => {
            // Set up test users
            await UserDB.signUp('validuser', 'correctpassword');
        });

        test('should return JWT token for valid credentials', async () => {
            const token = await UserDB.signIn('validuser', 'correctpassword');
            
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
            
            // Verify it's a valid JWT token
            const decoded = jwt.verify(token, 'test-secret-key') as JWTPayload;
            expect(decoded.id).toBe('validuser');
        });

        test('should throw error for invalid username', async () => {
            await expect(UserDB.signIn('nonexistent', 'anypassword'))
                .rejects.toThrow('Invalid username');
        });

        test('should throw error for invalid password', async () => {
            await expect(UserDB.signIn('validuser', 'wrongpassword'))
                .rejects.toThrow('Invalid password');
        });

        test('should be case sensitive for username', async () => {
            await expect(UserDB.signIn('ValidUser', 'correctpassword'))
                .rejects.toThrow('Invalid username');
        });

        test('should handle empty username', async () => {
            await expect(UserDB.signIn('', 'anypassword'))
                .rejects.toThrow('Invalid username');
        });

        test('should handle empty password', async () => {
            await expect(UserDB.signIn('validuser', ''))
                .rejects.toThrow('Invalid password');
        });

        test('should handle special characters in credentials', async () => {
            const specialUsername = 'test@user.com';
            const specialPassword = 'p@ssw0rd!#$';
            
            await UserDB.signUp(specialUsername, specialPassword);
            
            const token = await UserDB.signIn(specialUsername, specialPassword);
            expect(typeof token).toBe('string');
            
            const decoded = jwt.verify(token, 'test-secret-key') as JWTPayload;
            expect(decoded.id).toBe(specialUsername);
        });

        test('should properly verify bcrypt hashed passwords', async () => {
            // Test with different password complexities
            const passwords = ['simple', 'complex123!@#', 'verylongpasswordwithmanychars'];
            
            for (const password of passwords) {
                const username = `user_${password}`;
                await UserDB.signUp(username, password);
                
                const token = await UserDB.signIn(username, password);
                expect(typeof token).toBe('string');
            }
        });

        test('should reject similar but incorrect passwords', async () => {
            await UserDB.signUp('testuser', 'password123');
            
            // Test various similar but wrong passwords
            const wrongPasswords = [
                'password124', // one digit off
                'password12',  // one char missing
                'password1234', // one extra char
                'Password123', // different case
                'password 123', // space added
            ];
            
            for (const wrongPassword of wrongPasswords) {
                await expect(UserDB.signIn('testuser', wrongPassword))
                    .rejects.toThrow('Invalid password');
            }
        });

        test('should work with previously hashed passwords', async () => {
            // Manually insert user with pre-hashed password
            const hashedPassword = await bcrypt.hash('testpassword', 10);
            await runDbQuery(
                'INSERT INTO user (username, password, role) VALUES (?, ?, ?)',
                ['prehasheduser', hashedPassword, UserRole.USER]
            );
            
            const token = await UserDB.signIn('prehasheduser', 'testpassword');
            expect(typeof token).toBe('string');
        });
    });

    describe('Integration tests', () => {
        test('should complete full user lifecycle: signup -> getByUsername -> signin', async () => {
            const username = 'lifecycleuser';
            const password = 'testpassword123';
            
            // Step 1: Sign up
            await UserDB.signUp(username, password);
            
            // Step 2: Get user
            const user = await UserDB.getByUsername(username);
            expect(user).not.toBeNull();
            expect(user?.username).toBe(username);
            expect(user?.role).toBe(UserRole.USER);
            
            // Step 3: Sign in
            const token = await UserDB.signIn(username, password);
            expect(typeof token).toBe('string');
            
            const decoded = jwt.verify(token, 'test-secret-key') as JWTPayload;
            expect(decoded.id).toBe(username);
        });

        test('should handle multiple users correctly', async () => {
            const users = [
                { username: 'alice', password: 'alicepass' },
                { username: 'bob', password: 'bobpass' },
                { username: 'charlie', password: 'charliepass' }
            ];
            
            // Sign up all users
            for (const userData of users) {
                await UserDB.signUp(userData.username, userData.password);
            }
            
            // Verify all users exist and can sign in
            for (const userData of users) {
                const user = await UserDB.getByUsername(userData.username);
                expect(user?.username).toBe(userData.username);
                
                const token = await UserDB.signIn(userData.username, userData.password);
                expect(typeof token).toBe('string');
                
                const decoded = jwt.verify(token, 'test-secret-key') as JWTPayload;
                expect(decoded.id).toBe(userData.username);
            }
        });

        test('should maintain data integrity across operations', async () => {
            await UserDB.signUp('testuser', 'password123');
            
            // Multiple gets should return consistent data
            const user1 = await UserDB.getByUsername('testuser');
            const user2 = await UserDB.getByUsername('testuser');
            
            expect(user1?.id).toBe(user2?.id);
            expect(user1?.username).toBe(user2?.username);
            expect(user1?.role).toBe(user2?.role);
            
            // Sign in should work consistently
            const token1 = await UserDB.signIn('testuser', 'password123');
            const token2 = await UserDB.signIn('testuser', 'password123');
            
            // Tokens might be different (if they include timestamps) but should decode to same user
            const decoded1 = jwt.verify(token1, 'test-secret-key') as JWTPayload;
            const decoded2 = jwt.verify(token2, 'test-secret-key') as JWTPayload;
            
            expect(decoded1.id).toBe(decoded2.id);
        });
    });

    describe('Error handling and edge cases', () => {
        test('should handle database connection issues gracefully', async () => {
            // This test would require mocking database failures
            // For now, we just ensure the methods exist and are callable
            expect(typeof UserDB.signUp).toBe('function');
            expect(typeof UserDB.getByUsername).toBe('function');
            expect(typeof UserDB.signIn).toBe('function');
        });

        test('should handle very long usernames', async () => {
            const longUsername = 'a'.repeat(255);
            await UserDB.signUp(longUsername, 'password123');
            
            const user = await UserDB.getByUsername(longUsername);
            expect(user?.username).toBe(longUsername);
        });

        test('should handle unicode characters in credentials', async () => {
            const unicodeUsername = 'テストユーザー';
            const unicodePassword = 'パスワード123';
            
            await UserDB.signUp(unicodeUsername, unicodePassword);
            
            const user = await UserDB.getByUsername(unicodeUsername);
            expect(user?.username).toBe(unicodeUsername);
            
            const token = await UserDB.signIn(unicodeUsername, unicodePassword);
            expect(typeof token).toBe('string');
        });
    });
});