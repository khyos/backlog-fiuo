import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openLink } from './LinkService';
import { ArtifactType } from '$lib/model/Artifact';
import type { LinkType } from '$lib/model/Link';

describe('LinkService', () => {
    const mockFetch = vi.fn();
    const mockText = vi.fn();
    const mockWindow = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        mockFetch.mockReset();
        mockText.mockReset();
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
            mockText.mockResolvedValue(resolvedUrl);
            mockFetch.mockResolvedValue({ text: mockText });

            openLink(ArtifactType.GAME, 'store' as LinkType, linkUrl);

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/link/getUrl?artifactType=game&linkType=store&linkUrl=test-url',
                { method: 'GET' }
            );

            // Wait for the promise chain to complete
            await new Promise(process.nextTick);

            expect(mockWindow).toHaveBeenCalledWith(resolvedUrl, 'blank_');
        });
    });
});