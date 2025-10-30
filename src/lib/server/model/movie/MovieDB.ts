import { ArtifactType, type IArtifactDB } from "$lib/model/Artifact";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Movie } from "$lib/model/movie/Movie";
import { ArtifactDB } from "../ArtifactDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class MovieDB {
    // ========================================
    // Basic Getters
    // ========================================
    static async getById(id: number): Promise<Movie | null> {
        const row = await ArtifactDB.getArtifactById(id);
        if (!row) return null;

        const releaseDate = new Date(parseInt(row.releaseDate, 10));
        const movie = new Movie(row.id, row.title, row.type, releaseDate, row.duration);
        
        movie.genres = await MovieDB.getGenres(id);
        movie.ratings = await RatingDB.getRatings(id);
        movie.links = await LinkDB.getLinks(id);
        
        return movie;
    }

    static async getMovies(page: number, pageSize: number, search: string = ''): Promise<Movie[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.MOVIE, page, pageSize, search).then((rows: IArtifactDB[]) => {
            const movies: Movie[] = rows.map((row: IArtifactDB) => {
                const releaseDate = new Date(parseInt(row.releaseDate, 10));
                return new Movie(row.id, row.title, row.type, releaseDate, row.duration);
            });
            return movies;
        });
    }

    // ========================================
    // Genre Methods
    // ========================================
    static async getGenres(movieId: number): Promise<Genre[]> {
        return await ArtifactDB.getGenres(movieId, 'movie_genre', 'movie_movie_genre');
    }

    static async getAllGenres(): Promise<Genre[]> {
        return await ArtifactDB.getAllGenres('movie_genre');
    }

    static async addGenre(movieId: number, genreId: number): Promise<void> {
        return await ArtifactDB.addGenre(movieId, genreId, 'movie_movie_genre');
    }

    static async updateGenres(movieId: number, genreIds: number[]): Promise<void> {
        return await ArtifactDB.updateGenres(movieId, genreIds, MovieDB.getGenres, 'movie_movie_genre');
    }

    static async deleteGenre(movieId: number, genreId: number): Promise<void> {
        return await ArtifactDB.deleteGenre(movieId, genreId, 'movie_movie_genre');
    }

    static addMovieGenre(genreId: number, title: string): Promise<void> {
        return ArtifactDB.addArtifactGenre(genreId, title, 'movie_genre');
    }

    // ========================================
    // User-related Methods
    // ========================================
    static async getBacklogItems(backlogId: number, rankingType: BacklogRankingType, backlogOrder: BacklogOrder): Promise<BacklogItem[]> {
        return await ArtifactDB.getBacklogItems(
            backlogId,
            rankingType,
            backlogOrder,
            ArtifactType.MOVIE,
            async (row: Record<string, unknown>) => {
                const releaseDate = new Date(parseInt(row.releaseDate as string, 10));
                const movie = new Movie(row.artifactId as number, row.title as string, row.type as ArtifactType, releaseDate, row.duration as number);
                movie.genres = await MovieDB.getGenres(row.artifactId as number);
                movie.ratings = await RatingDB.getRatings(row.artifactId as number);
                return movie;
            }
        );
    }

    // ========================================
    // Create Operations
    // ========================================
    static async createMovie(title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0, genreIds: number[], links: Link[], ratings: Rating[]): Promise<Movie> {
        const movieId = await ArtifactDB.createArtifact(title, ArtifactType.MOVIE, '', releaseDate, duration);
        
        // Add genres
        for (const genreId of genreIds) {
            await MovieDB.addGenre(movieId, genreId);
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
        movie.genres = await MovieDB.getGenres(movieId);
        movie.links = links;
        movie.ratings = ratings;
        return movie;
    }

    // ========================================
    // Update Operations
    // ========================================
    static async updateMovie(id: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifact(id, title, releaseDate, duration);
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
    static createMovieGenreTable(): void {
        ArtifactDB.createGenreTable('movie_genre');
    }

    static createMovieMovieGenreTable(): void {
        ArtifactDB.createGenreMapTable('movie_movie_genre');
    }
}