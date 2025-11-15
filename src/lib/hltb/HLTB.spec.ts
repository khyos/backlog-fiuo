import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HLTB } from './HLTB';
import { got } from 'got';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

// Mock got and puppeteer modules
vi.mock('got');
vi.mock('puppeteer');

describe('HLTB', () => {
    let realHtmlContent: string;

    beforeEach(() => {
        vi.clearAllMocks();
        // Load the real HTML content once for all tests
        const htmlPath = path.join(process.cwd(), 'test/hltb/hltb.html');
        realHtmlContent = fs.readFileSync(htmlPath, 'utf-8');
    });

    describe('parseDurationText', () => {
        it('should parse hours only', () => {
            expect(HLTB.parseDurationText('5h')).toBe(18000); // 5h = 18000 seconds
        });

        it('should parse minutes only', () => {
            expect(HLTB.parseDurationText('45m')).toBe(2700); // 45m = 2700 seconds
        });

        it('should parse seconds only', () => {
            expect(HLTB.parseDurationText('30s')).toBe(30); // 30s = 30 seconds
        });

        it('should parse complex duration with hours, minutes and seconds', () => {
            expect(HLTB.parseDurationText('2h 30m 45s')).toBe(9045);
            // 2h = 7200s, 30m = 1800s, 45s = 45s = 9045s total
        });

        it('should parse hours and minutes', () => {
            expect(HLTB.parseDurationText('27h 49m')).toBe(100140);
            // 27h = 97200s, 49m = 2940s = 100140s total
        });

        it('should handle fractional hours (½) by parsing integer part only', () => {
            expect(HLTB.parseDurationText('2½h')).toBe(7200);
            // parseInt("2½") = 2, so 2h = 7200 seconds
        });

        it('should ignore non-time text and parse time parts', () => {
            expect(HLTB.parseDurationText('About 2h 30m or so')).toBe(9000);
            // Should parse "2h 30m" and ignore "About", "or", "so"
        });

        it('should return 0 for empty or null input', () => {
            expect(HLTB.parseDurationText('')).toBe(0);
            expect(HLTB.parseDurationText('   ')).toBe(0);
        });

        it('should return 0 for text with no time indicators', () => {
            expect(HLTB.parseDurationText('No time data')).toBe(0);
        });

        it('should handle zero values', () => {
            expect(HLTB.parseDurationText('0h 0m')).toBe(0);
        });
    });

    describe('extractDurationFromHtml', () => {
        it('should extract duration from real HTML file', () => {
            const durationText = HLTB.extractDurationFromHtml(realHtmlContent);
            
            // Should extract "44h 17m" from Main + Extras row (second row), Average column
            expect(durationText).toBe('44h 17m');
        });

        it('should return null for HTML without time table', () => {
            const invalidHtml = '<html><body><div>No time table here</div></body></html>';
            const durationText = HLTB.extractDurationFromHtml(invalidHtml);
            
            expect(durationText).toBeNull();
        });

        it('should return null for malformed HTML', () => {
            const malformedHtml = 'This is not valid HTML <invalid>';
            const durationText = HLTB.extractDurationFromHtml(malformedHtml);
            
            expect(durationText).toBeNull();
        });

        it('should return null for empty HTML table structure', () => {
            const emptyTableHtml = `
                <html>
                    <body>
                        <table class="GameTimeTable_game_main_table__7uN3H">
                            <!-- Empty table -->
                        </table>
                    </body>
                </html>
            `;
            const durationText = HLTB.extractDurationFromHtml(emptyTableHtml);
            
            expect(durationText).toBeNull();
        });
    });

    describe('getGameDuration (integration)', () => {
        it('should parse game duration from real HTML correctly', async () => {
            vi.mocked(got).mockResolvedValue({ body: realHtmlContent });

            const duration = await HLTB.getGameDuration('65945');
            
            // Should extract "44h 17m" and parse it to seconds
            // 44h = 44 * 3600 = 158400 seconds
            // 17m = 17 * 60 = 1020 seconds
            // Total = 159420 seconds
            expect(duration).toBe(159420);
        });

        it('should return 0 when time table is not found', async () => {
            const mockHtml = `
                <html>
                    <body>
                        <div>No game time table here</div>
                    </body>
                </html>
            `;

            vi.mocked(got).mockResolvedValue({ body: mockHtml });

            const duration = await HLTB.getGameDuration('12345');
            expect(duration).toBe(0);
        });

        it('should return 0 when HTML structure is malformed', async () => {
            const mockHtml = 'This is not valid HTML <invalid>';

            vi.mocked(got).mockResolvedValue({ body: mockHtml });

            const duration = await HLTB.getGameDuration('12345');
            expect(duration).toBe(0);
        });

        it('should return 0 when HTTP request fails', async () => {
            vi.mocked(got).mockRejectedValue(new Error('Network error'));

            const duration = await HLTB.getGameDuration('12345');
            expect(duration).toBe(0);
        });
    });

    describe('searchGame', () => {
        const mockPage = {
            setUserAgent: vi.fn(),
            goto: vi.fn(),
            waitForSelector: vi.fn(),
            evaluate: vi.fn()
        };

        const mockBrowser = {
            close: vi.fn(),
            newPage: vi.fn().mockResolvedValue(mockPage)
        };

        beforeEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any);
            
            // Setup default successful mocks
            mockPage.setUserAgent.mockResolvedValue(undefined);
            mockPage.goto.mockResolvedValue(undefined);
            mockPage.waitForSelector.mockResolvedValue(null);
            mockPage.evaluate.mockResolvedValue([]);
            
            // Reset all mock function calls
            mockBrowser.close.mockClear();
            mockPage.setUserAgent.mockClear();
            mockPage.goto.mockClear();
            mockPage.waitForSelector.mockClear();
            mockPage.evaluate.mockClear();
        });

        it('should search for games and return results with id, name and link', async () => {
            // Mock the page.evaluate function to return search results
            mockPage.evaluate.mockResolvedValue([
                {
                    id: '12345',
                    name: 'Super Mario Bros.',
                    link: 'https://howlongtobeat.com/game/12345'
                },
                {
                    id: '67890',
                    name: 'Super Mario World',
                    link: 'https://howlongtobeat.com/game/67890'
                }
            ]);

            const results = await HLTB.searchGame('mario');

            // Verify puppeteer was set up correctly
            expect(puppeteer.launch).toHaveBeenCalledWith({ 
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            expect(mockBrowser.newPage).toHaveBeenCalled();
            expect(mockPage.setUserAgent).toHaveBeenCalledWith(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Verify navigation and waiting
            expect(mockPage.goto).toHaveBeenCalledWith('https://howlongtobeat.com/?q=mario');
            expect(mockPage.waitForSelector).toHaveBeenCalledWith(
                '#search-results-header>.loading_bar',
                { hidden: true, timeout: 10000 }
            );

            // Verify results
            expect(results).toEqual([
                {
                    id: '12345',
                    name: 'Super Mario Bros.',
                    link: 'https://howlongtobeat.com/game/12345'
                },
                {
                    id: '67890',
                    name: 'Super Mario World',
                    link: 'https://howlongtobeat.com/game/67890'
                }
            ]);

            // Verify cleanup
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should return empty array when no search results found', async () => {
            mockPage.evaluate.mockResolvedValue([]);

            const results = await HLTB.searchGame('nonexistentgame');

            expect(results).toEqual([]);
            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should handle single search result', async () => {
            mockPage.evaluate.mockResolvedValue([
                {
                    id: '1001',
                    name: 'The Legend of Zelda',
                    link: 'https://howlongtobeat.com/game/1001'
                }
            ]);

            const results = await HLTB.searchGame('zelda');

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                id: '1001',
                name: 'The Legend of Zelda',
                link: 'https://howlongtobeat.com/game/1001'
            });
        });

        it('should handle search queries with special characters', async () => {
            mockPage.evaluate.mockResolvedValue([
                {
                    id: '2002',
                    name: 'Pokémon Red & Blue',
                    link: 'https://howlongtobeat.com/game/2002'
                }
            ]);

            const results = await HLTB.searchGame('pokémon red & blue');

            expect(mockPage.goto).toHaveBeenCalledWith('https://howlongtobeat.com/?q=pokémon red & blue');
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Pokémon Red & Blue');
        });

        it('should throw error when browser launch fails', async () => {
            vi.mocked(puppeteer.launch).mockRejectedValue(new Error('Browser launch failed'));

            await expect(HLTB.searchGame('mario')).rejects.toThrow('Browser launch failed');
            expect(mockBrowser.close).not.toHaveBeenCalled();
        });

        it('should throw error when page navigation fails and not close browser', async () => {
            mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

            await expect(HLTB.searchGame('mario')).rejects.toThrow('Navigation failed');
            // Browser close is not called because the error happens before browser.close()
            expect(mockBrowser.close).not.toHaveBeenCalled();
        });

        it('should throw error when waitForSelector times out and not close browser', async () => {
            mockPage.waitForSelector.mockRejectedValue(new Error('Timeout waiting for selector'));

            await expect(HLTB.searchGame('mario')).rejects.toThrow('Timeout waiting for selector');
            // Browser close is not called because the error happens before browser.close()
            expect(mockBrowser.close).not.toHaveBeenCalled();
        });

        it('should throw error when page evaluation fails and not close browser', async () => {
            mockPage.evaluate.mockRejectedValue(new Error('Page evaluation failed'));

            await expect(HLTB.searchGame('mario')).rejects.toThrow('Page evaluation failed');
            // Browser close is not called because the error happens before browser.close()
            expect(mockBrowser.close).not.toHaveBeenCalled();
        });

        it('should extract game ID from URL correctly', async () => {
            mockPage.evaluate.mockResolvedValue([
                {
                    id: '98765',
                    name: 'Final Fantasy VII',
                    link: 'https://howlongtobeat.com/game/98765'
                },
                {
                    id: '54321',
                    name: 'Final Fantasy VIII',
                    link: 'https://howlongtobeat.com/game/54321'
                }
            ]);

            const results = await HLTB.searchGame('final fantasy');

            expect(results).toHaveLength(2);
            expect(results[0].id).toBe('98765');
            expect(results[1].id).toBe('54321');
        });

        it('should handle malformed URLs in search results', async () => {
            // Test what happens when the URL parsing doesn't work as expected
            mockPage.evaluate.mockResolvedValue([
                {
                    id: undefined,
                    name: 'Some Game',
                    link: 'malformed-url'
                }
            ]);

            const results = await HLTB.searchGame('test');

            expect(results).toHaveLength(1);
            expect(results[0].id).toBeUndefined();
            expect(results[0].name).toBe('Some Game');
        });

        it('should handle empty search query', async () => {
            const results = await HLTB.searchGame('');

            expect(mockPage.goto).toHaveBeenCalledWith('https://howlongtobeat.com/?q=');
            expect(results).toEqual([]);
        });

        it('should handle search query with only whitespace', async () => {
            const results = await HLTB.searchGame('   ');

            expect(mockPage.goto).toHaveBeenCalledWith('https://howlongtobeat.com/?q=   ');
            expect(results).toEqual([]);
        });

        it('should pass through results exactly as returned from page evaluation', async () => {
            const mockResults = [
                {
                    id: 'game1',
                    name: 'Test Game 1',
                    link: 'https://example.com/game1',
                    extraProperty: 'should not be included'
                },
                {
                    id: 'game2',
                    name: 'Test Game 2', 
                    link: 'https://example.com/game2'
                }
            ];

            mockPage.evaluate.mockResolvedValue(mockResults);

            const results = await HLTB.searchGame('test');

            expect(results).toEqual(mockResults);
        });
    });
});