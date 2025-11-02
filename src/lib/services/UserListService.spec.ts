import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserList, addUserListItem } from './UserListService';
import { ArtifactType } from '$lib/model/Artifact';
import { UserList } from '$lib/model/UserList';
import type { UserArtifactStatus } from '$lib/model/UserArtifact';

describe('UserListService', () => {
    const mockFetch = vi.fn();
    const mockJson = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        mockFetch.mockReset();
        mockJson.mockReset();
        vi.spyOn(UserList, 'fromJSON');
    });

    describe('fetchUserList', () => {
        it('should fetch user list and convert from JSON', async () => {
            const mockUserListData = {
                userId: 1,
                artifactType: ArtifactType.GAME,
                items: []
            };
            const mockUserList = new UserList(1, ArtifactType.GAME, []);
            
            mockJson.mockResolvedValue(mockUserListData);
            mockFetch.mockResolvedValue({ json: mockJson });
            vi.spyOn(UserList, 'fromJSON').mockReturnValue(mockUserList);

            const result = await fetchUserList(1, ArtifactType.GAME);

            expect(mockFetch).toHaveBeenCalledWith('/api/userList/1/game');
            expect(UserList.fromJSON).toHaveBeenCalledWith(mockUserListData);
            expect(result).toBe(mockUserList);
        });
    });

    describe('addUserListItem', () => {
        it('should add an item to user list', async () => {
            const mockResponse = { success: true };
            mockJson.mockResolvedValue(mockResponse);
            mockFetch.mockResolvedValue({ ok: true, json: mockJson });

            const result = await addUserListItem(1, 100, 'completed' as UserArtifactStatus);

            expect(mockFetch).toHaveBeenCalledWith('/api/userList/1/add', {
                method: 'POST',
                body: JSON.stringify({
                    artifactId: 100,
                    status: 'completed'
                })
            });
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when response is not ok', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(addUserListItem(1, 100, 'completed' as UserArtifactStatus))
                .rejects.toThrow('Error while adding Item to List');
        });
    });
});