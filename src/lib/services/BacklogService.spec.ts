import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchBacklog, fetchBacklogs, addBacklogItem, deleteBacklogItem, moveBacklogItemToOtherBacklog } from './BacklogService';
import { ArtifactType } from '$lib/model/Artifact';

describe('BacklogService', () => {
    const mockFetch = vi.fn();
    const mockJson = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        mockFetch.mockReset();
        mockJson.mockReset();
    });

    describe('fetchBacklog', () => {
        it('should fetch a backlog by id', async () => {
            const mockBacklog = { id: 1, name: 'Test Backlog' };
            mockJson.mockResolvedValue(mockBacklog);
            mockFetch.mockResolvedValue({ json: mockJson });

            const result = await fetchBacklog(1);

            expect(mockFetch).toHaveBeenCalledWith('/api/backlog/1');
            expect(result).toEqual(mockBacklog);
        });
    });

    describe('fetchBacklogs', () => {
        it('should fetch backlogs by artifact type', async () => {
            const mockBacklogs = [{ id: 1, name: 'Backlog 1' }, { id: 2, name: 'Backlog 2' }];
            mockJson.mockResolvedValue(mockBacklogs);
            mockFetch.mockResolvedValue({ ok: true, json: mockJson });

            const result = await fetchBacklogs(ArtifactType.GAME);

            expect(mockFetch).toHaveBeenCalledWith('/api/backlog/list?artifactType=game');
            expect(result).toEqual(mockBacklogs);
        });

        it('should throw error when response is not ok', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(fetchBacklogs(ArtifactType.GAME)).rejects.toThrow('Error while Fetching Backlog List');
        });
    });

    describe('addBacklogItem', () => {
        it('should add a backlog item', async () => {
            const mockResponse = { success: true };
            mockJson.mockResolvedValue(mockResponse);
            mockFetch.mockResolvedValue({ ok: true, json: mockJson });

            const result = await addBacklogItem(1, 100);

            expect(mockFetch).toHaveBeenCalledWith('/api/backlog/1/add', {
                method: 'POST',
                body: JSON.stringify({
                    artifactId: 100
                })
            });
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when response is not ok', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(addBacklogItem(1, 100)).rejects.toThrow('Error while adding Backlog Item');
        });
    });

    describe('deleteBacklogItem', () => {
        it('should delete a backlog item', async () => {
            const mockResponse = { success: true };
            mockJson.mockResolvedValue(mockResponse);
            mockFetch.mockResolvedValue({ ok: true, json: mockJson });

            const result = await deleteBacklogItem(1, 100);

            expect(mockFetch).toHaveBeenCalledWith('/api/backlog/1/delete', {
                method: 'POST',
                body: JSON.stringify({
                    artifactId: 100
                })
            });
            expect(result).toEqual(mockResponse);
        });

        it('should throw error when response is not ok', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(deleteBacklogItem(1, 100)).rejects.toThrow('Error while deleting Backlog Item');
        });
    });

    describe('moveBacklogItemToOtherBacklog', () => {
        it('should move a backlog item to another backlog', async () => {
            mockFetch.mockResolvedValue({ ok: true });

            await moveBacklogItemToOtherBacklog(1, 2, 100, true);

            expect(mockFetch).toHaveBeenCalledWith('/api/backlog/move', {
                method: 'POST',
                body: JSON.stringify({
                    fromBacklogId: 1,
                    toBacklogId: 2,
                    artifactId: 100,
                    keepTags: true
                })
            });
        });

        it('should throw error when response is not ok', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(moveBacklogItemToOtherBacklog(1, 2, 100, true))
                .rejects.toThrow('Error while moving Backlog Item to other Backlog');
        });
    });
});