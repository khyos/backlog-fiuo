import { TMDB_READ_ACCESS_TOKEN } from "$env/static/private";
import { MovieDB } from "$lib/server/model/movie/MovieDB";
import { TvshowDB } from "$lib/server/model/tvshow/TvshowDB";
import { TextUtil } from "$lib/util/TextUtil";


class ReleaseDates {
    theatricalNoNote?: string
    theatricalWithNote?: string
    digital?: string
    fallbackDate?: string

    getMostRelevant() {
        return this.theatricalNoNote || this.digital || this.fallbackDate || this.theatricalWithNote;
    }
}

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

    static async searchMovie(query: string): Promise<any> {
        const response = await fetch(`https://api.themoviedb.org/3/search/movie?query=${query}`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const responses = await response.json();
        const results = [];
        for (const resp of responses.results) {
            results.push({
                id: resp.id,
                name: resp.title,
                link: `https://www.themoviedb.org/movie/${resp.id}`,
                date: resp.release_date
            });
        }
        return results;
    }

    static async getMovieReleaseDate(movieId: string, originCountry: string): Promise<Date | undefined> {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/release_dates`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const releaseDatesByCountries = (await response.json()).results;

        let frDates: ReleaseDates = new ReleaseDates();
        let usDates: ReleaseDates = new ReleaseDates();
        let originCountryDates: ReleaseDates = new ReleaseDates();
        let defaultDates: ReleaseDates = new ReleaseDates();
    
        for (const releaseDatesForCountry of releaseDatesByCountries) {
            const countryDates: ReleaseDates = new ReleaseDates();
            for (const releaseDate of releaseDatesForCountry.release_dates) {
                if (!countryDates.theatricalNoNote && releaseDate.type === 3 && (!releaseDate.note || releaseDate.note === '')) {
                    countryDates.theatricalNoNote = releaseDate.release_date;
                } else if (releaseDate.type === 3 || releaseDate.type === 1) {
                    countryDates.theatricalWithNote = releaseDate.release_date;
                } else if (releaseDate.type === 4) {
                    countryDates.digital = releaseDate.release_date;
                } else {
                    countryDates.fallbackDate = releaseDate.release_date;
                }
            }
            if (releaseDatesForCountry.iso_3166_1 === 'FR') {
                frDates = countryDates;
            } else if (releaseDatesForCountry.iso_3166_1 === 'US') {
                usDates = countryDates;
            } else if (releaseDatesForCountry.iso_3166_1.toLowerCase() === originCountry?.toLowerCase()) {
                originCountryDates = countryDates;
            } else {
                defaultDates = countryDates;
            }
        }
        let releaseDate = originCountryDates.theatricalNoNote || originCountryDates.fallbackDate;
        if (!releaseDate) {
            const frDate = frDates.getMostRelevant();
            const usDate = usDates.getMostRelevant();
            if (frDate && usDate) {
                if (new Date(frDate).getTime() > new Date(usDate).getTime()) {
                    releaseDate = usDate;
                } else {
                    releaseDate = frDate;
                }
            } else {
                releaseDate = frDate || usDate;
            }
        }
        if (!releaseDate) {
            releaseDate = defaultDates.getMostRelevant();
        }
        return releaseDate ? new Date(releaseDate) : undefined;
    }

    static async getMovieTitle(movieId: string, tmdbMovie: any): Promise<string> {
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

    static async getMovieImageURL(movieId: string) {
        const movie = await TMDB.getMovie(movieId);
        if (movie?.poster_path) {
            return `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${movie?.poster_path}`;
        }
        return null;
    }

    static async initMovieGenres(): Promise<any> {
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

    static async getTvshow(tvshowId: string): Promise<any> {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvshowId}?language=en-US`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        return await response.json();
    }

    static async getTvshowSeasons(tvshowId: string, seasonIndex: number): Promise<any> {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvshowId}/season/${seasonIndex}?language=en-US`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        return await response.json();
    }

    static async searchTvshow(query: string): Promise<any> {
        const response = await fetch(`https://api.themoviedb.org/3/search/tv?query=${query}`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const responses = await response.json();
        const results = [];
        for (const resp of responses.results) {
            results.push({
                id: resp.id,
                name: resp.name,
                link: `https://www.themoviedb.org/tv/${resp.id}`,
                date: resp.first_air_date
            });
        }
        return results;
    }

    static async getTvshowTitle(tvshowId: string, tmdbMovie: any): Promise<string> {
        if (tmdbMovie.origin_country?.[0] === 'FR' && tmdbMovie.original_name) {
            return tmdbMovie.original_name;
        }
        const response = await fetch(`https://api.themoviedb.org/3/tv/${tvshowId}/translations`, {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const translations = (await response.json()).translations;

        let frName = null;
        let usName = null;
        let originCountryName = null;

        for (const translation of translations) {
            if (translation.iso_3166_1 === 'FR') {
                frName = translation.data.name;
            } else if (translation.iso_3166_1 === 'US') {
                usName = translation.data.name;
            } else if (translation.iso_3166_1.toLowerCase() === tmdbMovie.origin_country?.[0].toLowerCase()) {
                if (TextUtil.areEastAsianCharactersOverThreashold(translation.data.name)) {
                    originCountryName = translation.data.name;
                }
            }
        }
        return frName || usName || originCountryName || tmdbMovie.name;
    }

    static async getTvshowImageURL(movieId: string) {
        const tvshow = await TMDB.getTvshow(movieId);
        if (tvshow?.poster_path) {
            return `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${tvshow?.poster_path}`;
        }
        return null;
    }

    static async initTvshowGenres(): Promise<any> {
        const response = await fetch("https://api.themoviedb.org/3/genre/tv/list?language=en", {
            method: 'GET',
            headers: TMDB.getHeaders()
        });
        const jsonResponse = await response.json();
        for (const genre of jsonResponse.genres) {
            try {
                await TvshowDB.addTvshowGenre(genre.id, genre.name);
            } catch (e: any) {
                console.error(e.message);
            }   
        }
    }
}
