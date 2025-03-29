import { ArtifactType, type IArtifactDB } from "$lib/model/Artifact";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Game } from "$lib/model/game/Game";
import { Platform, type IPlatformDB } from "$lib/model/game/Platform";
import { db, execQuery } from "$lib/server/database";
import { ArtifactDB } from "../ArtifactDB";
import { BacklogItemDB } from "../BacklogItemDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class GameDB {
    static async getById(id: number): Promise<Game | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM artifact WHERE id = ?`, [id], async (error, row: IArtifactDB) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const releaseDate = new Date(parseInt(row.releaseDate, 10));
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
        return await ArtifactDB.getArtifacts(ArtifactType.GAME, page, pageSize, search).then((rows: IArtifactDB[]) => {
            const games: Game[] = rows.map((row: IArtifactDB) => {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                return new Game(row.id, row.title, row.type, releaseDate, row.duration)
            });
            return games;
        });
    }

    static async getPlatforms(gameId: number): Promise<Platform[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT platform.id as id, title FROM game_platform
                    INNER JOIN platform ON game_platform.platformId = platform.id
                    WHERE artifactId = ? `, [gameId], async (error, rows: IPlatformDB[]) => {
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

    static async getAllPlatforms(): Promise<Platform[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM platform ORDER BY title`, async (error, rows: IPlatformDB[]) => {
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

    static async getBacklogItems(backlogId: number, rankingType: BacklogRankingType, backlogOrder: BacklogOrder): Promise<BacklogItem[]> {
        let rank = '';
        if (rankingType === BacklogRankingType.ELO) {
            rank = ', RANK() OVER (ORDER BY elo DESC) AS rank';
        } else if (rankingType === BacklogRankingType.WISHLIST) {
            rank = ', RANK() OVER (ORDER BY releaseDate ASC) AS rank';
        }

        let sqlOrder = 'rank ASC, dateAdded ASC';
        if (backlogOrder === BacklogOrder.ELO) {
            sqlOrder = 'elo DESC, dateAdded ASC';
        } else if (backlogOrder === BacklogOrder.DATE_ADDED) {
            sqlOrder = 'dateAdded ASC';
        } else if (backlogOrder === BacklogOrder.DATE_RELEASE) {
            sqlOrder = 'releaseDate ASC';
        }
        return await new Promise((resolve, reject) => {
            db.all(`SELECT *, CAST(strftime('%s', dateAdded) AS INTEGER) AS dateAdded${rank}
                    FROM backlog_items
                    INNER JOIN artifact ON backlog_items.artifactId = artifact.id
                    WHERE backlogId = ?
                    ORDER BY ${sqlOrder}`, [backlogId], async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const backlogItems: BacklogItem[] = await Promise.all(rows.map(async row => {
                        const releaseDate = new Date(parseInt(row.releaseDate, 10));
                        const game = new Game(row.artifactId, row.title, row.type, releaseDate, row.duration);
                        game.genres = await GameDB.getGenres(row.artifactId);
                        game.platforms = await GameDB.getPlatforms(row.artifactId);
                        game.ratings = await RatingDB.getRatings(row.artifactId);
                        const tags = await BacklogItemDB.getTags(row.backlogId, ArtifactType.GAME, row.artifactId);
                        return new BacklogItem(row.rank, row.elo, row.dateAdded, game, tags);
                    }));
                    resolve(backlogItems);
                }
            });
        });
    }

    static async createGame(title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0, platformIds: number[], genreIds: number[], links: Link[], ratings: Rating[]): Promise<Game> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO artifact (title, type, releaseDate, duration) VALUES (?, ?, ?, ?)`, [title, ArtifactType.GAME, releaseDate, duration], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const gameId = this.lastID;
                    for (const genreId of genreIds) {
                        GameDB.addGenre(gameId, genreId);
                    }
                    for (const platformId of platformIds) {
                        GameDB.addPlatform(gameId, platformId);
                    }
                    for (const link of links) {
                        await LinkDB.addLink(gameId, link.type, link.url);
                    }
                    for (const rating of ratings) {
                        await RatingDB.addRating(gameId, rating.type, rating.rating);
                    }
                    const game = new Game(gameId, title, ArtifactType.GAME, releaseDate, duration);
                    game.genres = await GameDB.getGenres(gameId);
                    game.platforms = await GameDB.getPlatforms(gameId);
                    game.links = links;
                    game.ratings = ratings;
                    resolve(game);
                }
            });
        });
    }

    static async updateDate(gameId: number, releaseDate: Date = new Date(7258118400000)): Promise<void> {
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET releaseDate = ? WHERE id = ?`, [releaseDate, gameId], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
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

    static async updateGenres(gameId: number, genreIds: number[]): Promise<void> {
        const existingGenres = await this.getGenres(gameId);
        const existingGenreIds = existingGenres.map(genre => genre.id);

        const genresToRemove = existingGenreIds.filter(id => !genreIds.includes(id));
        for (const genreId of genresToRemove) {
            this.deleteGenre(gameId, genreId);
        }

        const genresToAdd = genreIds.filter(id => !existingGenreIds.includes(id));
        for (const genreId of genresToAdd) {
            this.addGenre(gameId, genreId);
        }
    }

    static addGenre(gameId: number, genreId: number) {
        db.run(`INSERT INTO game_game_genre (artifactId, genreId) VALUES (?, ?)`, [gameId, genreId]);
    }

    static deleteGenre(gameId: number, genreId: number) {
        db.run(`DELETE FROM game_game_genre WHERE artifactId = ? AND genreId = ?`, [gameId, genreId]);
    }

    static async updatePlatforms(gameId: number, platformIds: number[]): Promise<void> {
        const existingPlatforms = await GameDB.getPlatforms(gameId);
        const existingPlatformsIds = existingPlatforms.map(platform => platform.id);

        const platformsToRemove = existingPlatformsIds.filter(id => !platformIds.includes(id));
        for (const platformId of platformsToRemove) {
            this.deletePlatform(gameId, platformId);
        }

        const platformsToAdd = platformIds.filter(id => !existingPlatformsIds.includes(id));
        for (const platformId of platformsToAdd) {
            this.addPlatform(gameId, platformId);
        }
    }

    static addPlatform(gameId: number, platformId: number) {
        db.run(`INSERT INTO game_platform (artifactId, platformId) VALUES (?, ?)`, [gameId, platformId]);
    }

    static deletePlatform(gameId: number, platformId: number) {
        db.run(`DELETE FROM game_platform WHERE artifactId = ? AND platformId = ?`, [gameId, platformId]);
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