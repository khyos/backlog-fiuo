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
            const rating = Math.round(parseFloat(ratingText));
            if (rating <= 10) { // Most likely user score
                return null;
            }
            return rating;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    private static getLastPart(url: string) {
        const parts = url.split('/').filter(part => !!part);
        return parts.pop();
    }

    static async searchGame(query: string) {
        return await MetaCritic.searchArtifact(query, 13);
    }

    static async searchMovie(query: string) {
        return await MetaCritic.searchArtifact(query, 2);
    }

    static async searchArtifact(query: string, category: number) {
        const response = await got(`https://www.metacritic.com/search/${query}/?category=${category}`);
        const dom = new JSDOM(response.body);
        try {
            const results = [];
            const links =  dom.window.document.querySelectorAll('.c-pageSiteSearch-results .g-grid-container>a');
            for (const link of links) {
                const nameContainer = link?.querySelector('div:nth-child(2)>p');
                const name = nameContainer?.innerHTML.trim();
                results.push({
                    id: MetaCritic.getLastPart(link.href),
                    name: name,
                    link: `https://www.metacritic.com${link.href}`
                });
            }
            return results;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}
