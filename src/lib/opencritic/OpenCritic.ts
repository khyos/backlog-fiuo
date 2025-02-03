import { OPEN_CRITIC_RAPID_API_KEY } from "$env/static/private";

export class OpenCritic {
    static async getGame(gameId: string): Promise<any> {
        const response = await fetch(`https://opencritic-api.p.rapidapi.com/game/${gameId}`, {
            method: 'GET',
            headers: OpenCritic.getHeaders()
        });
        return await response.json();
    }

    static async searchGame(query: string): Promise<any> {
        const response = await fetch(`https://opencritic-api.p.rapidapi.com/game/search/?criteria=${query}`, {
            method: 'GET',
            headers: OpenCritic.getHeaders()
        });
        const results = [];
        const responses = await response.json();
        for (let i = 0; i < responses.length && i < 5; i++) {
            const response = responses[i];
            const game = await OpenCritic.getGame(response.id);
            results.push({
                id: response.id,
                name: response.name,
                link: game.url
            })
        }
        return results;
    }

    static getHeaders(): any {
        return {
            'X-RapidAPI-Key': OPEN_CRITIC_RAPID_API_KEY,
            'X-RapidAPI-Host': 'opencritic-api.p.rapidapi.com'
        };
    }
}
