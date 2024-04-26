import { got } from 'got';
import { JSDOM } from 'jsdom';

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
            let rating = Math.round(parseFloat(ratingText) * 10);
            return rating;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}
