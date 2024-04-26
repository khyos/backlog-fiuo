import { got } from 'got';
import { JSDOM } from 'jsdom';

export class MetaCritic {
    static async getGameRating(gameId: string): Promise<number | null> {
        return MetaCritic.getRating(`https://www.metacritic.com/game/${gameId}`);
    }

    static async getMovieRating(movieId: string): Promise<number | null> {
        return MetaCritic.getRating(`https://www.metacritic.com/movie/${movieId}`);
    }

    static async getRating(url: string): Promise<number | null> {
        const response = await got(url);
        const dom = new JSDOM(response.body);
        try {
            const ratingSpan = dom.window.document.querySelector('.c-productScoreInfo_scoreNumber .c-siteReviewScore_medium span');
            const ratingText = ratingSpan?.textContent
            if (!ratingText) {
                return null;
            }
            let rating = Math.round(parseFloat(ratingText));
            if (rating <= 10) { // Most likely user score
                return null;
            }
            return rating;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}
