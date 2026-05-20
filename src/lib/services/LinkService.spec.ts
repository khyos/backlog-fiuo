import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openLink } from './LinkService';
import { ArtifactType } from '$lib/model/Artifact';
import type { LinkType } from '$lib/model/Link';

describe('LinkService', () => {
    const mockFetch = vi.fn();
    const mockJson = vi.fn();
    const mockWindow = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        mockFetch.mockReset();
        mockJson.mockReset();
        Object.defineProperty(global, 'window', {
            value: {
                open: mockWindow
            },
            writable: true
        });
        mockWindow.mockReset();
    });

    describe('openLink', () => {
        it('should fetch and open the link', async () => {
            const linkUrl = 'test-url';
            const resolvedUrl = 'https://resolved-url.com';
            mockJson.mockResolvedValue({ url: resolvedUrl });
            mockFetch.mockResolvedValue({ json: mockJson });

            await openLink(ArtifactType.GAME, 'store' as LinkType, linkUrl);

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/link/getUrl?artifactType=game&linkType=store&linkUrl=test-url',
                { method: 'GET' }
            );
            expect(mockWindow).toHaveBeenCalledWith(resolvedUrl, '_blank');
        });

        it('should propagate error when fetch fails', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(openLink(ArtifactType.GAME, 'store' as LinkType, 'test-url'))
                .rejects.toThrow('Network error');

            expect(mockWindow).not.toHaveBeenCalled();
        });
    });
});