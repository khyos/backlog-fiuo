import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPrices } from './PricesService';
import { ArtifactType } from '$lib/model/Artifact';

describe('PricesService', () => {
    const mockFetch = vi.fn();
    const mockJson = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        mockFetch.mockReset();
        mockJson.mockReset();
    });

    describe('fetchPrices', () => {
        it('should fetch prices for games', async () => {
            const mockPrices = {
                'game1': { price: 10, currency: 'USD' },
                'game2': { price: 20, currency: 'USD' }
            };
            mockJson.mockResolvedValue(mockPrices);
            mockFetch.mockResolvedValue({ json: mockJson });

            const result = await fetchPrices(ArtifactType.GAME, [1, 2]);

            expect(mockFetch).toHaveBeenCalledWith('/api/game/prices', {
                method: 'POST',
                body: JSON.stringify({
                    artifactIds: [1, 2]
                })
            });
            expect(result).toEqual(mockPrices);
        });

        it('should throw error for non-game artifact types', async () => {
            await expect(fetchPrices(ArtifactType.MOVIE, [1, 2]))
                .rejects.toThrow('Prices not supported for other artifact types than games');
        });
    });
});