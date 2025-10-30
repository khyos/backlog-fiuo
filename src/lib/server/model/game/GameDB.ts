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
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class GameDB {
    // ========================================
    // Basic Getters
    // ========================================
    static async getById(id: number): Promise<Game | null> {
        const row = await ArtifactDB.getArtifactById(id);
        if (!row) return null;

        const releaseDate = new Date(parseInt(row.releaseDate, 10));
        const game = new Game(row.id, row.title, row.type, releaseDate, row.duration);
        
        game.platforms = await GameDB.getPlatforms(id);
        game.genres = await GameDB.getGenres(id);
        game.ratings = await RatingDB.getRatings(id);
        game.links = await LinkDB.getLinks(id);
        
        return game;
    }

    static async getGames(page: number, pageSize: number, search: string = ''): Promise<Game[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.GAME, page, pageSize, search).then((rows: IArtifactDB[]) => {
            const games: Game[] = rows.map((row: IArtifactDB) => {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                return new Game(row.id, row.title, row.type, releaseDate, row.duration);
            });
            return games;
        });
    }

    // ========================================
    // Platform Methods
    // ========================================
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

    // ========================================
    // Genre Methods
    // ========================================
    static async getGenres(gameId: number): Promise<Genre[]> {
        return await ArtifactDB.getGenres(gameId, 'game_genre', 'game_game_genre');
    }

    static async getAllGenres(): Promise<Genre[]> {
        return await ArtifactDB.getAllGenres('game_genre');
    }

    static async addGenre(gameId: number, genreId: number): Promise<void> {
        return await ArtifactDB.addGenre(gameId, genreId, 'game_game_genre');
    }

    static async updateGenres(gameId: number, genreIds: number[]): Promise<void> {
        return await ArtifactDB.updateGenres(gameId, genreIds, GameDB.getGenres, 'game_game_genre');
    }

    static async deleteGenre(gameId: number, genreId: number): Promise<void> {
        return await ArtifactDB.deleteGenre(gameId, genreId, 'game_game_genre');
    }

    static addGameGenre(genreId: number, title: string): Promise<void> {
        return ArtifactDB.addArtifactGenre(genreId, title, 'game_genre');
    }

    // ========================================
    // User-related Methods
    // ========================================
    static async getBacklogItems(backlogId: number, rankingType: BacklogRankingType, backlogOrder: BacklogOrder): Promise<BacklogItem[]> {
        return await ArtifactDB.getBacklogItems(
            backlogId,
            rankingType,
            backlogOrder,
            ArtifactType.GAME,
            async (row: Record<string, unknown>) => {
                const releaseDate = new Date(parseInt(row.releaseDate as string, 10));
                const game = new Game(row.artifactId as number, row.title as string, row.type as ArtifactType, releaseDate, row.duration as number);
                game.genres = await GameDB.getGenres(row.artifactId as number);
                game.platforms = await GameDB.getPlatforms(row.artifactId as number);
                game.ratings = await RatingDB.getRatings(row.artifactId as number);
                return game;
            }
        );
    }

    // ========================================
    // Create Operations
    // ========================================
    static async createGame(title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0, platformIds: number[], genreIds: number[], links: Link[], ratings: Rating[]): Promise<Game> {
        const gameId = await ArtifactDB.createArtifact(title, ArtifactType.GAME, '', releaseDate, duration);
        
        // Add genres
        for (const genreId of genreIds) {
            await GameDB.addGenre(gameId, genreId);
        }
        
        // Add platforms
        for (const platformId of platformIds) {
            await GameDB.addPlatform(gameId, platformId);
        }
        
        // Add links
        for (const link of links) {
            await LinkDB.addLink(gameId, link.type, link.url);
        }
        
        // Add ratings
        for (const rating of ratings) {
            await RatingDB.addRating(gameId, rating.type, rating.rating);
        }
        
        // Create and return game object
        const game = new Game(gameId, title, ArtifactType.GAME, releaseDate, duration);
        game.genres = await GameDB.getGenres(gameId);
        game.platforms = await GameDB.getPlatforms(gameId);
        game.links = links;
        game.ratings = ratings;
        return game;
    }

    // ========================================
    // Update Operations
    // ========================================
    static async updateGame(gameId: number, title: string, releaseDate: Date = new Date(7258118400000)): Promise<void> {
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET title = ?, releaseDate = ? WHERE id = ?`, 
                [title, releaseDate.getTime().toString(), gameId], function (error) {
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

    static async updatePlatforms(gameId: number, platformIds: number[]): Promise<void> {
        const existingPlatforms = await GameDB.getPlatforms(gameId);
        const existingPlatformsIds = existingPlatforms.map(platform => platform.id);

        const platformsToRemove = existingPlatformsIds.filter(id => !platformIds.includes(id));
        for (const platformId of platformsToRemove) {
            this.deletePlatform(gameId, platformId);
        }

        const platformsToAdd = platformIds.filter(id => !existingPlatformsIds.includes(id));
        for (const platformId of platformsToAdd) {
            await this.addPlatform(gameId, platformId);
        }
    }

    static async addPlatform(gameId: number, platformId: number) {
        db.run(`INSERT OR IGNORE INTO game_platform (artifactId, platformId) VALUES (?, ?)`, [gameId, platformId]);
    }

    static deletePlatform(gameId: number, platformId: number) {
        db.run(`DELETE FROM game_platform WHERE artifactId = ? AND platformId = ?`, [gameId, platformId]);
    }

    // ========================================
    // Delete Operations
    // ========================================
    static async deleteGame(id: number) {
        const game = await GameDB.getById(id);
        if (game) {
            await ArtifactDB.deleteArtifactAndChildren(game, 'game_game_genre');
            await db.run(`DELETE FROM game_platform WHERE artifactId = ?`, [id]);
        }
    }

    // ========================================
    // Table Creation Methods
    // ========================================
    static createGamePlatformTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS game_platform (
            artifactId INTEGER NOT NULL,
            platformId INTEGER NOT NULL,
            PRIMARY KEY (artifactId, platformId)
        )`);
    }

    static createGameGenreTable(): void {
        ArtifactDB.createGenreTable('game_genre');
    }

    static createGameGameGenreTable(): void {
        ArtifactDB.createGenreMapTable('game_game_genre');
    }
}