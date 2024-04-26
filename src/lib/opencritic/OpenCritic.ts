import { OPEN_CRITIC_RAPID_API_KEY } from "$env/static/private";

export class OpenCritic {
    static async getGame(gameId: string): Promise<any> {
        const response = await fetch(`https://opencritic-api.p.rapidapi.com/game/${gameId}`, {
            method: 'GET',
            headers: OpenCritic.getHeaders()
        });
        return await response.json();
    }

    static getHeaders(): any {
        return {
            'X-RapidAPI-Key': OPEN_CRITIC_RAPID_API_KEY,
            'X-RapidAPI-Host': 'opencritic-api.p.rapidapi.com'
        };
    }
}
