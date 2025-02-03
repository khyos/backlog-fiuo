import { got } from 'got';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer';

export class HLTB {
    static async getGameDuration(gameId: string): Promise<number> {
        const response = await got(`https://howlongtobeat.com/game?id=${gameId}`);
        const dom = new JSDOM(response.body);
        try {
            const timeTable = dom.window.document.querySelector('[class^=GameTimeTable_game_main_table]');
            const durationText = timeTable?.children[1].children[1].children[2].textContent;
            if (!durationText) {
                return 0;
            }
            let duration = 0;
            const durationSplit = durationText.split(/\s+/);
            durationSplit.forEach(part => {
                if (part.endsWith('h')) {
                    duration += parseInt(part.replace('h', '')) * 3600;
                } else if (part.endsWith('m')) {
                    duration += parseInt(part.replace('m', '')) * 60;
                } else if (part.endsWith('s')) {
                    duration += parseInt(part.replace('s', ''));
                }
            });
            return duration;
        } catch (e) {
            console.error(e);
            return 0;
        }
    }

    static async searchGame(query: string) {
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(`https://howlongtobeat.com/?q=${query}`);

        await page.waitForSelector('#search-results-header>.loading_bar', { hidden: true, timeout: 10000 });

        const results = await page.evaluate(() => {
            const results = [];
            const links = document.querySelectorAll('#search-results-header>ul>li h2>a');
            for (const link of links) {
                if (link instanceof HTMLAnchorElement) {
                    results.push({
                        id: link.href.split('/').pop(),
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
