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
}