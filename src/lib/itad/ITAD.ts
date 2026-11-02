import { ITA_APP_ID } from "$app/env/private";
import type { SearchResult } from "#lib/types/SearchResult";

export type ITAD_Price = {
    id: string,
    historyLow: {
        all?: {
            amount: number
        }
    }
    deals: {
        price: {
            amount: number
        }
    }[]
}

export type ITAD_Subscription = {
    id: string,
    subs: {
        id: number,
        name: string,
        leaving: string | null
    }[]
}

export class ITAD {
    // The prices and subs endpoints reject requests with more than 200 game IDs (HTTP 400).
    private static readonly MAX_IDS_PER_REQUEST = 200;

    private static chunk<T>(items: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }
        return chunks;
    }

    static async getPrices(gameIds: string[]): Promise<ITAD_Price[]> {
        const batches = ITAD.chunk(gameIds, ITAD.MAX_IDS_PER_REQUEST).map(async batch => {
            const response = await fetch(`https://api.isthereanydeal.com/games/prices/v3?key=${ITA_APP_ID}&country=FR&shops=6,16,28,35,36,37,52,61,62,`, {
                method: 'POST',
                body: JSON.stringify(batch)
            });
            if (!response.ok) return [] as ITAD_Price[];
            return (await response.json()) as ITAD_Price[];
        });
        return (await Promise.all(batches)).flat();
    }

    static async getSubscriptions(gameIds: string[]): Promise<ITAD_Subscription[]> {
        const batches = ITAD.chunk(gameIds, ITAD.MAX_IDS_PER_REQUEST).map(async batch => {
            const response = await fetch(`https://api.isthereanydeal.com/games/subs/v1?key=${ITA_APP_ID}&country=US`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch)
            });
            if (!response.ok) return [] as ITAD_Subscription[];
            return (await response.json()) as ITAD_Subscription[];
        });
        return (await Promise.all(batches)).flat();
    }

    static async getIdFromSlug(slug: string): Promise<string> {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(slug)) {
            return slug;
        }
        const response = await fetch(`https://api.isthereanydeal.com/lookup/id/title/v1?key=${ITA_APP_ID}`, {
            method: 'POST',
            body: JSON.stringify([slug])
        });
        return (await response.json())[slug];
    }

    static async getSlugFromId(id: string): Promise<string> {
        const response = await fetch(`https://api.isthereanydeal.com/games/info/v2?key=${ITA_APP_ID}&id=${id}`, {
            method: 'GET'
        });
        return (await response.json()).slug;
    }

    static async searchGame(query: string): Promise<SearchResult[]> {
        const response = await fetch(`https://api.isthereanydeal.com/games/search/v1?key=${ITA_APP_ID}&title=${query}`, {
            method: 'GET'
        });

        const results = [];
        const responses = await response.json();
        for (let i = 0; i < responses.length && i < 5; i++) {
            const response = responses[i];
            results.push({
                id: response.slug,
                name: response.title,
                link: `https://isthereanydeal.com/game/${response.slug}/info`
            });
        }
        return results;
    }
}
