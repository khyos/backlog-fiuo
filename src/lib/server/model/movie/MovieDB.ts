import { ArtifactType } from "$lib/model/Artifact";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Movie } from "$lib/model/movie/Movie";
import { db, execQuery } from "$lib/server/database";
import { ArtifactDB } from "../ArtifactDB";
import { BacklogItemDB } from "../BacklogItemDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class MovieDB {
    static async getById(id: number): Promise<Movie | null> {
        return await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM artifact WHERE id = ?`, [id], async (error, row: any) => {
                if (error) {
                    reject(error);
                } else if (!row) {
                    resolve(null);
                } else {
                    const releaseDate = row.releaseDate ? new Date(parseInt(row.releaseDate, 10)) : null;
                    const movie = new Movie(row.id, row.title, row.type, releaseDate, row.duration);
                    movie.genres = await MovieDB.getGenres(id);
                    movie.ratings = await RatingDB.getRatings(id);
                    movie.links = await LinkDB.getLinks(id);
                    resolve(movie);
                }
            });
        });
    }

    static async getMovies(page: number, pageSize: number, search: string = ''): Promise<Movie[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.MOVIE, page, pageSize, search).then((rows: any[]) => {
            const movies: Movie[] = rows.map((row: any) => {
                const releaseDate = row.releaseDate ? new Date(parseInt(row.releaseDate, 10)) : null;
                return new Movie(row.id, row.title, row.type, releaseDate, row.duration)
            });
            return movies;
        });
    }

    static addMovieGenre(genreId: number, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO movie_genre (id, title) VALUES (?, ?)`, [genreId, title], async function (error) {
                if (error) {
                    reject(error);
                }
            });
            resolve();
        });
    }

    static async getGenres(movieId: number): Promise<Genre[]> {
        return await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM movie_movie_genre
                    INNER JOIN movie_genre ON movie_movie_genre.genreId = movie_genre.id
                    WHERE artifactId = ?`, [movieId], async (error, rows: any[]) => {
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
            db.all(`SELECT * FROM movie_genre ORDER BY title`, async (error, rows: any[]) => {
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

    static async getBacklogItems(backlogId: number): Promise<BacklogItem[]> {
        return await new Promise(async (resolve, reject) => {
            db.all(`SELECT * FROM backlog_items
                    INNER JOIN artifact ON backlog_items.artifactId = artifact.id
                    WHERE backlogId = ?
                    ORDER BY rank`, [backlogId], async (error, rows: any[]) => {
                if (error) {
                    reject(error);
                } else {
                    const backlogItems: BacklogItem[] = await Promise.all(rows.map(async row => {
                        const releaseDate = row.releaseDate ? new Date(parseInt(row.releaseDate, 10)) : null;
                        const movie = new Movie(row.artifactId, row.title, row.type, releaseDate, row.duration);
                        movie.genres = await MovieDB.getGenres(row.artifactId);
                        movie.ratings = await RatingDB.getRatings(row.artifactId);
                        const tags = await BacklogItemDB.getTags(row.backlogId, row.artifactId);
                        return new BacklogItem(row.rank, movie, tags);
                    }));
                    resolve(backlogItems);
                }
            });
        });
    }

    static async createMovie(title: string, releaseDate: Date, duration: number = 0, genreIds: number[], links: Link[], ratings: Rating[]): Promise<Movie> {
        return await new Promise((resolve, reject) => {
            db.run(`INSERT INTO artifact (title, type, releaseDate, duration) VALUES (?, ?, ?, ?)`, [title, ArtifactType.MOVIE, releaseDate, duration], async function (error) {
                if (error) {
                    reject(error);
                } else {
                    const movieId = this.lastID;
                    for (const genreId of genreIds) {
                        db.run(`INSERT INTO movie_movie_genre (artifactId, genreId) VALUES (?, ?)`, [movieId, genreId]);
                    }
                    for (const link of links) {
                        await LinkDB.addLink(movieId, link.type, link.url);
                    }
                    for (const rating of ratings) {
                        await RatingDB.addRating(movieId, rating.type, rating.rating);
                    }
                    const movie = new Movie(movieId, title, ArtifactType.MOVIE, releaseDate, duration);
                    movie.genres = await MovieDB.getGenres(movieId);
                    movie.links = links;
                    movie.ratings = ratings;
                    resolve(movie);
                }
            });
        });
    }

    static async refreshData(movieId: number) {

    }

    static deleteMovie(id: number) {
        db.run(`DELETE FROM artifact WHERE id = ?`, [id]);
        db.run(`DELETE FROM movie_movie_genre WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM rating WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM link WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM backlog_items WHERE artifactId = ?`, [id]);
        db.run(`DELETE FROM backlog_item_tag WHERE artifactId = ?`, [id]);
    }

    static createMovieGenreTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS movie_genre (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL
        )`);
    }

    static createMovieMovieGenreTable() {
        execQuery(`CREATE TABLE IF NOT EXISTS movie_movie_genre (
            artifactId INTEGER NOT NULL,
            genreId INTEGER NOT NULL,
            PRIMARY KEY (artifactId, genreId)
        )`);
    }
}