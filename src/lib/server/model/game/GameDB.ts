import { ArtifactType } from "$lib/model/Artifact";
import { BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Game } from "$lib/model/game/Game";
import { Platform } from "$lib/model/game/Platform";
import { db, execQuery } from "$lib/server/database";
import { ArtifactDB } from "../ArtifactDB";
import { BacklogItemDB } from "../BacklogItemDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class GameDB {
    static async getById(id: number): Promise<Game | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM artifact WHERE id = ?`, [id], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const releaseDate = row.releaseDate ? new Date(parseInt(row.releaseDate, 10)) : null;
                    const game = new Game(row.id, row.title, row.type, releaseDate, row.duration);
                    game.platforms = await GameDB.getPlatforms(id);
                    game.genres = await GameDB.getGenres(id);
                    game.ratings = await RatingDB.getRatings(id);
                    game.links = await LinkDB.getLinks(id);
                    resolve(game);
                }
            });
        });
    }

    static async getGames(page: number, pageSize: number, search: string = ''): Promise<Game[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.GAME, page, pageSize, search).then((rows: any[]) => {
            const games: Game[] = rows.map((row: any) => {
                const releaseDate = row.releaseDate ? new Date(parseInt(row.releaseDate, 10)) : null;
                return new Game(row.id, row.title, row.type, releaseDate, row.duration)
            });
            return games;
        });
    }

    static async getPlatforms(gameId: number): Promise<Platform[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM game_platform
                    INNER JOIN platform ON game_platform.platformId = platform.id
                    WHERE artifactId = ? `, [gameId], async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const platforms: Platform[] = [];
                    for (const row of rows) {
                        const platform = new Platform(row.platformId, row.title);
                        platforms.push(platform);
                    }
                    resolve(platforms);
                }
            });
        });
    }

    static async getAllPlatforms(): Promise<Platform[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM platform ORDER BY title`, async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const platforms: Platform[] = [];
                    for (const row of rows) {
                        const platform = new Platform(row.id, row.title);
                        platforms.push(platform);
                    }
                    resolve(platforms);
                }
            });
        });
    }

    static addGameGenre(genreId: number, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO game_genre (id, title) VALUES (?, ?)`, [genreId, title], async function (error) {
                if (error) {
                    reject(error);
                }
            });
            resolve();
        });
    }

    static async getGenres(gameId: number): Promise<Genre[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM game_game_genre
                    INNER JOIN game_genre ON game_game_genre.genreId = game_genre.id
                    WHERE artifactId = ?`, [gameId], async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const genres: Genre[] = [];
                    for (const row of rows) {
                        const genre = new Genre(row.genreId, row.title);
                        genres.push(genre);
                    }
                    resolve(genres);
                }
            });
        });
    }

    static async getAllGenres(): Promise<Genre[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM game_genre ORDER BY title`, async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const genres: Genre[] = [];
                    for (const row of rows) {
                        const genre = new Genre(row.id, row.title);
                        genres.push(genre);
                    }
                    resolve(genres);
                }
            });
        });
    }

    static async getBacklogItems(backlogId: number, rankingType: BacklogRankingType): Promise<BacklogItem[]> {
        let sqlOrder = 'rank ASC';
        if (rankingType === BacklogRankingType.ELO) {
            sqlOrder = 'elo DESC, rank ASC';
        }
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM backlog_items
                    INNER JOIN artifact ON backlog_items.artifactId = artifact.id
                    WHERE backlogId = ?
                    ORDER BY ${sqlOrder}`, [backlogId], async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const backlogItems: BacklogItem[] = await Promise.all(rows.map(async row => {
                        const releaseDate = row.releaseDate ? new Date(parseInt(row.releaseDate, 10)) : null;
                        const game = new Game(row.artifactId, row.title, row.type, releaseDate, row.duration);
                        game.platforms = await GameDB.getPlatforms(row.artifactId);
                        game.genres = await GameDB.getGenres(row.artifactId);
                        game.ratings = await RatingDB.getRatings(row.artifactId);
                        const tags = await BacklogItemDB.getTags(row.backlogId, 'game', row.artifactId);
                        return new BacklogItem(row.rank, row.elo, game, tags);
                    }));
                    resolve(backlogItems);
                }
            });
        });
    }

    static async createGame(title: string, releaseDate: Date = new Date(0), duration: number = 0, platformIds: number[], genreIds: number[], links: Link[], ratings: Rating[]): Promise<Game> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO artifact (title, type, releaseDate, duration) VALUES (?, ?, ?, ?)`, [title, ArtifactType.GAME, releaseDate, duration], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const gameId = this.lastID;
                    for (const platformId of platformIds) {
                        db.run(`INSERT INTO game_platform (artifactId, platformId) VALUES (?, ?)`, [gameId, platformId]);
                    }
                    for (const genreId of genreIds) {
                        db.run(`INSERT INTO game_game_genre (artifactId, genreId) VALUES (?, ?)`, [gameId, genreId]);
                    }
                    for (const link of links) {
                        await LinkDB.addLink(gameId, link.type, link.url);
                    }
                    for (const rating of ratings) {
                        await RatingDB.addRating(gameId, rating.type, rating.rating);
                    }
                    const game = new Game(gameId, title, ArtifactType.GAME, releaseDate, duration);
                    game.platforms = await GameDB.getPlatforms(gameId);
                    game.genres = await GameDB.getGenres(gameId);
                    game.links = links;
                    game.ratings = ratings;
                    resolve(game);
                }
            });
        });
    }

    static async updateDuration(gameId: number, duration: number): Promise<void> {
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET duration = ? WHERE id = ?`, [duration, gameId], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    static async refreshData(gameId: number) {

    }

    static deleteGame(id: number) {
        db.run(`DELETE FROM artifact WHERE id = ?`, [id]);
        db.run(`DELETE FROM game_platform WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM game_game_genre WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM rating WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM link WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM backlog_items WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM backlog_item_tag WHERE artifactId = ?`, [id]);
    }

    static createGamePlatformTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS game_platform (
            artifactId INTEGER NOT NULL,
            platformId INTEGER NOT NULL,
            PRIMARY KEY (artifactId, platformId)
        )`);
    }

    static createGameGenreTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS game_genre (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL
        )`);
    }

    static createGameGameGenreTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS game_game_genre (
            artifactId INTEGER NOT NULL,
            genreId INTEGER NOT NULL,
            PRIMARY KEY (artifactId, genreId)
        )`);
    }
}