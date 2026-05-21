import { ArtifactType, type IArtifactDB } from "$lib/model/Artifact";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Movie } from "$lib/model/movie/Movie";
import { type IMovieReleaseDate, type IMovieReleaseDateDB } from "$lib/model/movie/MovieReleaseDate";
import { ArtifactDB } from "../ArtifactDB";
import { BacklogItemDB } from "../BacklogItemDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";
import { runDbQuery, getDbRows } from "$lib/server/database";

export class MovieDB {
    // ========================================
    // Basic Getters
    // ========================================
    static async getById(id: number): Promise<Movie | null> {
        const row = await ArtifactDB.getArtifactById(id);
        if (!row) return null;

        const releaseDate = new Date(row.releaseDate);
        const movie = new Movie(row.id, row.title, row.type, releaseDate, row.duration);
        movie.status = row.status ?? null;

        movie.releaseDates = await MovieDB.getReleaseDates(id);
        movie.genres = await MovieDB.getAssignedGenres(id);
        movie.ratings = await RatingDB.getRatings(id);
        movie.links = await LinkDB.getLinks(id);
        
        return movie;
    }

    static async getMovies(page: number, pageSize: number, search: string = ''): Promise<Movie[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.MOVIE, page, pageSize, search).then((rows: IArtifactDB[]) => {
            const movies: Movie[] = rows.map((row: IArtifactDB) => {
                return MovieDB.deserialize(row);
            });
            return movies;
        });
    }

    static deserialize(artifactJSON: IArtifactDB): Movie {
        const releaseDate = new Date(artifactJSON.releaseDate);
        const movie = new Movie(artifactJSON.id, artifactJSON.title, artifactJSON.type, releaseDate, artifactJSON.duration);
        movie.status = artifactJSON.status ?? null;
        return movie;
    }

    // ========================================
    // Genre Methods
    // ========================================
    static async getGenreDefinitions(): Promise<Genre[]> {
        return await ArtifactDB.getGenreDefinitions('movie_genre');
    }

    static addGenreDefinition(genreId: number, title: string): Promise<void> {
        return ArtifactDB.addGenreDefinition(genreId, title, 'movie_genre');
    }

    static async getAssignedGenres(movieId: number): Promise<Genre[]> {
        return await ArtifactDB.getAssignedGenres(movieId, 'movie_genre', 'movie_movie_genre');
    }

    static async assignGenre(movieId: number, genreId: number): Promise<void> {
        return await ArtifactDB.assignGenre(movieId, genreId, 'movie_movie_genre');
    }

    static async updateAssignedGenres(movieId: number, genreIds: number[]): Promise<void> {
        return await ArtifactDB.updateAssignedGenres(movieId, genreIds, MovieDB.getAssignedGenres, 'movie_movie_genre');
    }

    static async unassignGenre(movieId: number, genreId: number): Promise<void> {
        return await ArtifactDB.unassignGenre(movieId, genreId, 'movie_movie_genre');
    }

    // ========================================
    // User-related Methods
    // ========================================
     static async getBacklogItems(backlogId: number, rankingType: BacklogRankingType, backlogOrder: BacklogOrder): Promise<BacklogItem[]> {
        const dbBacklockItems = await ArtifactDB.getBacklogItems(
            backlogId,
            rankingType,
            backlogOrder
        );

        const backlogItems: BacklogItem[] = await Promise.all(dbBacklockItems.map(async row => {
            const releaseDate = new Date(row.releaseDate);
            const movie = new Movie(row.artifactId, row.title, row.type, releaseDate, row.duration);
            movie.genres = await MovieDB.getAssignedGenres(row.artifactId);
            movie.ratings = await RatingDB.getRatings(row.artifactId);
            const tags = await BacklogItemDB.getTags(row.backlogId, ArtifactType.MOVIE, row.artifactId);
            return new BacklogItem(row.rank, row.elo, row.dateAdded, movie, tags);
        }));

        return backlogItems;
    }

    // ========================================
    // Create Operations
    // ========================================
    static async createMovie(title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0, genreIds: number[], links: Link[], ratings: Rating[]): Promise<Movie> {
        const movieId = await ArtifactDB.createArtifact(title, ArtifactType.MOVIE, '', releaseDate, duration);
        
        // Add genres
        for (const genreId of genreIds) {
            await MovieDB.assignGenre(movieId, genreId);
        }
        
        // Add links
        for (const link of links) {
            await LinkDB.addLink(movieId, link.type, link.url);
        }
        
        // Add ratings
        for (const rating of ratings) {
            await RatingDB.addRating(movieId, rating.type, rating.rating);
        }
        
        // Create and return movie object
        const movie = new Movie(movieId, title, ArtifactType.MOVIE, releaseDate, duration);
        movie.genres = await MovieDB.getAssignedGenres(movieId);
        movie.links = links;
        movie.ratings = ratings;
        return movie;
    }

    // ========================================
    // Update Operations
    // ========================================
    static async updateMovie(id: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0, status?: string): Promise<void> {
        if (status !== undefined) {
            await runDbQuery(`UPDATE artifact SET title = ?, releaseDate = ?, duration = ?, status = ? WHERE id = ?`,
                [title, releaseDate.getTime().toString(), duration, status, id]);
        } else {
            return await ArtifactDB.updateArtifact(id, title, releaseDate, duration);
        }
    }

    static async getReleaseDates(movieId: number): Promise<IMovieReleaseDate[]> {
        const rows = await getDbRows<IMovieReleaseDateDB>(
            `SELECT * FROM movie_release_date WHERE artifactId = ? ORDER BY releaseDate ASC`,
            [movieId]
        );
        return rows.map(row => ({
            country: row.country,
            releaseDate: row.releaseDate,
            type: row.type ?? undefined
        }));
    }

    static async updateReleaseDates(movieId: number, releaseDates: IMovieReleaseDate[]): Promise<void> {
        await runDbQuery(`DELETE FROM movie_release_date WHERE artifactId = ?`, [movieId]);
        for (const rd of releaseDates) {
            await runDbQuery(
                `INSERT INTO movie_release_date (artifactId, country, releaseDate, type) VALUES (?, ?, ?, ?)`,
                [movieId, rd.country, rd.releaseDate, rd.type ?? null]
            );
        }
    }

    // ========================================
    // Delete Operations
    // ========================================
    static async deleteMovie(id: number) {
        const movie = await MovieDB.getById(id);
        if (movie) {
            await ArtifactDB.deleteArtifactAndChildren(movie, 'movie_movie_genre');
        }
    }

    // ========================================
    // Table Creation Methods
    // ========================================
    static async createMovieGenreTable() {
        await ArtifactDB.createGenreTable('movie_genre');
    }

    static async createMovieMovieGenreTable() {
        await ArtifactDB.createGenreMapTable('movie_movie_genre');
    }

    static async createMovieReleaseDateTable() {
        await runDbQuery(`CREATE TABLE IF NOT EXISTS movie_release_date (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            artifactId INTEGER NOT NULL,
            country    TEXT NOT NULL,
            releaseDate INTEGER NOT NULL,
            type       TEXT,
            FOREIGN KEY (artifactId) REFERENCES artifact(id)
        )`);
    }
}