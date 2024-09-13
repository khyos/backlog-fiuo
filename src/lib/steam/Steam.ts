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
}
