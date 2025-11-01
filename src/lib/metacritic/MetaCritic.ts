import type { SearchResult } from '$lib/types/SearchResult';
import { got } from 'got';
import { JSDOM } from 'jsdom';

export class MetaCritic {
    static async getGameRating(gameId: string): Promise<number | null> {
        return MetaCritic.getRating(`https://www.metacritic.com/game/${gameId}`);
    }

    static async getMovieRating(movieId: string): Promise<number | null> {
        return MetaCritic.getRating(`https://www.metacritic.com/movie/${movieId}`);
    }

    static async getTvshowRating(tvshowId: string): Promise<number | null> {
        return MetaCritic.getRating(`https://www.metacritic.com/tv/${tvshowId}`);
    }

    static async getRating(url: string): Promise<number | null> {
        const response = await got(url);
        let dom;
        try {
            dom = new JSDOM(response.body)
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
        } finally {
            if (dom?.window) {
                dom.window.close();
            }
        }
    }

    private static getLastPart(url: string) {
        const parts = url.split('/').filter(part => !!part);
        return parts.pop()!;
    }

    static async searchGame(query: string) {
        return await MetaCritic.searchArtifact(query, 13);
    }

    static async searchMovie(query: string) {
        return await MetaCritic.searchArtifact(query, 2);
    }

    static async searchTvshow(query: string) {
        return await MetaCritic.searchArtifact(query, 1);
    }

    static async searchArtifact(query: string, category: number): Promise<SearchResult[] | null> {
        const response = await got(`https://www.metacritic.com/search/${query}/?category=${category}`);
        let dom;
        try {
            dom = new JSDOM(response.body);
            const results: SearchResult[] = [];
            const cards: NodeListOf<HTMLAnchorElement> =  dom.window.document.querySelectorAll('.c-pageSiteSearch-results .g-grid-container>a');
            for (const card of cards) {
                const nameContainer = card.querySelector('div:nth-child(2)>p');
                const name = nameContainer?.innerHTML.trim();
                if (!name) {
                    throw new Error('Name not found in Metacritic search result');
                }
                const date = card?.querySelector('div:nth-child(2)>span>span')?.innerHTML.trim();
                results.push({
                    id: MetaCritic.getLastPart(card.href),
                    name: name,
                    link: `https://www.metacritic.com${card.href}`,
                    date: date
                });
            }
            return results;
        } catch (e) {
            console.error(e);
            return null;
        } finally {
            if (dom?.window) {
                dom.window.close();
            }
        }
    }
}
