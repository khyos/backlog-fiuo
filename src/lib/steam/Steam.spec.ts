import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Steam } from './Steam';

describe('Steam', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        mockFetch.mockReset();
    });

    describe('getGameRating', () => {
        it('fetches review totals from the Steam Web API and returns the positive percentage', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    response: {
                        query_summary: {
                            total_positive: 810395,
                            total_reviews: 840586
                        }
                    }
                })
            });

            await expect(Steam.getGameRating('292030')).resolves.toBe(96);

            const [url, options] = mockFetch.mock.calls[0];
            const requestUrl = new URL(url);
            expect(requestUrl.origin).toBe('https://api.steampowered.com');
            expect(requestUrl.pathname).toBe('/IUserReviewsService/GetAppReviews/v1/');
            expect(JSON.parse(requestUrl.searchParams.get('input_json')!)).toEqual({
                appid: 292030,
                filter: 1,
                languages: ['all'],
                purchase_type: 0,
                num_per_page: 1,
                review_type: 0
            });
            expect(options).toEqual({ method: 'GET' });
        });

        it('returns null when the app has no reviews', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    response: {
                        query_summary: {
                            total_positive: 0,
                            total_reviews: 0
                        }
                    }
                })
            });

            await expect(Steam.getGameRating('123')).resolves.toBeNull();
        });

        it('throws when Steam returns an unsuccessful response', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests'
            });

            await expect(Steam.getGameRating('123'))
                .rejects.toThrow('Steam reviews API request failed: 429 Too Many Requests');
        });

        it('throws when the response does not contain review totals', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({ response: {} })
            });

            await expect(Steam.getGameRating('123'))
                .rejects.toThrow('Steam reviews API returned an invalid response');
        });
    });
});
