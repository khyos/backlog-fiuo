import { IGDB_CLIENT_ID, IGDB_CLIENT_SECRET } from "$env/static/private";
import { GameDB } from "$lib/server/model/game/GameDB";
import { PlatformDB } from "$lib/server/model/game/PlatformDB";

export type IGDBSearchGameResult = {
    id: number
    name: string
    url: string
}

export type IGDBGame = {
    alertnative_names: number[]
    cover: number
    first_release_date: number
    genres: number[]
    id: number
    name: string
    platforms: number[]
    storyline: string
    summary: string
    url: string
}

export class IGDB {
    static async authenticateIGDB(): Promise<{ access_token: string }> {
        const response = await fetch("https://id.twitch.tv/oauth2/token", {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`
        });
        return await response.json();
    }

    static getHeaders(access_token: string) {
        return {
            'Accept': 'application/json',
            'Client-ID': IGDB_CLIENT_ID,
            'Authorization': `Bearer ${access_token}`
        };
    }

    static async getGame(gameId: string): Promise<IGDBGame> {
        const { access_token } = await this.authenticateIGDB();
        const response = await fetch("https://api.igdb.com/v4/games", {
            method: 'POST',
            headers: IGDB.getHeaders(access_token),
            body: `fields alternative_names,category,cover,first_release_date,genres,name,platforms,status,storyline,summary,url; where id = ${gameId};`
        });
        return (await response.json())[0];
    }

    static async searchGame(query: string): Promise<IGDBSearchGameResult[]> {
        const { access_token } = await this.authenticateIGDB();
        const response = await fetch("https://api.igdb.com/v4/games", {
            method: 'POST',
            headers: IGDB.getHeaders(access_token),
            body: `fields name,url; search "${query}";`
        });
        return (await response.json());
    }

    static async getUrlFromId(gameId: string): Promise<string> {
        const game = await this.getGame(gameId);
        return game.url;
    }

    static async getImageURL(gameId: string) {
        const { access_token } = await this.authenticateIGDB();
        const response = await fetch("https://api.igdb.com/v4/covers", {
            method: 'POST',
            headers: IGDB.getHeaders(access_token),
            body: `fields alpha_channel,animated,checksum,game,game_localization,height,image_id,url,width; where game = ${gameId};`
        });
        const url = (await response.json())[0]?.url;
        if (url) {
            const parts = url.split('/');
            const lastPart = parts[parts.length - 1];
            return `https://images.igdb.com/igdb/image/upload/t_cover_big/${lastPart}`;
        }
        return null;
    }

    static async initGenres(): Promise<void> {
        const { access_token } = await this.authenticateIGDB();
        const response = await fetch("https://api.igdb.com/v4/genres", {
            method: 'POST',
            headers: IGDB.getHeaders(access_token),
            body: `fields name; limit 500;`
        });
        const genres = await response.json();
        for (const genre of genres) {
            try {
                await GameDB.addGameGenre(genre.id, genre.name);
            } catch (e) {
                console.error(String(e));
            } 
        }
    }

    static async initPlatforms(): Promise<void> {
        const { access_token } = await this.authenticateIGDB();
        const response = await fetch("https://api.igdb.com/v4/platforms", {
            method: 'POST',
            headers: IGDB.getHeaders(access_token),
            body: `fields name; limit 500;`
        });
        const platforms = await response.json();
        for (const platform of platforms) {
            try {
                await PlatformDB.addPlatform(platform.id, platform.name);
            } catch (e) {
                console.error(String(e));
            }
        }
    }
}
