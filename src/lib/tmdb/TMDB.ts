import { TMDB_READ_ACCESS_TOKEN } from "$env/static/private";
import { MovieDB } from "$lib/server/model/movie/MovieDB";

export class TMDB {

    static getHeaders(): any {
        return {
            'Accept': 'application/json',
            'Authorization': `Bearer ${TMDB_READ_ACCESS_TOKEN}`
        };
    }

    static async getMovie(movieId: string): Promise<any> {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=en-US`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        return await response.json();
    }

    static async getReleaseDate(movieId: string, originCountry: string): Promise<Date> {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/release_dates`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const releaseDatesByCountries = (await response.json()).results;

        let frDate = null;
        let usDate = null;
        let originCountryDate = null;
        let defaultDate = null;
    
        for (const releaseDatesForCountry of releaseDatesByCountries) {
            let theatrical = null;
            let notTheatricalDate = null;
            for (const releaseDate of releaseDatesForCountry.release_dates) {
                if (releaseDate.type === 3) {
                    theatrical = releaseDate.release_date;
                } else {
                    notTheatricalDate = releaseDate.release_date;
                }
            }
            if (releaseDatesForCountry.iso_3166_1 === 'FR') {
                frDate = theatrical || notTheatricalDate;
            } else if (releaseDatesForCountry.iso_3166_1 === 'US') {
                usDate = theatrical || notTheatricalDate;
            } else if (releaseDatesForCountry.iso_3166_1.toLowerCase() === originCountry?.toLowerCase()) {
                originCountryDate = theatrical || notTheatricalDate;
            } else {
                defaultDate = theatrical || notTheatricalDate;
            }
        }
        const releaseDate = originCountryDate || frDate || usDate || defaultDate;
        return new Date(releaseDate);
    }

    static async getTitle(movieId: string, tmdbMovie: any): Promise<string> {
        if (tmdbMovie.origin_country?.[0] === 'FR' && tmdbMovie.original_title) {
            return tmdbMovie.original_title;
        }
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/translations`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const translations = (await response.json()).translations;

        let frName = null;
        let usName = null;
        let originCountryName = null;

        for (const translation of translations) {
            if (translation.iso_3166_1 === 'FR') {
                frName = translation.data.title;
            } else if (translation.iso_3166_1 === 'US') {
                usName = translation.data.title;
            } else if (translation.iso_3166_1.toLowerCase() === tmdbMovie.origin_country?.[0].toLowerCase()) {
                originCountryName = translation.data.title;
            }
        }
        return frName || usName || originCountryName;
    }

    static async getImageURL(movieId: string) {
        const movie = await TMDB.getMovie(movieId);
        if (movie?.poster_path) {
            return `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${movie?.poster_path}`;
        }
    }

    static async initGenres(): Promise<any> {
        const response = await fetch("https://api.themoviedb.org/3/genre/movie/list?language=en", {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const jsonResponse = await response.json();
        for (const genre of jsonResponse.genres) {
            try {
                await MovieDB.addMovieGenre(genre.id, genre.name);
            } catch (e: any) {
                console.error(e.message);
            }   
        }
    }
}
