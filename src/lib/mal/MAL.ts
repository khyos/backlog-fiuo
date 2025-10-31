import { AnimeDB } from "$lib/server/model/anime/AnimeDB";
import { ErrorUtil } from "$lib/util/ErrorUtil";

export interface MALAnime {
    mal_id: number;
    title: string;
    synopsis?: string;
    aired: {
        from?: string;
        to?: string;
    };
    duration?: string;
    score?: number;
    images?: {
        jpg?: {
            image_url?: string;
            large_image_url?: string;
        }
    };
    episodes: number;
    genres?: {
        mal_id: number;
        name: string;
    }[];
}

export interface MALAnimeEpisode {
    mal_id: number;
    title: string;
    aired?: string;
}

export class MAL {
    private static readonly JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

    // Since MAL API requires OAuth, we'll use Jikan API (unofficial MAL API) for public access
    static async searchAnime(query: string): Promise<{
        id: number;
        name: string;
        link: string;
        date?: string;
        poster?: string;
    }[]> {
        try {
            const response = await fetch(`${this.JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=25`);
            if (!response.ok) {
                throw new Error(`MAL search failed: ${response.status}`);
            }
            const data = await response.json();
            return data.data.map((anime: {
                mal_id: number;
                title: string;
                url: string;
                aired?: { from?: string, to?: string }
                images?: { jpg?: { image_url: string } }
            }) => ({
                id: anime.mal_id,
                name: anime.title,
                link: anime.url,
                date: anime.aired?.from,
                poster: anime.images?.jpg?.image_url
            }));
        } catch (error) {
            console.error('MAL search error:', error);
            return [];
        }
    }

    static async getAnime(animeId: string): Promise<MALAnime | null> {
        try {
            const response = await fetch(`${this.JIKAN_BASE_URL}/anime/${animeId}/full`);
            if (!response.ok) {
                throw new Error(`MAL get anime failed: ${response.status}`);
            }
            const result = await response.json();
            const anime = result.data;
            const score = Math.round(anime.score * 10);

            return {
                mal_id: anime.mal_id,
                title: anime.title,
                synopsis: anime.synopsis,
                episodes: anime.episodes,
                aired: anime.aired,
                duration: anime.duration,
                score: score,
                genres: anime.genres,
                images: anime.images
            };
        } catch (error) {
            console.error('MAL get anime error:', error);
            return null;
        }
    }

    static async getAnimeEpisodes(animeId: string): Promise<MALAnimeEpisode[]> {
        let hasNextPage = true;
        let page = 1;
        let episodes: MALAnimeEpisode[] = [];
        do {
            const pageData = await this.getAnimeEpisodesPage(animeId, page);
            if (pageData && pageData.episodes.length > 0) {
                episodes = episodes.concat(pageData.episodes);
                page++;
                hasNextPage = pageData.has_next_page;
            } else {
                hasNextPage = false;
            }
        } while (hasNextPage);
        return episodes;
    }

    // TODO: Handle rate limiting
    static async getAnimeEpisodesPage(animeId: string, page: number): Promise<{ episodes: MALAnimeEpisode[], has_next_page: boolean } | null> {
        try {
            const response = await fetch(`${this.JIKAN_BASE_URL}/anime/${animeId}/episodes?page=${page}`);
            if (!response.ok) {
                throw new Error(`MAL get anime episodes failed: ${response.status}`);
            }
            const result = await response.json();
            const pagination = result.pagination;
            const episodes = result.data;

            return {
                episodes: episodes,
                has_next_page: pagination.has_next_page
            };
        } catch (error) {
            console.error('MAL get anime episodes error:', error);
            return null;
        }
    }

    static async getUrlFromId(animeId: string): Promise<string> {
        return `https://myanimelist.net/anime/${animeId}`;
    }

    static async getImageURL(animeId: string): Promise<string | null> {
        try {
            const anime = await this.getAnime(animeId);
            return anime?.images?.jpg?.large_image_url || anime?.images?.jpg?.image_url || null;
        } catch (error) {
            console.error('MAL get image error:', error);
            return null;
        }
    }

    static async initGenres(): Promise<void> {
        try {
            const response = await fetch(`${this.JIKAN_BASE_URL}/genres/anime`);
            if (!response.ok) {
                throw new Error(`MAL genres failed: ${response.status}`);
            }
            const genres = await response.json();

            for (const genre of genres.data) {
                try {
                    await AnimeDB.addGenreDefinition(genre.mal_id, genre.name);
                } catch (error) {
                    console.error(ErrorUtil.getErrorMessage(error));
                }
            }
        } catch (error) {
            console.error(ErrorUtil.getErrorMessage(error));
        }
    }

    static parseDuration(durationString: string): number {
        // Parse duration strings like "24 min per ep", "2 hr 3 min", etc.
        if (!durationString) return 0;

        const hourMatch = durationString.match(/(\d+)\s*hr/);
        const minMatch = durationString.match(/(\d+)\s*min/);

        let totalMinutes = 0;
        if (hourMatch) {
            totalMinutes += parseInt(hourMatch[1]) * 60;
        }
        if (minMatch) {
            totalMinutes += parseInt(minMatch[1]);
        }

        return totalMinutes;
    }

    static parsePerEpisodeDuration(durationString?: string | null): number | null {
        if (!durationString) return null;
        // Parse duration strings like "24 min per ep"
        const match = durationString.match(/(\d+)\s*min\s*per\s*ep/);
        if (match) {
            return parseInt(match[1]);
        }
        return null;
    }

    static parseAiredDate(aired: {
        from?: string;
        to?: string;
    }): Date {
        if (aired?.from) {
            return new Date(aired.from);
        }
        return new Date();
    }
}