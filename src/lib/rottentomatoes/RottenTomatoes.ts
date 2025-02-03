import { got } from 'got';
import { JSDOM } from 'jsdom';

export class RottenTomatoes {
    static async getMovieRatings(movieId: string): Promise<any> {
        const response = await got(`https://www.rottentomatoes.com/m/${movieId}`);
        const dom = new JSDOM(response.body);
        try {
            const criticsRatingText = dom.window.document.querySelector('rt-text[slot="criticsScore"]')?.textContent;
            const audienceRatingText = dom.window.document.querySelector('rt-text[slot="audienceScore"]')?.textContent;
            const ratings: any = {};
            if (criticsRatingText) {
                ratings.critics = Math.round(parseFloat(criticsRatingText.slice(0, -1)));
            }
            if (audienceRatingText) {
                ratings.audience = Math.round(parseFloat(audienceRatingText.slice(0, -1)));
            }
            return ratings;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    private static getLastPart(url: string) {
        const parts = url.split('/').filter(part => !!part);
        return parts.pop();
    }

    static async searchMovie(query: string): Promise<any> {
        const response = await got(`https://www.rottentomatoes.com/search?search=${query}`);
        const dom = new JSDOM(response.body);
        try {
            const links = dom.window.document.querySelectorAll('search-page-media-row>a[data-qa=info-name]');
            const results = [];
            for (const link of links) {
                results.push({
                    id: RottenTomatoes.getLastPart(link.href),
                    name: link.innerHTML.trim(),
                    link: link.href
                })
            }
            return results;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}