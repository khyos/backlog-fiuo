import { ITA_APP_ID } from "$env/static/private";

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

export class ITAD {
    static async getPrices(gameIds: string[]): Promise<ITAD_Price[]> {
        const response = await fetch(`https://api.isthereanydeal.com/games/prices/v3?key=${ITA_APP_ID}&country=FR&shops=6,16,28,35,36,37,52,61,62,`, {
            method: 'POST',
            body: JSON.stringify(gameIds)
        });
        return (await response.json());
    }

    static async getIdFromSlug(slug: string): Promise<string> {
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

    static async searchGame(query: string): Promise<any> {
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
