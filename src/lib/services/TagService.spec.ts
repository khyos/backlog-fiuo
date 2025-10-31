import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTag, addTag, removeTag } from './TagService';
import { ArtifactType } from '$lib/model/Artifact';

describe('TagService', () => {
    const mockFetch = vi.fn();
    const mockJson = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        mockFetch.mockReset();
        mockJson.mockReset();
    });

    describe('createTag', () => {
        it('should create a new tag', async () => {
            mockFetch.mockResolvedValue({ ok: true });

            await createTag('test-tag', ArtifactType.GAME);

            expect(mockFetch).toHaveBeenCalledWith('/api/tag/create', {
                method: 'POST',
                body: JSON.stringify({
                    id: 'test-tag',
                    artifactType: ArtifactType.GAME
                })
            });
        });

        it('should throw error when response is not ok', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(createTag('test-tag', ArtifactType.GAME))
                .rejects.toThrow('Creation of Tag Failed');
        });
    });

    describe('addTag', () => {
        it('should add a tag to a backlog item', async () => {
            mockFetch.mockResolvedValue({ ok: true });

            await addTag(1, 100, 'test-tag');

            expect(mockFetch).toHaveBeenCalledWith('/api/backlog/1/tag', {
                method: 'POST',
                body: JSON.stringify({
                    artifactId: 100,
                    tagId: 'test-tag'
                })
            });
        });

        it('should throw error when response is not ok', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(addTag(1, 100, 'test-tag'))
                .rejects.toThrow('Adding Tag Failed');
        });
    });

    describe('removeTag', () => {
        it('should remove a tag from a backlog item', async () => {
            mockFetch.mockResolvedValue({ ok: true });

            await removeTag(1, 100, 'test-tag');

            expect(mockFetch).toHaveBeenCalledWith('/api/backlog/1/tag', {
                method: 'DELETE',
                body: JSON.stringify({
                    artifactId: 100,
                    tagId: 'test-tag'
                })
            });
        });

        it('should throw error when response is not ok', async () => {
            mockFetch.mockResolvedValue({ ok: false });

            await expect(removeTag(1, 100, 'test-tag'))
                .rejects.toThrow('Removing Tag Failed');
        });
    });
});