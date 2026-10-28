interface SteamReviewsApiResponse {
    response?: {
        query_summary?: {
            total_positive?: number;
            total_reviews?: number;
        };
    };
}

export class Steam {
    static async getGameRating(gameId: string): Promise<number | null> {
        const input = {
            appid: Number(gameId),
            filter: 1,
            languages: ['all'],
            purchase_type: 0,
            num_per_page: 1,
            review_type: 0
        };
        const params = new URLSearchParams({ input_json: JSON.stringify(input) });
        const response = await fetch(`https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?${params}`, {
            method: 'GET'
        });
        if (!response.ok) {
            throw new Error(`Steam reviews API request failed: ${response.status} ${response.statusText}`);
        }

        const jsonResponse: SteamReviewsApiResponse = await response.json();
        const querySummary = jsonResponse.response?.query_summary;
        if (
            !querySummary ||
            typeof querySummary.total_positive !== 'number' ||
            typeof querySummary.total_reviews !== 'number'
        ) {
            throw new Error('Steam reviews API returned an invalid response');
        }
        if (querySummary.total_reviews === 0) {
            return null;
        }
        return Math.round((querySummary.total_positive / querySummary.total_reviews) * 100);
    }

    static async searchGame(query: string) {
        const response = await fetch(`https://steamcommunity.com/actions/SearchApps/${query}`, {
            method: 'GET'
        });
        const jsonResponse = await response.json();
        const results = [];
        for (const response of jsonResponse) {
            results.push({
                id: response.appid,
                name: response.name,
                link: `https://store.steampowered.com/app/${response.appid}`
            })
        }
        return results;
    }
}
