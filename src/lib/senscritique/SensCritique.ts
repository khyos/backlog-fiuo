import { got } from 'got';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer';

export class SensCritique {
    static async getGameRating(gameId: string): Promise<number | null> {
        return SensCritique.getRating(`https://www.senscritique.com/jeuvideo/${gameId}`);
    }

    static async getMovieRating(movieId: string): Promise<number | null> {
        return SensCritique.getRating(`https://www.senscritique.com/film/${movieId}`);
    }

    static async getRating(url: string): Promise<number | null> {
        const response = await got(url);
        const dom = new JSDOM(response.body);
        try {
            const ratingDiv = dom.window.document.querySelector('[data-testid=Rating]');
            const ratingText = ratingDiv?.textContent
            if (!ratingText) {
                return null;
            }
            const rating = Math.round(parseFloat(ratingText) * 10);
            return rating;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    static async searchGame(query: string) {
        return await SensCritique.searchArtifact(query, 'game');
    }

    static async searchMovie(query: string) {
        return await SensCritique.searchArtifact(query, 'movie');
    }

    static async searchArtifact(query: string, universe: string) {
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(`https://www.senscritique.com/search?query=${query}&universe=${universe}`);

        await page.waitForSelector('a[href*="wiki"]', { timeout: 10000 });

        await page.waitForSelector('[data-testid=product-explorer-card]', { timeout: 3000 })

        const results = await page.evaluate(() => {
            const results = [];
            const links = document.querySelectorAll('[data-testid=product-explorer-card]>div:nth-child(2)>h3>a');
            for (const link of links) {
                if (link instanceof HTMLAnchorElement) {
                    results.push({
                        id: link.href.split('/').slice(-2).join('/'),
                        name: link.innerText,
                        link: link.href
                    });
                }
            }
            return results;
        });

        await browser.close();

        return results;
    }
}
