import { ArtifactType, type IArtifactDB } from "$lib/model/Artifact";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Tvshow } from "$lib/model/tvshow/Tvshow";
import { TvshowEpisode } from "$lib/model/tvshow/TvshowEpisode";
import { TvshowSeason } from "$lib/model/tvshow/TvshowSeason";
import { db, execQuery } from "$lib/server/database";
import { ArtifactDB } from "../ArtifactDB";
import { BacklogItemDB } from "../BacklogItemDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class TvshowDB {
    static async getById(id: number, fetchSeasons: boolean = false, fetchEpisodes: boolean = false): Promise<Tvshow | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM artifact WHERE id = ?`, [id], async (error, row: IArtifactDB) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const releaseDate = new Date(parseInt(row.releaseDate, 10));
                    const tvshow = new Tvshow(row.id, row.title, row.type, releaseDate, row.duration);
                    tvshow.genres = await TvshowDB.getGenres(id);
                    tvshow.ratings = await RatingDB.getRatings(id);
                    tvshow.links = await LinkDB.getLinks(id);
                    if (fetchSeasons) {
                        await this.fetchSeasons([tvshow], fetchEpisodes);
                    }
                    resolve(tvshow);
                }
            });
        });
    }

    static async fetchSeasons(tvshows: Tvshow[], fetchEpisodes: boolean = false): Promise<void> {
        return await new Promise((resolve, reject) => {
            const questionMarks = new Array(tvshows.length).fill('?').join(',');
            const tvshowIds = tvshows.map(tvshow => tvshow.id);
            const tvshowsMap = new Map<number, TvshowSeason>(
                tvshows.map(tvshow => [tvshow.id, tvshow])
            );
            db.all(`SELECT * FROM artifact WHERE parent_artifact_id IN (${questionMarks}) ORDER BY child_index`, tvshowIds, async (error, rows: IArtifactDB[]) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve();
                } else {
                    const seasons = [];
                    for (const row of rows) {
                        const releaseDate = new Date(parseInt(row.releaseDate, 10));
                        const tvshowSeason = new TvshowSeason(row.id, row.child_index, row.title, row.type, releaseDate, row.duration);
                        seasons.push(tvshowSeason);
                        if (row.parent_artifact_id) {
                            tvshowsMap.get(row.parent_artifact_id)?.children.push(tvshowSeason);
                        }
                    }
                    if (seasons.length > 0 && fetchEpisodes) {
                        await this.fetchEpisodes(seasons)
                    }
                    resolve();
                }
            });
        });
    }

    static async fetchEpisodes(seasons: TvshowSeason[]): Promise<void> {
        return await new Promise((resolve, reject) => {
            const questionMarks = new Array(seasons.length).fill('?').join(',');
            const seasonIds = seasons.map(season => season.id);
            const seasonsMap = new Map<number, TvshowSeason>(
                seasons.map(season => [season.id, season])
            );
            db.all(`SELECT * FROM artifact WHERE parent_artifact_id IN (${questionMarks}) ORDER BY child_index`, seasonIds, async (error, rows: IArtifactDB[]) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve();
                } else {
                    for (const row of rows) {
                        const releaseDate = new Date(parseInt(row.releaseDate, 10));
                        const tvshowSeason = new TvshowEpisode(row.id, row.child_index, row.title, row.type, releaseDate, row.duration);
                        if (row.parent_artifact_id) {
                            seasonsMap.get(row.parent_artifact_id)?.children.push(tvshowSeason);
                        }
                    }
                    resolve()
                }
            });
        });
    }

    static async getTvshows(page: number, pageSize: number, search: string = ''): Promise<Tvshow[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.TVSHOW, page, pageSize, search).then((rows: IArtifactDB[]) => {
            const tvshows: Tvshow[] = rows.map((row: IArtifactDB) => {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                return new Tvshow(row.id, row.title, row.type, releaseDate, row.duration)
            });
            return tvshows;
        });
    }

    static addTvshowGenre(genreId: number, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO tvshow_genre (id, title) VALUES (?, ?)`, [genreId, title], async function (error) {
                if (error) {
                    reject(error);
                }
            });
            resolve();
        });
    }

    static async getGenres(tvshowId: number): Promise<Genre[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM tvshow_tvshow_genre
                    INNER JOIN tvshow_genre ON tvshow_tvshow_genre.genreId = tvshow_genre.id
                    WHERE artifactId = ?`, [tvshowId], async (error, rows: any[]) => {
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
            db.all(`SELECT * FROM tvshow_genre ORDER BY title`, async (error, rows: any[]) => {
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
                        const tvshow = new Tvshow(row.artifactId, row.title, row.type, releaseDate, row.duration);
                        tvshow.genres = await TvshowDB.getGenres(row.artifactId);
                        tvshow.ratings = await RatingDB.getRatings(row.artifactId);
                        const tags = await BacklogItemDB.getTags(row.backlogId, ArtifactType.TVSHOW, row.artifactId);
                        return new BacklogItem(row.rank, row.elo, row.dateAdded, tvshow, tags);
                    }));
                    resolve(backlogItems);
                }
            });
        });
    }

    static async createTvshow(title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0, genreIds: number[], links: Link[], ratings: Rating[]): Promise<Tvshow> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO artifact (title, type, releaseDate, duration) VALUES (?, ?, ?, ?)`, [title, ArtifactType.TVSHOW, releaseDate, duration], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const tvshowId = this.lastID;
                    for (const genreId of genreIds) {
                        TvshowDB.addGenre(tvshowId, genreId);
                    }
                    for (const link of links) {
                        await LinkDB.addLink(tvshowId, link.type, link.url);
                    }
                    for (const rating of ratings) {
                        await RatingDB.addRating(tvshowId, rating.type, rating.rating);
                    }
                    const tvshow = new Tvshow(tvshowId, title, ArtifactType.TVSHOW, releaseDate, duration);
                    tvshow.genres = await TvshowDB.getGenres(tvshowId);
                    tvshow.links = links;
                    tvshow.ratings = ratings;
                    resolve(tvshow);
                }
            });
        });
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

    static async updateTvshow(id: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0) {
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET title = ?, releaseDate = ?, duration = ? WHERE id = ?`, [title, releaseDate, duration, id], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve(null);
                }
            });
        });
    }

    static async updateTvshowSeason(tvshowSeasonId: number, seasonNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0) {
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET child_index = ?, title = ?, releaseDate = ?, duration = ? WHERE id = ?`, [seasonNumber, title, releaseDate, duration, tvshowSeasonId], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve(null);
                }
            });
        });
    }

    static async updateTvshowEpisode(tvshowEpisodeId: number, episodeNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0) {
        return await new Promise((resolve, reject) => {
            db.run(`UPDATE artifact SET child_index = ?, title = ?, releaseDate = ?, duration = ? WHERE id = ?`, [episodeNumber, title, releaseDate, duration, tvshowEpisodeId], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    resolve(null);
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

    static addGenre(tvshowId: number, genreId: number) {
        db.run(`INSERT INTO tvshow_tvshow_genre (artifactId, genreId) VALUES (?, ?)`, [tvshowId, genreId]);
    }

    static deleteGenre(tvshowId: number, genreId: number) {
        db.run(`DELETE FROM tvshow_tvshow_genre WHERE artifactId = ? AND genreId = ?`, [tvshowId, genreId]);
    }

    static async deleteTvshow(id: number) {
        const tvshow = await this.getById(id, true, true);
        if (tvshow) {
            const artifactIdsToDelete = [id];
            for (const season of tvshow.children) {
                artifactIdsToDelete.push(season.id);
                for (const episode of season.children) {
                    artifactIdsToDelete.push(episode.id);
                }
            }
            const questionMarks = new Array(artifactIdsToDelete.length).fill('?').join(',');
            db.run(`DELETE FROM artifact WHERE id IN (${questionMarks})`, artifactIdsToDelete);
            db.run(`DELETE FROM tvshow_tvshow_genre WHERE artifactId = ?`, [id]);
            db.run(`DELETE FROM rating WHERE artifactId = ?`, [id]);
            db.run(`DELETE FROM link WHERE artifactId = ?`, [id]);
            db.run(`DELETE FROM backlog_items WHERE artifactId = ?`, [id]);
            db.run(`DELETE FROM backlog_item_tag WHERE artifactId = ?`, [id]);
        }
    }

    static async getUserOngoingTvShows(userId: number, fetchOnhold: boolean = false): Promise<Tvshow[]> {
        const statusCondition = fetchOnhold
            ? `AND (user_artifact.status = 'ongoing' OR user_artifact.status = 'onhold')`
            : `AND user_artifact.status = 'ongoing'`;
        const onGoingTvshows = `
            SELECT 
                *
            FROM 
                artifact
            JOIN 
                user_artifact ON artifact.id = user_artifact.artifactId
            WHERE 
                artifact.type = 'tvshow'
                AND user_artifact.userId = ?
                ${statusCondition}
        `;

        return await new Promise((resolve, reject) => {
            db.all(onGoingTvshows, [userId], async (error, rows: any) => {
                if (error) {
                    reject(error);
                } else if (!rows) {
                    resolve([]);
                } else {
                    const tvShows: Tvshow[] = rows.map((row) => {
                        const releaseDate = new Date(parseInt(row.releaseDate, 10));
                        return new Tvshow(row.id, row.title, row.type, releaseDate, row.duration)
                    });
                    await this.fetchSeasons(tvShows, true);
                    resolve(tvShows);
                }
            });
        });
    }

    static createTvshowGenreTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS tvshow_genre (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL
        )`);
    }

    static createTvshowTvshowGenreTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS tvshow_tvshow_genre (
            artifactId INTEGER NOT NULL,
            genreId INTEGER NOT NULL,
            PRIMARY KEY (artifactId, genreId)
        )`);
    }
}