import { ArtifactType, type IArtifactDB } from "$lib/model/Artifact";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Anime } from "$lib/model/anime/Anime";
import { AnimeEpisode } from "$lib/model/anime/AnimeEpisode";
import { db } from "$lib/server/database";
import { ArtifactDB } from "../ArtifactDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class AnimeDB {
    // ========================================
    // Basic Getters
    // ========================================
    static async getById(id: number, fetchEpisodes: boolean = false): Promise<Anime | null> {
        const row = await ArtifactDB.getArtifactById(id);
        if (!row) return null;

        const releaseDate = new Date(parseInt(row.releaseDate, 10));
        const anime = new Anime(row.id, row.title, row.type, releaseDate, row.duration);
        
        anime.genres = await AnimeDB.getGenres(id);
        anime.ratings = await RatingDB.getRatings(id);
        anime.links = await LinkDB.getLinks(id);
        
        if (fetchEpisodes) {
            await AnimeDB.fetchEpisodes([anime]);
        }
        
        return anime;
    }

    static async getAnimes(page: number, pageSize: number, search: string = ''): Promise<Anime[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.ANIME, page, pageSize, search).then((rows: IArtifactDB[]) => {
            const animes: Anime[] = rows.map((row: IArtifactDB) => {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                return new Anime(row.id, row.title, row.type, releaseDate, row.duration);
            });
            return animes;
        });
    }

    // ========================================
    // Children/Relationship Fetchers
    // ========================================
    static async fetchEpisodes(animes: Anime[]): Promise<void> {
        for (const anime of animes) {
            const episodeRows = await ArtifactDB.getChildrenByParentId(anime.id);
            anime.children = episodeRows.map((row: IArtifactDB) => {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                return new AnimeEpisode(row.id, row.child_index, row.title, row.type, releaseDate, row.duration);
            });
        }
    }

    // ========================================
    // Genre Methods
    // ========================================
    static async getGenres(animeId: number): Promise<Genre[]> {
        return await ArtifactDB.getGenres(animeId, 'anime_genre', 'anime_anime_genre');
    }

    static async getAllGenres(): Promise<Genre[]> {
        return await ArtifactDB.getAllGenres('anime_genre');
    }

    static async addGenre(animeId: number, genreId: number): Promise<void> {
        return await ArtifactDB.addGenre(animeId, genreId, 'anime_anime_genre');
    }

    static addAnimeGenre(genreId: number, title: string): Promise<void> {
        return ArtifactDB.addArtifactGenre(genreId, title, 'anime_genre');
    }

    // ========================================
    // User-related Methods
    // ========================================
    static async getUserOngoingAnimes(userId: number, fetchOnhold: boolean = false): Promise<Anime[]> {
        const rows = await ArtifactDB.getUserOngoingArtifacts(userId, ArtifactType.ANIME, fetchOnhold);
        const animes: Anime[] = rows.map((row) => {
            const releaseDate = new Date(parseInt(row.releaseDate, 10));
            return new Anime(row.id, row.title, row.type, releaseDate, row.duration);
        });
        await this.fetchEpisodes(animes);
        return animes;
    }

    static async getBacklogItems(backlogId: number, rankingType: BacklogRankingType, backlogOrder: BacklogOrder): Promise<BacklogItem[]> {
        return await ArtifactDB.getBacklogItems(
            backlogId,
            rankingType,
            backlogOrder,
            ArtifactType.ANIME,
            async (row: Record<string, unknown>) => {
                const releaseDate = new Date(parseInt(row.releaseDate as string, 10));
                const anime = new Anime(row.artifactId as number, row.title as string, row.type as ArtifactType, releaseDate, row.duration as number);
                anime.genres = await AnimeDB.getGenres(row.artifactId as number);
                anime.ratings = await RatingDB.getRatings(row.artifactId as number);
                return anime;
            }
        );
    }

    // ========================================
    // Create Operations
    // ========================================
    static async createAnime(title: string, description: string = '', releaseDate: Date = new Date(), duration: number = 0, genreIds: number[], links: Link[], ratings: Rating[]): Promise<Anime> {
        const animeId = await ArtifactDB.createArtifact(title, ArtifactType.ANIME, description, releaseDate, duration);
        
        // Add genres
        for (const genreId of genreIds) {
            await AnimeDB.addGenre(animeId, genreId);
        }
        
        // Add links
        for (const link of links) {
            await LinkDB.addLink(animeId, link.type, link.url);
        }
        
        // Add ratings
        for (const rating of ratings) {
            await RatingDB.addRating(animeId, rating.type, rating.rating);
        }
        
        // Create and return anime object
        const anime = new Anime(animeId, title, ArtifactType.ANIME, releaseDate, duration);
        anime.genres = await AnimeDB.getGenres(animeId);
        anime.links = links;
        anime.ratings = ratings;
        return anime;
    }

    static async createAnimeEpisode(animeId: number, episodeNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<AnimeEpisode> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES (?, ?, ?, ?, ?, ?)`, [title, ArtifactType.ANIME_EPISODE, animeId, episodeNumber, releaseDate, duration], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const animeEpisodeId = this.lastID;
                    const animeEpisode = new AnimeEpisode(animeEpisodeId, episodeNumber, title, ArtifactType.ANIME_EPISODE, releaseDate, duration);
                    resolve(animeEpisode);
                }
            });
        });
    }

    // ========================================
    // Update Operations
    // ========================================
    static async updateAnime(id: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifact(id, title, releaseDate, duration);
    }

    static async updateAnimeEpisode(animeEpisodeId: number, episodeNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifactWithIndex(animeEpisodeId, episodeNumber, title, releaseDate, duration);
    }

    // ========================================
    // Delete Operations
    // ========================================
    static async deleteAnime(id: number) {
        const anime = await AnimeDB.getById(id, true);
        if (anime) {
            await ArtifactDB.deleteArtifactAndChildren(anime, 'anime_anime_genre');
        }
    }

    static async deleteAnimeEpisode(id: number) {
        return await ArtifactDB.deleteChildArtifact(id);
    }

    // ========================================
    // Table Creation Methods
    // ========================================
    static createAnimeGenreTable(): void {
        ArtifactDB.createGenreTable('anime_genre');
    }

    static createAnimeAnimeGenreTable(): void {
        ArtifactDB.createGenreMapTable('anime_anime_genre');
    }
}