import { ArtifactType, type IArtifactDB } from "$lib/model/Artifact";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Tvshow } from "$lib/model/tvshow/Tvshow";
import { TvshowEpisode } from "$lib/model/tvshow/TvshowEpisode";
import { TvshowSeason } from "$lib/model/tvshow/TvshowSeason";
import { db } from "$lib/server/database";
import { ArtifactDB } from "../ArtifactDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class TvshowDB {
    // ========================================
    // Basic Getters
    // ========================================
    static async getById(id: number, fetchSeasons: boolean = false, fetchEpisodes: boolean = false): Promise<Tvshow | null> {
        const row = await ArtifactDB.getArtifactById(id);
        if (!row) return null;

        const releaseDate = new Date(parseInt(row.releaseDate, 10));
        const tvshow = new Tvshow(row.id, row.title, row.type, releaseDate, row.duration);
        
        tvshow.genres = await TvshowDB.getAssignedGenres(id);
        tvshow.ratings = await RatingDB.getRatings(id);
        tvshow.links = await LinkDB.getLinks(id);
        
        if (fetchSeasons) {
            await TvshowDB.fetchSeasons([tvshow], fetchEpisodes);
        }
        
        return tvshow;
    }

    static async getTvshows(page: number, pageSize: number, search: string = ''): Promise<Tvshow[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.TVSHOW, page, pageSize, search).then((rows: IArtifactDB[]) => {
            const tvshows: Tvshow[] = rows.map((row: IArtifactDB) => {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                return new Tvshow(row.id, row.title, row.type, releaseDate, row.duration);
            });
            return tvshows;
        });
    }

    // ========================================
    // Children/Relationship Fetchers
    // ========================================
    static async fetchSeasons(tvshows: Tvshow[], fetchEpisodes: boolean = false): Promise<void> {
        const seasons: TvshowSeason[] = [];
        
        for (const tvshow of tvshows) {
            const seasonRows = await ArtifactDB.getChildrenByParentId(tvshow.id);
            for (const row of seasonRows) {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                const season = new TvshowSeason(row.id, row.child_index, row.title, row.type, releaseDate, row.duration);
                tvshow.children.push(season);
                seasons.push(season);
            }
        }

        if (seasons.length > 0 && fetchEpisodes) {
            await TvshowDB.fetchEpisodes(seasons);
        }
    }

    static async fetchEpisodes(seasons: TvshowSeason[]): Promise<void> {
        for (const season of seasons) {
            const episodeRows = await ArtifactDB.getChildrenByParentId(season.id);
            season.children = episodeRows.map((row: IArtifactDB) => {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                return new TvshowEpisode(row.id, row.child_index, row.title, row.type, releaseDate, row.duration);
            });
        }
    }

    // ========================================
    // Genre Methods
    // ========================================
     static async getGenreDefinitions(): Promise<Genre[]> {
        return await ArtifactDB.getGenreDefinitions('tvshow_genre');
    }

    static addGenreDefinition(genreId: number, title: string): Promise<void> {
        return ArtifactDB.addGenreDefinition(genreId, title, 'tvshow_genre');
    }

    static async getAssignedGenres(tvshowId: number): Promise<Genre[]> {
        return await ArtifactDB.getAssignedGenres(tvshowId, 'tvshow_genre', 'tvshow_tvshow_genre');
    }

    static async assignGenre(tvshowId: number, genreId: number): Promise<void> {
        return await ArtifactDB.assignGenre(tvshowId, genreId, 'tvshow_tvshow_genre');
    }

    static async updateAssignedGenres(tvshowId: number, genreIds: number[]): Promise<void> {
        return await ArtifactDB.updateAssignedGenres(tvshowId, genreIds, TvshowDB.getAssignedGenres, 'tvshow_tvshow_genre');
    }

    static async unassignGenre(tvshowId: number, genreId: number): Promise<void> {
        return await ArtifactDB.unassignGenre(tvshowId, genreId, 'tvshow_tvshow_genre');
    }

    // ========================================
    // User-related Methods
    // ========================================
    static async getUserOngoingTvShows(userId: number, fetchOnhold: boolean = false): Promise<Tvshow[]> {
        const rows = await ArtifactDB.getUserOngoingArtifacts(userId, ArtifactType.TVSHOW, fetchOnhold);
        const tvShows: Tvshow[] = rows.map((row) => {
            const releaseDate = new Date(parseInt(row.releaseDate, 10));
            return new Tvshow(row.id, row.title, row.type, releaseDate, row.duration);
        });
        await TvshowDB.fetchSeasons(tvShows, true);
        return tvShows;
    }

    static async getBacklogItems(backlogId: number, rankingType: BacklogRankingType, backlogOrder: BacklogOrder): Promise<BacklogItem[]> {
        return await ArtifactDB.getBacklogItems(
            backlogId,
            rankingType,
            backlogOrder,
            ArtifactType.TVSHOW,
            async (row: Record<string, unknown>) => {
                const releaseDate = new Date(parseInt(row.releaseDate as string, 10));
                const tvshow = new Tvshow(row.artifactId as number, row.title as string, row.type as ArtifactType, releaseDate, row.duration as number);
                tvshow.genres = await TvshowDB.getAssignedGenres(row.artifactId as number);
                tvshow.ratings = await RatingDB.getRatings(row.artifactId as number);
                return tvshow;
            }
        );
    }

    // ========================================
    // Create Operations
    // ========================================
    static async createTvshow(title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0, genreIds: number[], links: Link[], ratings: Rating[]): Promise<Tvshow> {
        const tvshowId = await ArtifactDB.createArtifact(title, ArtifactType.TVSHOW, '', releaseDate, duration);
        
        // Add genres
        for (const genreId of genreIds) {
            await TvshowDB.assignGenre(tvshowId, genreId);
        }
        
        // Add links
        for (const link of links) {
            await LinkDB.addLink(tvshowId, link.type, link.url);
        }
        
        // Add ratings
        for (const rating of ratings) {
            await RatingDB.addRating(tvshowId, rating.type, rating.rating);
        }
        
        // Create and return tvshow object
        const tvshow = new Tvshow(tvshowId, title, ArtifactType.TVSHOW, releaseDate, duration);
        tvshow.genres = await TvshowDB.getAssignedGenres(tvshowId);
        tvshow.links = links;
        tvshow.ratings = ratings;
        return tvshow;
    }

    static async createTvshowSeason(tvshowId: number, seasonNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<Tvshow> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES (?, ?, ?, ?, ?, ?)`, [title, ArtifactType.TVSHOW_SEASON, tvshowId, seasonNumber, releaseDate, duration], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const tvshowSeasonId = this.lastID;
                    const tvshowSeason = new TvshowSeason(tvshowSeasonId, seasonNumber, title, ArtifactType.TVSHOW_SEASON, releaseDate, duration);
                    resolve(tvshowSeason);
                }
            });
        });
    }

    static async createTvshowEpisode(tvshowSeasonId: number, episodeNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<Tvshow> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES (?, ?, ?, ?, ?, ?)`, [title, ArtifactType.TVSHOW_EPISODE, tvshowSeasonId, episodeNumber, releaseDate, duration], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const tvshowSeasonId = this.lastID;
                    const tvshowSeason = new TvshowEpisode(tvshowSeasonId, episodeNumber, title, ArtifactType.TVSHOW_EPISODE, releaseDate, duration);
                    resolve(tvshowSeason);
                }
            });
        });
    }

    // ========================================
    // Update Operations
    // ========================================
    static async updateTvshow(id: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifact(id, title, releaseDate, duration);
    }

    static async updateTvshowSeason(tvshowSeasonId: number, seasonNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifactWithIndex(tvshowSeasonId, seasonNumber, title, releaseDate, duration);
    }

    static async updateTvshowEpisode(tvshowEpisodeId: number, episodeNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifactWithIndex(tvshowEpisodeId, episodeNumber, title, releaseDate, duration);
    }

    // ========================================
    // Delete Operations
    // ========================================
    static async deleteTvshow(id: number) {
        const tvshow = await TvshowDB.getById(id, true, true);
        if (tvshow) {
            await ArtifactDB.deleteArtifactAndChildren(tvshow, 'tvshow_tvshow_genre');
        }
    }

    static async deleteTvshowEpisode(id: number) {
        return await ArtifactDB.deleteChildArtifact(id);
    }

    // ========================================
    // Table Creation Methods
    // ========================================
    static createTvshowGenreTable(): void {
        ArtifactDB.createGenreTable('tvshow_genre');
    }

    static createTvshowTvshowGenreTable(): void {
        ArtifactDB.createGenreMapTable('tvshow_tvshow_genre');
    }
}