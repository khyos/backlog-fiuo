import type { SearchResult } from '$lib/types/SearchResult';
import { got } from 'got';
import { JSDOM } from 'jsdom';

export type RottenTomatoesRatings = {
    audience?: number
    critics?: number
}

export class RottenTomatoes {
    static async getMovieRatings(movieId: string): Promise<RottenTomatoesRatings> {
        return await this.getRatings(`https://www.rottentomatoes.com/m/${movieId}`);
    }

    static async getTvshowRatings(tvshowId: string): Promise<RottenTomatoesRatings> {
        return await this.getRatings(`https://www.rottentomatoes.com/tv/${tvshowId}`);
    }

    static async getRatings(url: string): Promise<RottenTomatoesRatings> {
        const response = await got(url);
        let dom;
        try {
            dom = new JSDOM(response.body);
            const criticsRatingText = dom.window.document.querySelector('rt-text[slot="criticsScore"]')?.textContent;
            const audienceRatingText = dom.window.document.querySelector('rt-text[slot="audienceScore"]')?.textContent;
            const ratings: RottenTomatoesRatings = {};
            if (criticsRatingText) {
                ratings.critics = Math.round(parseFloat(criticsRatingText.slice(0, -1)));
            }
            if (audienceRatingText) {
                ratings.audience = Math.round(parseFloat(audienceRatingText.slice(0, -1)));
            }
            return ratings;
        } catch (e) {
            console.error(e);
            return {};
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

    static async searchMovie(query: string): Promise<SearchResult[] | null> {
        return await this.searchArtifact(query, 'movie');
    }

    static async searchTvshow(query: string): Promise<SearchResult[] | null> {
        return await this.searchArtifact(query, 'tvSeries');
    }

    static async searchArtifact(query: string, type: string): Promise<SearchResult[] | null> {
        const response = await got(`https://www.rottentomatoes.com/search?search=${query}`);
        let dom;
        try {
            dom = new JSDOM(response.body);
            const links: NodeListOf<HTMLAnchorElement> = dom.window.document.querySelectorAll(`search-page-result[type=${type}] search-page-media-row>a[data-qa=info-name]`);
            const results: SearchResult[] = [];
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
        } finally {
            if (dom?.window) {
                dom.window.close();
            }
        }
    }
}