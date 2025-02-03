export class Steam {
    static async getGameRating(gameId: string): Promise<number | null> {
        const response = await fetch(`https://store.steampowered.com/appreviews/${gameId}?json=1&num_per_page=0&language=all&purchase_type=steam`, {
            method: 'GET'
        });
        const jsonResponse = await response.json();
        if (jsonResponse.query_summary.total_reviews === 0) {
            return null;
        }
        return Math.round((jsonResponse.query_summary.total_positive / jsonResponse.query_summary.total_reviews) * 100);
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
