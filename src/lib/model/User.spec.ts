import { describe, expect, test } from 'vitest';
import { User, UserRole, UserRights, getUserRights } from './User';

describe('User', () => {
    test('should create a user with correct initial values', () => {
        const user = new User(1, 'testuser', UserRole.USER);
        
        expect(user.id).toBe(1);
        expect(user.username).toBe('testuser');
        expect(user.role).toBe(UserRole.USER);
    });

    test('should serialize to JSON', () => {
        const user = new User(1, 'testuser', UserRole.USER);
        const json = user.toJSON();

        expect(json).toEqual({
            id: 1,
            username: 'testuser',
            role: UserRole.USER
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            id: 1,
            username: 'testuser',
            role: UserRole.USER
        };

        const user = User.deserialize(json);

        expect(user).toBeInstanceOf(User);
        expect(user.id).toBe(1);
        expect(user.username).toBe('testuser');
        expect(user.role).toBe(UserRole.USER);
    });

    test('should create guest user when deserializing null', () => {
        const user = User.deserialize(null);

        expect(user).toBeInstanceOf(User);
        expect(user.id).toBe(-1);
        expect(user.username).toBe('');
        expect(user.role).toBe(UserRole.GUEST);
    });

    describe('user rights', () => {
        test('admin should have all rights', () => {
            const admin = new User(1, 'admin', UserRole.ADMIN);
            const rights = getUserRights(UserRole.ADMIN);

            expect(rights).toContain(UserRights.CREATE_ARTIFACT);
            expect(rights).toContain(UserRights.DELETE_ARTIFACT);
            expect(rights).toContain(UserRights.EDIT_ARTIFACT);
            expect(rights).toContain(UserRights.CREATE_BACKLOG);
            expect(rights).toContain(UserRights.EDIT_BACKLOG);
            expect(rights).toContain(UserRights.DELETE_BACKLOG);
            expect(rights).toContain(UserRights.EDIT_ALL_BACKLOGS);
            expect(rights).toContain(UserRights.DELETE_ALL_BACKLOGS);
            expect(rights).toContain(UserRights.BOOTSTRAP);

            expect(admin.hasRight(UserRights.CREATE_ARTIFACT)).toBe(true);
            expect(admin.hasRight(UserRights.BOOTSTRAP)).toBe(true);
        });

        test('contributor should have limited rights', () => {
            const contributor = new User(1, 'contributor', UserRole.CONTRIBUTOR);
            const rights = getUserRights(UserRole.CONTRIBUTOR);

            expect(rights).toContain(UserRights.CREATE_ARTIFACT);
            expect(rights).toContain(UserRights.EDIT_ARTIFACT);
            expect(rights).toContain(UserRights.CREATE_BACKLOG);
            expect(rights).toContain(UserRights.EDIT_BACKLOG);
            expect(rights).toContain(UserRights.DELETE_BACKLOG);
            expect(rights).not.toContain(UserRights.DELETE_ARTIFACT);
            expect(rights).not.toContain(UserRights.EDIT_ALL_BACKLOGS);
            expect(rights).not.toContain(UserRights.DELETE_ALL_BACKLOGS);
            expect(rights).not.toContain(UserRights.BOOTSTRAP);

            expect(contributor.hasRight(UserRights.CREATE_ARTIFACT)).toBe(true);
            expect(contributor.hasRight(UserRights.DELETE_ARTIFACT)).toBe(false);
        });

        test('regular user should have basic rights', () => {
            const regularUser = new User(1, 'user', UserRole.USER);
            const rights = getUserRights(UserRole.USER);

            expect(rights).toContain(UserRights.CREATE_BACKLOG);
            expect(rights).toContain(UserRights.EDIT_BACKLOG);
            expect(rights).toContain(UserRights.DELETE_BACKLOG);
            expect(rights).not.toContain(UserRights.CREATE_ARTIFACT);
            expect(rights).not.toContain(UserRights.EDIT_ARTIFACT);
            expect(rights).not.toContain(UserRights.DELETE_ARTIFACT);

            expect(regularUser.hasRight(UserRights.CREATE_BACKLOG)).toBe(true);
            expect(regularUser.hasRight(UserRights.CREATE_ARTIFACT)).toBe(false);
        });

        test('guest should have no rights', () => {
            const guest = new User(1, 'guest', UserRole.GUEST);
            const rights = getUserRights(UserRole.GUEST);

            expect(rights).toEqual([]);
            expect(guest.hasRight(UserRights.CREATE_BACKLOG)).toBe(false);
        });

        test('invalid role should have no rights', () => {
            const rights = getUserRights('invalid' as UserRole);
            expect(rights).toEqual([]);
        });
    });
});